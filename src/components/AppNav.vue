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
  contactInView,
} from "../composables/useMenu";
import { introLeaving } from "../composables/useIntro";
import { jumpToSection } from "../composables/useSmoothScroll";
import {
  useScrambleReplay,
  useScrambleText,
  syllableRanges,
  pickSyllable,
  SYMBOL_CHARSET,
  SCRAMBLE_CHARSET_LOWER,
} from "../composables/useScrambleText";
import { site } from "../data/site";

const route = useRoute();
const router = useRouter();

// Título de la sección actual, al lado del logo: entra y sale con letras al azar
// Con la sección de contacto en pantalla no se muestra ningún título (ej. "últimos registros")
const sectionTitle = useScrambleText(computed(() => (contactInView.value ? "" : navSectionTitle.value)), {
  stagger: 35,
  scramble: 380,
  tick: 50,
  keepUnchanged: false,
  charset: SCRAMBLE_CHARSET_LOWER,
});

// Estado compartido: el stack de Inicio también lo lee
const open = menuOpen;

// Con la sección de contacto en pantalla el logo se esconde, salvo con el menú abierto
const logoHidden = computed(() => contactInView.value && !open.value);

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
  { stagger: 40, scramble: 420, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER },
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

// Si ya se está en esa sección, el enlace no cambia la dirección: se cierra el menú y se salta igual
function goToSection(item, event) {
  const hash = item.to.hash;
  if (!hash || route.name !== item.to.name || route.hash !== hash) return;
  event.preventDefault();
  close();
  const el = document.getElementById(hash.slice(1));
  if (el) jumpToSection(el);
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

// Lo más bajo del navbar (para que las secciones fijas no queden debajo)
watch(
  [open, menuBottom, logoBox],
  () => {
    // El título va en la misma fila que el logo: lo más bajo es el logo, o el menú abierto
    if (open.value) navContentBottom.value = menuBottom.value;
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
        <div class="flex min-w-0 items-center">
        <RouterLink
          :to="{ name: 'home' }"
          :tabindex="logoHidden ? -1 : undefined"
          class="text-h3 font-extrabold whitespace-nowrap text-primario sm:text-logo xl:ml-8"
        >
          <span class="sr-only">{{ site.name }} — inicio</span>
          <!--
            Logo en un bloque rosado (acento); el bloque empieza en la primera línea de la retícula.
            Al llegar a contacto se recoge hacia arriba como persiana (vuelve con el menú abierto)
          -->
          <span
            ref="logoTextRef"
            aria-hidden="true"
            :class="[
              'block bg-acento px-6 pt-2 pb-1 whitespace-pre transition-[clip-path] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]',
              logoHidden ? '[clip-path:inset(0_0_100%_0)]' : '[clip-path:inset(0)]',
            ]"
            >{{ logoText }}</span
          >
        </RouterLink>
        <!--
          Sección actual a la derecha del logo, en la misma fila y centrada con él (desde 768 px).
          El menú se abre debajo, así que no se cruzan. Si es larga se corta con "…". La sección conserva su título para lectores de pantalla.
        -->
        <!--
          Título de sección. Con una acción (navTitleAction) lleva una flecha "←" antes, y solo
          la flecha es un botón (ej. volver desde el detalle de un proyecto); el título es texto.
        -->
        <span
          v-if="sectionTitle"
          class="pointer-events-none ml-6 hidden min-w-0 items-center gap-[0.25em] font-display text-logo font-semibold whitespace-pre text-texto md:flex"
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
              stroke-width="1.5"
              aria-hidden="true"
            >
              <path d="M10.5 6H1.5M5 2.5 1.5 6 5 9.5" />
            </svg>
          </button>
          <!-- Alto de línea 1,3: con el recorte para el "…", las colas (g, p, y) no se cortan -->
          <span aria-hidden="true" class="min-w-0 overflow-hidden leading-[1.3] text-ellipsis">{{ sectionTitle }}</span>
        </span>
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
              :class="[
                'flex cursor-pointer items-center justify-end px-4 py-2.5 text-right text-boton transition-colors duration-200 focus-visible:-outline-offset-4 focus-visible:outline-fondo md:border-l md:border-primario md:px-3',
                // copiado! en un bloque rosado, como la carita y el correo de contacto
                copied ? 'bg-acento text-primario' : 'bg-primario text-fondo',
              ]"
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

    </div>
  </header>
</template>
