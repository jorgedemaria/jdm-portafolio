<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useFocusTrap } from "../composables/useFocusTrap";
import {
  menuOpen,
  menuHorizontal,
  menuBottom,
  menuHeight,
  navOverPhotos,
  navSectionTitle,
  navContentBottom,
  navTitleAction,
} from "../composables/useMenu";
import { introLeaving } from "../composables/useIntro";
import { scrollToElement } from "../composables/useSmoothScroll";
import {
  useScrambleReplay,
  useScrambleText,
  syllableRanges,
  pickSyllable,
  SYMBOL_CHARSET,
  SCRAMBLE_CHARSET_LOWER,
  SCRAMBLE_CHARSET,
} from "../composables/useScrambleText";
import { site } from "../data/site";

const route = useRoute();
const router = useRouter();

// Título de la sección actual, al lado del logo: entra y sale con letras al azar
const sectionTitle = useScrambleText(navSectionTitle, {
  stagger: 35,
  scramble: 380,
  tick: 50,
  keepUnchanged: false,
  charset: SCRAMBLE_CHARSET_LOWER,
});

// Estado compartido: el stack de Inicio también lo lee
const open = menuOpen;

/*
 * Retícula: va del borde izquierdo del texto del logo al borde derecho del botón del menú,
 * en 5 columnas (las mismas líneas del stack de Inicio).
 * - Desde 768 px el menú es una fila que ocupa toda la retícula, un enlace por columna.
 * - En móvil es una lista vertical del mismo ancho.
 */
const logoTextRef = ref(null);
const menuRef = ref(null);
const gridWidth = ref(0);
// El espacio logo → menú es igual al espacio menú → líneas del stack (en todas las pantallas)
const MENU_GAP = 24;
const menuTop = ref(null);
const logoBox = ref(null);
function measureGrid() {
  const logo = logoTextRef.value?.getBoundingClientRect();
  const button = toggleRef.value?.getBoundingClientRect();
  if (!logo || !button) return;
  logoBox.value = { left: logo.left, bottom: logo.bottom };
  gridWidth.value = button.right - logo.left;
  // El menú se posiciona respecto del botón (su contenedor empieza en el borde superior del botón)
  menuTop.value = logo.bottom + MENU_GAP - button.top;
}
const menuStyle = computed(() => {
  if (!gridWidth.value) return {};
  return {
    width: `${gridWidth.value}px`,
    ...(menuTop.value !== null ? { top: `${menuTop.value}px` } : {}),
  };
});
// El stack de Inicio usa el borde inferior del menú para bajar sus líneas
function measureMenu() {
  const box = menuRef.value?.getBoundingClientRect();
  if (!box) return;
  menuBottom.value = box.bottom;
  menuHeight.value = box.height;
}
watch([open, menuStyle], () => nextTick(measureMenu));
// Al empezar el scroll del stack de fotos y al volver arriba, el logo y el botón pasan por símbolos al azar
const SYMBOL_SCRAMBLE = { stagger: 35, scramble: 380, tick: 50, charset: SYMBOL_CHARSET };
const logo = useScrambleReplay(site.wordmark, SYMBOL_SCRAMBLE);
const toggleSymbol = useScrambleReplay("+", { ...SYMBOL_SCRAMBLE, scramble: 600 });
function playSymbols() {
  logo.play();
  if (!open.value) toggleSymbol.play();
}
// Entrada: cuando sube la persiana de la intro, el logo se arma desde vacío con letras al azar
// y el "+" se baraja con símbolos
const logoIntro = useScrambleText(
  computed(() => (introLeaving.value ? site.wordmark : " ".repeat(site.wordmark.length))),
  { stagger: 40, scramble: 420, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET },
);
watch(introLeaving, (leaving) => leaving && toggleSymbol.play());
const logoText = computed(() => (logo.playing.value ? logo.display.value : logoIntro.value));
const toggleText = toggleSymbol.display;
const toggleScrambling = toggleSymbol.playing;

// Al abrir el menú, en cada enlace se desordena una sílaba al azar (a veces también una letra suelta)
const MENU_ITEM_STAGGER = 70;
const menuEntries = [...site.nav, site.cta];
const menuItems = menuEntries.map((item) => ({
  ranges: syllableRanges(item.silabas ?? item.label),
  replay: useScrambleReplay(item.label, {
    stagger: 45,
    scramble: 420,
    tick: 50,
    charset: SCRAMBLE_CHARSET_LOWER,
  }),
}));
const menuText = computed(() => menuItems.map((item) => item.replay.display.value));
let menuTimers = [];
watch(open, (isOpen) => {
  menuTimers.forEach(clearTimeout);
  if (!isOpen) {
    ctaHover.value = false;
    return;
  }
  menuTimers = menuItems.map((item, i) =>
    setTimeout(() => item.replay.play(pickSyllable(item.ranges)), i * MENU_ITEM_STAGGER),
  );
});

// Al pasar el cursor (o enfocar con teclado) un enlace, se desordena una sílaba al azar
function scrambleMenuItem(i) {
  const item = menuItems[i];
  if (!item.replay.playing.value) item.replay.play(pickSyllable(item.ranges));
}

// Al pasar el cursor (o enfocar con teclado) "Escríbeme" se transforma en el correo
const ctaHover = ref(false);
// Clic: copia el correo y todo el texto se transforma en "copiado!" por unos segundos
const COPIED_DURATION = 1800;
const copied = ref(false);
const ctaHoverText = useScrambleText(
  computed(() => (copied.value ? "copiado!" : ctaHover.value ? site.email : site.cta.label)),
  { stagger: 30, scramble: 320, tick: 45, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER },
);
// Mientras el correo o "copiado!" están (o se están desarmando) manda este texto
const ctaText = computed(() =>
  ctaHover.value || copied.value || ctaHoverText.value !== site.cta.label
    ? ctaHoverText.value
    : menuText.value[menuText.value.length - 1],
);

let copiedTimer = 0;

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(site.email);
  } catch {
    // Respaldo para navegadores sin acceso al portapapeles
    const field = document.createElement("textarea");
    field.value = site.email;
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
  copied.value = true;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (copied.value = false), COPIED_DURATION);
}

// Sin fondo mientras se recorre una sección marcada con data-nav-overlay (p. ej. el stack de fotos)
const overPhotos = navOverPhotos;
const navRef = ref(null);
const toggleRef = ref(null);

useFocusTrap(navRef, open);

// "Proyectos" sigue activo dentro del detalle de un proyecto.
// Las secciones de Inicio (ej. contacto) solo se marcan al llegar a ellas por el menú.
function isActive(item) {
  const { path, hash } = router.resolve(item.to);
  if (path === "/") return route.path === "/" && route.hash === hash;
  return route.path.startsWith(path);
}

// Si ya se está en esa sección, el enlace no cambia la dirección: se cierra el menú y se baja igual
function goToSection(item, event) {
  const hash = item.to.hash;
  if (!hash || route.name !== item.to.name || route.hash !== hash) return;
  event.preventDefault();
  close();
  setTimeout(() => scrollToElement(hash), 450);
}

function close({ restoreFocus = false } = {}) {
  open.value = false;
  if (restoreFocus) toggleRef.value?.focus();
}

function onKeydown(event) {
  if (event.key === "Escape" && open.value) close({ restoreFocus: true });
}

// flush 'post': la página ya está en pantalla, así en la primera carga el navbar nace
// transparente sobre las fotos en vez de mostrar el fondo y desvanecerlo
watch(
  () => route.fullPath,
  () => {
    close();
    onScroll();
    // Volver a medir cuando termine la transición de página
    setTimeout(onScroll, 300);
  },
  { flush: "post" },
);

function onScroll() {
  const overlay = document.querySelector("[data-nav-overlay]");
  // Basta con que asome cualquier parte de la sección para quitar el fondo
  overPhotos.value = !!overlay && overlay.getBoundingClientRect().bottom > 0;
}

onMounted(() => {
  // Medir la retícula cuando la fuente del logo ya cargó, y de nuevo al cambiar el tamaño
  document.fonts.ready.then(measureGrid);
  window.addEventListener("resize", measureGrid);
  window.addEventListener("resize", measureMenu);
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("jdm:stack-edge", playSymbols);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", measureGrid);
  window.removeEventListener("resize", measureMenu);
  document.removeEventListener("keydown", onKeydown);
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("jdm:stack-edge", playSymbols);
});

/*
 * Título de sección: va justo debajo del logo (TITLE_GAP) y, con el menú abierto, baja
 * hasta quedar MENU_GAP px debajo del menú, con la misma curva que la persiana.
 */
const TITLE_GAP = 16;

const sectionTitleRef = ref(null);
const titleHeight = ref(0);
const titleTop = computed(() => {
  if (!logoBox.value) return 0;
  return open.value && menuBottom.value
    ? menuBottom.value + MENU_GAP
    : logoBox.value.bottom + TITLE_GAP;
});
const titleStyle = computed(() => {
  const nav = navRef.value?.getBoundingClientRect();
  if (!logoBox.value || !nav) return {};
  return { left: `${logoBox.value.left - nav.left}px`, top: `${titleTop.value - nav.top}px` };
});
watch(sectionTitle, () =>
  nextTick(() => (titleHeight.value = sectionTitleRef.value?.offsetHeight ?? 0)),
);
// Lo más bajo del navbar (para que las secciones fijas no queden debajo)
watch(
  [navSectionTitle, open, menuBottom, titleTop, titleHeight, logoBox],
  () => {
    const titleShown = navSectionTitle.value && menuHorizontal.value;
    if (titleShown) navContentBottom.value = titleTop.value + titleHeight.value;
    else if (open.value) navContentBottom.value = menuBottom.value;
    else navContentBottom.value = logoBox.value?.bottom ?? 0;
  },
  { immediate: true },
);
</script>

<template>
  <!-- Navbar siempre transparente, en todas las páginas -->
  <header class="fixed inset-x-0 top-0 z-50 p-2">
    <!-- Clic fuera del menú lo cierra -->
    <div
      v-if="open"
      class="fixed inset-0"
      aria-hidden="true"
      @click="close()"
    />

    <div ref="navRef" class="relative mx-auto max-w-360">
      <!-- Logo a la izquierda, botón del menú a la derecha -->
      <nav
        aria-label="Principal"
        class="flex h-16 items-center justify-between p-2 lg:h-20"
      >
        <div class="flex items-center">
        <RouterLink
          :to="{ name: 'home' }"
          class="text-h3 font-extrabold whitespace-nowrap text-fondo sm:text-logo xl:ml-8"
        >
          <span class="sr-only">{{ site.name }} — inicio</span>
          <!-- Logo en un bloque verde; el bloque empieza en la primera línea de la retícula -->
          <span
            ref="logoTextRef"
            aria-hidden="true"
            class="block bg-primario px-1.5 pt-2 pb-1 whitespace-pre"
            >{{ logoText }}</span
          >
        </RouterLink>
        </div>

        <div class="relative xl:mr-8">
          <!-- Mismo alto que el bloque del logo: 36 px en móvil, 48 px desde 640 px -->
          <button
            ref="toggleRef"
            type="button"
            :class="[
              'relative grid size-9 shrink-0 cursor-pointer place-items-center overflow-hidden border border-primario bg-primario transition-colors duration-200 sm:size-12',
              open ? 'text-primario delay-200' : 'text-fondo delay-0',
            ]"
            :aria-expanded="open"
            aria-controls="menu-principal"
            @click="open = !open"
          >
            <span class="sr-only">{{ open ? "Cerrar menú" : "Abrir menú" }}</span>
            <!--
              Relleno crema: sube desde abajo como persiana al abrir y vuelve a bajar al cerrar.
              El "+" pasa a verde con un pequeño retraso, cuando la persiana ya lo cubrió.
            -->
            <span
              :class="[
                'absolute inset-0 bg-fondo transition-[clip-path] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]',
                open ? '[clip-path:inset(0)]' : '[clip-path:inset(100%_0_0_0)]',
              ]"
              aria-hidden="true"
            />
            <!-- Mientras se baraja, el "+" se muestra como texto con símbolos al azar -->
            <span v-if="toggleScrambling" class="relative text-boton leading-none" aria-hidden="true">{{
              toggleText
            }}</span>
            <!-- "+" que gira a "×" al abrir -->
            <span
              v-else
              :class="[
                'relative block size-4 transition-transform duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]',
                open && 'rotate-135',
              ]"
              aria-hidden="true"
            >
              <span class="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
              <span class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current" />
            </span>
          </button>

          <!--
            Menú transparente: borde verde y una línea entre cada enlace.
            Baja en persiana desde el borde inferior del botón.
          -->
          <div
            id="menu-principal"
            ref="menuRef"
            :class="[
              'absolute top-full right-0 flex flex-col overflow-hidden border border-primario bg-transparent md:grid md:grid-cols-5',
              'transition-[clip-path] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]',
              open ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]',
            ]"
            :style="menuStyle"
            :inert="!open"
          >
            <!-- Desde 768 px: los 4 enlaces en las columnas 1 a 4, separados por líneas -->
            <ul
              class="flex flex-col divide-y divide-primario border-b border-primario md:col-span-4 md:grid md:grid-cols-4 md:divide-x md:divide-y-0 md:border-b-0"
            >
              <li v-for="(item, i) in site.nav" :key="item.label">
                <RouterLink
                  :to="item.to"
                  :aria-label="item.label"
                  @click="goToSection(item, $event)"
                  @mouseenter="scrambleMenuItem(i)"
                  @focus="scrambleMenuItem(i)"
                  class="flex h-full items-center justify-between gap-2 bg-fondo px-4 py-2.5 text-right text-boton text-primario transition-colors duration-200 ease-out hover:bg-primario hover:text-fondo focus-visible:-outline-offset-4 md:px-3"
                >
                  <!-- El "*" de la página activa va a la izquierda; el texto, a la derecha -->
                  <span class="w-3 shrink-0 text-center" aria-hidden="true">{{
                    isActive(item) ? "*" : ""
                  }}</span>
                  <span class="whitespace-pre" aria-hidden="true">{{ menuText[i] }}</span>
                </RouterLink>
              </li>
            </ul>
            <!-- "escríbeme": columna 5 -->
            <button
              type="button"
              :aria-label="`Copiar correo ${site.email}`"
              class="flex cursor-pointer items-center justify-end bg-primario px-4 py-2.5 text-right text-boton text-fondo focus-visible:-outline-offset-4 focus-visible:outline-fondo md:border-l md:border-primario md:px-3"
              @click="copyEmail"
              @mouseenter="ctaHover = true"
              @mouseleave="ctaHover = false"
              @focus="ctaHover = true"
              @blur="ctaHover = false"
            >
              <span class="whitespace-pre" aria-hidden="true">{{ ctaText }}</span>
            </button>
            <p class="sr-only" aria-live="polite">{{ copied ? "Correo copiado" : "" }}</p>
          </div>
        </div>
      </nav>

      <!--
        Sección actual justo debajo del logo, del mismo tamaño (desde 768 px). Nunca toca el
        menú: al abrir baja primero (rápido) y el menú se despliega 0,2 s después; al cerrar,
        el menú se recoge primero y el título sube 0,3 s después. La sección conserva su
        título para lectores de pantalla.
      -->
      <!--
        Título de sección. Con una acción (navTitleAction) lleva una flecha "←" antes, y solo
        la flecha es un botón (ej. volver desde el detalle de un proyecto); el título es texto.
      -->
      <span
        v-if="sectionTitle"
        ref="sectionTitleRef"
        class="pointer-events-none absolute hidden items-center gap-[0.25em] font-display text-logo font-semibold whitespace-pre text-texto transition-[top] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)] md:flex"
        :style="titleStyle"
      >
        <button
          v-if="navTitleAction"
          type="button"
          class="group/arrow pointer-events-auto -my-[0.15em] -ml-[0.15em] cursor-pointer p-[0.15em]"
          :aria-label="navTitleAction.label"
          @click="navTitleAction.run()"
        >
          <svg
            class="block size-[0.6em] transition-transform duration-300 ease-[cubic-bezier(0.6,0,0.3,1)] group-hover/arrow:-translate-x-1"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.25"
            aria-hidden="true"
          >
            <path d="M10.5 6H1.5M5 2.5 1.5 6 5 9.5" />
          </svg>
        </button>
        <span aria-hidden="true">{{ sectionTitle }}</span>
      </span>
    </div>
  </header>
</template>
