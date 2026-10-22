<script setup>
import { ref, computed, watch, watchEffect, nextTick, onMounted, onBeforeUnmount } from "vue";
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
  contactInView,
  logoShrink,
  menuTextX,
} from "../composables/useMenu";
import { introLeaving, NAV_DELAY } from "../composables/useIntro";
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
import { useCaret } from "../composables/useCaret";
import TypingCaret from "./TypingCaret.vue";

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

// Desde 1024 px el menú queda siempre desplegado: no se cierra y el botón se oculta
const pinned = ref(false);
// En prueba (para comparar): con el menú desplegado, los enlaces van en la fila del logo, a su
// derecha, en vez de debajo. false vuelve al menú debajo del logo
const MENU_BESIDE_LOGO = true;
const beside = computed(() => pinned.value && MENU_BESIDE_LOGO);
let pinQuery;
function updatePinned() {
  pinned.value = pinQuery.matches;
  open.value = pinned.value;
  nextTick(measureMonument);
}

/*
 * Logo monumento, solo al comienzo de Inicio: arriba el nombre ocupa todo el ancho, del borde del
 * logo al de los enlaces, justo debajo de la fila del menú; al bajar se achica de forma continua
 * hasta su tamaño de logo, fijo arriba a la izquierda. En las demás páginas es siempre el logo
 * chico. Se hace con transform sobre el texto (el enlace conserva su tamaño de logo, así nada más
 * se mueve). --cabecera: dónde termina la cabecera (el nombre grande en Inicio, la fila del menú en
 * el resto), para que las páginas y la retícula del stack empiecen debajo (ver App.vue).
 */
const MONUMENT_GAP = 16;
const navRowRef = ref(null);
const rightRef = ref(null);
// small / big: dónde termina la cabecera con el logo chico y con el nombre gigante
const monument = ref({ scale: 1, lift: 0, distance: 1, small: 0, big: 0 });
const scrollY = ref(0);
function measureMonument() {
  const link = logoLinkRef.value?.$el.getBoundingClientRect();
  const right = rightRef.value?.getBoundingClientRect();
  const row = navRowRef.value?.getBoundingClientRect();
  const text = logoTextRef.value;
  if (!link || !right || !row || !text?.offsetWidth) return;
  const small = row.bottom + MONUMENT_GAP;
  if (route.name !== "home") {
    monument.value = { scale: 1, lift: 0, distance: 1, small, big: small };
    logoShrink.value = 0;
    document.documentElement.style.setProperty("--cabecera", `${small}px`);
    return;
  }
  // Cabe con la carita (":)", un carácter más que "*"), que se ve al salir de la intro
  const charWidth = text.offsetWidth / logoText.value.length;
  const scale = Math.max(1, (right.right - link.left) / (charWidth * (site.wordmark.length + 1)));
  const lift = row.bottom - link.top;
  const bottom = row.bottom + text.offsetHeight * scale;
  // El nombre termina de achicarse cuando la página subió lo que mide de más
  monument.value = { scale, lift, distance: Math.max(1, bottom - link.bottom), small, big: bottom + MONUMENT_GAP };
  logoShrink.value = monument.value.distance;
  document.documentElement.style.setProperty("--cabecera", `${bottom + MONUMENT_GAP}px`);
}
// Al cambiar de página se vuelve a medir (el nombre gigante es solo de Inicio)
watch(() => route.name, () => nextTick(measureMonument));
// 0 = nombre gigante, 1 = logo chico (según cuánto se bajó)
const shrink = computed(() => Math.min(scrollY.value / monument.value.distance, 1));
const logoStyle = computed(() => {
  const { scale, lift } = monument.value;
  const p = shrink.value;
  return { transform: `translateY(${lift * (1 - p)}px) scale(${scale + (1 - scale) * p})` };
});
// --cabecera-viva: dónde termina la cabecera en este momento del scroll (la franja crema detrás del
// navbar la sigue: se achica junto con el nombre al bajar y vuelve a crecer al subir)
watchEffect(() => {
  const { small, big } = monument.value;
  if (!big) return;
  const live = small + (big - small) * (1 - shrink.value);
  document.documentElement.style.setProperty("--cabecera-viva", `${live}px`);
});

// Con la sección de contacto en pantalla el logo se esconde, salvo con el menú abierto
const logoHidden = computed(() => contactInView.value && !open.value);

/*
 * Retícula: va del borde izquierdo del texto del logo al borde derecho del botón del menú,
 * en 5 columnas (las mismas líneas del stack de Inicio).
 * - Desde 768 px el menú es una fila que ocupa toda la retícula, un enlace por columna.
 * - En móvil es una lista vertical del mismo ancho.
 */
const logoTextRef = ref(null);
const logoLinkRef = ref(null);
const menuRef = ref(null);
const gridWidth = ref(0);
// El espacio logo → menú es igual al espacio menú → líneas del stack (en todas las pantallas)
const MENU_GAP = 24;
const menuTop = ref(null);
const logoBox = ref(null);
function measureGrid() {
  // El enlace, no el texto: el texto se agranda con transform (ver logo monumento)
  const logo = logoLinkRef.value?.$el.getBoundingClientRect();
  const button = toggleRef.value?.getBoundingClientRect();
  if (!logo || !button) return;
  logoBox.value = { left: logo.left, bottom: logo.bottom };
  gridWidth.value = button.right - logo.left;
  // El menú se posiciona respecto del botón (su contenedor empieza en el borde superior del botón).
  // En Inicio, con el nombre gigante, empieza debajo de él (--cabecera-viva)
  menuTop.value = `calc(max(${logo.bottom + MENU_GAP}px, var(--cabecera-viva, 0px)) - ${button.top}px)`;
}
const menuStyle = computed(() => {
  if (!gridWidth.value || beside.value) return {};
  return {
    width: `${gridWidth.value}px`,
    ...(menuTop.value !== null ? { top: menuTop.value } : {}),
  };
});
// El stack de Inicio usa el borde inferior del menú para bajar sus líneas
function measureMenu() {
  const box = menuRef.value?.getBoundingClientRect();
  if (!box) return;
  menuBottom.value = box.bottom;
  // En la fila del logo el menú no ocupa espacio debajo: la página no se corre por él
  menuHeight.value = beside.value ? 0 : box.height;
  // Con el menú en la fila: dónde empieza el texto del primer enlace, medido desde el borde del logo
  // (la columna de ubicación y año del pie empieza ahí, ver AppFooter)
  const first = menuRef.value.querySelector("li a span:last-child")?.getBoundingClientRect();
  const logo = logoLinkRef.value?.$el.getBoundingClientRect();
  if (beside.value && first && logo) document.documentElement.style.setProperty("--menu-inicio", `${first.left - logo.left}px`);
  else document.documentElement.style.removeProperty("--menu-inicio");
  menuTextX.value = beside.value && first ? first.left : 0;
}
watch([open, menuStyle, beside], () => nextTick(measureMenu));
// En Inicio el menú abierto sube con el nombre al bajar: la franja crema detrás lo sigue
watch(scrollY, () => open.value && !pinned.value && measureMenu());
// Al empezar el scroll del stack de fotos y al volver arriba, el logo y el botón pasan por símbolos al azar
const SYMBOL_SCRAMBLE = { stagger: 35, scramble: 380, tick: 50, charset: SYMBOL_CHARSET };
const logo = useScrambleReplay(site.wordmark, SYMBOL_SCRAMBLE);
const toggleSymbol = useScrambleReplay("+", { ...SYMBOL_SCRAMBLE, scramble: 600 });
function playSymbols() {
  logo.play();
  if (!open.value) toggleSymbol.play();
}
/*
 * Entrada, al entrar por Inicio: lo primero que se ve es el logo (gigante) escribiéndose con
 * letras al azar y un cursor, con una carita en vez del "*". Al terminar, tras FACE_DELAY la carita
 * se baraja con símbolos hasta el "*", y NAV_DELAY después se marca introLeaving: recién ahí
 * aparecen los elementos del navbar y luego el stack (ver useIntro). En otras páginas (o navegando
 * dentro del sitio) el logo está completo desde el principio.
 */
const FACE = ":)";
const ENDING = site.wordmark.at(-1);
const PREFIX = site.wordmark.slice(0, -1);
const TYPE_DELAY = 300; // antes de empezar a escribir
const FACE_DELAY = 500; // entre que termina de escribirse y la carita pasa al "*"
const typed = ref(introLeaving.value);
const typing = ref(false);
const typedText = useScrambleText(
  computed(() => (typed.value ? PREFIX + FACE : " ".repeat(PREFIX.length + FACE.length))),
  { stagger: 60, scramble: 500, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER, playing: typing },
);
const { state: logoCaret } = useCaret(typing);
// Terminado el logo: la carita pasa al "*" y, una pausa después (NAV_DELAY), entra el resto
const typedDone = ref(introLeaving.value);
let typeTimer = 0;
watch(typing, (now) => {
  if (now || !typed.value) return;
  typedDone.value = true;
  typeTimer = setTimeout(() => {
    face.value = ENDING;
    typeTimer = setTimeout(() => (introLeaving.value = true), NAV_DELAY);
  }, FACE_DELAY);
});
onMounted(() => {
  if (introLeaving.value) return;
  typeTimer = setTimeout(() => {
    typed.value = true;
    // Con movimiento reducido el logo aparece completo, con el "*", y el resto de inmediato
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      typedDone.value = true;
      face.value = ENDING;
      introLeaving.value = true;
    }
  }, TYPE_DELAY);
});

const face = ref(introLeaving.value ? ENDING : FACE);
watch(introLeaving, (leaving) => leaving && toggleSymbol.play());
onBeforeUnmount(() => clearTimeout(typeTimer));
const faceText = useScrambleText(face, { ...SYMBOL_SCRAMBLE, keepUnchanged: false });
const logoText = computed(() => {
  if (logo.playing.value) return logo.display.value;
  return typedDone.value ? PREFIX + faceText.value : typedText.value;
});
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
function playMenuEntrance() {
  menuTimers.forEach(clearTimeout);
  menuTimers = menuItems.map((item, i) =>
    setTimeout(() => item.replay.play(pickSyllable(item.ranges)), i * MENU_ITEM_STAGGER),
  );
}
watch(open, (isOpen) => {
  if (!isOpen) {
    menuTimers.forEach(clearTimeout);
    ctaHover.value = false;
    return;
  }
  playMenuEntrance();
});
// En la entrada de Inicio los elementos del navbar aparecen recién cuando el logo terminó de
// escribirse (ver navShown); el menú desplegado de desktop se arma en ese momento
watch(introLeaving, (leaving) => leaving && open.value && playMenuEntrance());

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

// Desplegado fijo en desktop no atrapa el foco: el resto de la página sigue usable
useFocusTrap(navRef, computed(() => open.value && !pinned.value));

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
  if (pinned.value) return;
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
  scrollY.value = window.scrollY;
  const overlay = document.querySelector("[data-nav-overlay]");
  // Basta con que asome cualquier parte de la sección para quitar el fondo
  overPhotos.value = !!overlay && overlay.getBoundingClientRect().bottom > 0;
}

onMounted(() => {
  // Medir la retícula cuando la fuente del logo ya cargó, y de nuevo al cambiar el tamaño
  document.fonts.ready.then(() => {
    measureGrid();
    measureMonument();
  });
  window.addEventListener("resize", measureGrid);
  window.addEventListener("resize", measureMonument);
  window.addEventListener("resize", measureMenu);
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("jdm:stack-edge", playSymbols);
  pinQuery = window.matchMedia("(width >= 64rem)");
  pinQuery.addEventListener("change", updatePinned);
  updatePinned();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", measureGrid);
  window.removeEventListener("resize", measureMonument);
  window.removeEventListener("resize", measureMenu);
  document.removeEventListener("keydown", onKeydown);
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("jdm:stack-edge", playSymbols);
  pinQuery?.removeEventListener("change", updatePinned);
});

// Borde inferior del título cuando va debajo del menú (ver beside)
const sectionTitleRef = ref(null);
const titleBottom = ref(0);
watch([sectionTitle, beside], () =>
  nextTick(() => (titleBottom.value = sectionTitleRef.value?.getBoundingClientRect().bottom ?? 0)),
);

// Lo más bajo del navbar (para que las secciones fijas no queden debajo)
watch(
  [open, menuBottom, logoBox, titleBottom, beside],
  () => {
    const bottom = open.value ? menuBottom.value : (logoBox.value?.bottom ?? 0);
    // Con el menú en la fila del logo, el título va debajo de él y es lo más bajo
    navContentBottom.value = beside.value && sectionTitle.value.trim() ? Math.max(bottom, titleBottom.value) : bottom;
  },
  { immediate: true },
);
</script>

<template>
  <!-- Navbar siempre transparente, en todas las páginas -->
  <header class="fixed inset-x-0 top-0 z-50 p-2">
    <!--
      Franja crema plana detrás del navbar, del alto de la cabecera en este momento (--cabecera-viva):
      en Inicio, alta con el nombre gigante; al bajar, su borde de abajo sube junto con el nombre
      (como persiana) hasta quedar como fondo del navbar, y vuelve a crecer al subir
    -->
    <div class="absolute inset-x-0 top-0 -z-10 h-(--cabecera-viva,0px) bg-fondo" aria-hidden="true" />
    <!-- Con el menú abierto en pantallas chicas, la franja crema baja como persiana hasta cubrirlo -->
    <div
      v-if="!pinned"
      :class="[
        'absolute inset-x-0 top-0 -z-10 bg-fondo transition-[clip-path] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]',
        open ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]',
      ]"
      :style="{ height: `${menuBottom + 16}px` }"
      aria-hidden="true"
    />
    <!-- Clic fuera del menú lo cierra -->
    <div
      v-if="open && !pinned"
      class="fixed inset-0"
      aria-hidden="true"
      @click="close()"
    />

    <div ref="navRef" class="relative mx-auto max-w-360">
      <!-- Logo a la izquierda, botón del menú a la derecha -->
      <nav
        ref="navRowRef"
        aria-label="Principal"
        class="flex h-16 items-center justify-between p-2 lg:h-20"
      >
        <div class="flex min-w-0 items-center">
        <RouterLink
          ref="logoLinkRef"
          :to="{ name: 'home' }"
          :tabindex="logoHidden ? -1 : undefined"
          translate="no"
          :class="[
            'group/logo shrink-0 text-h3 leading-[0.85] font-extrabold tracking-[-0.04em] whitespace-nowrap text-primario sm:text-logo sm:leading-[0.85] xl:ml-8',
          ]"
        >
          <span class="sr-only">{{ site.name }} — inicio</span>
          <!--
            Logo monumento (ver logoStyle): el nombre, sin bloque, empieza en la primera línea de
            la retícula; siempre verde, sobre la franja crema del navbar. Al llegar a
            contacto se recoge hacia arriba como persiana (vuelve con el menú abierto)
          -->
          <span
            ref="logoTextRef"
            aria-hidden="true"
            :class="[
              // pb: espacio para las colas (j, g) dentro del recorte de la persiana
              // Subrayado rosado al pasar, como los enlaces del menú (grosor según el tamaño del logo)
              'inline-block origin-top-left pb-[0.2em] whitespace-pre decoration-acento decoration-[0.06em] underline-offset-[0.12em] group-hover/logo:underline transition-[clip-path] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]',
              logoHidden ? '[clip-path:inset(0_0_100%_0)]' : '[clip-path:inset(0)]',
            ]"
            :style="logoStyle"
            >{{ logoText.trimEnd() }}<TypingCaret :state="logoCaret" />{{ logoText.slice(logoText.trimEnd().length) }}</span
          >
        </RouterLink>
        <!--
          Sección actual a la derecha del logo, en la misma fila y centrada con él (desde 768 px).
          El menú se abre debajo, así que no se cruzan. Si es larga se corta con "…". La sección conserva su título para lectores de pantalla.
        -->
        <span
          v-if="sectionTitle"
          ref="sectionTitleRef"
          :class="[
            'pointer-events-none hidden min-w-0 items-center gap-[0.25em] font-display text-logo font-semibold whitespace-pre text-texto md:flex',
            // Con el menú en la fila: debajo de él, alineado con su borde derecho (p-2 del nav y
            // xl:mr-8 del menú); si no, a la derecha del logo
            beside ? 'absolute top-full right-2 mt-2 xl:right-10' : 'ml-6',
          ]"
        >
          <!-- Alto de línea 1,3: con el recorte para el "…", las colas (g, p, y) no se cortan -->
          <span aria-hidden="true" class="min-w-0 overflow-hidden leading-[1.3] text-ellipsis">{{ sectionTitle }}</span>
        </span>
        </div>

        <!--
          Con el menú en la fila del logo, este bloque empieza en la primera línea interior de la
          retícula de tercios del stack (1/3 del ancho entre el borde del logo y el del botón) y
          llega al borde derecho: 2/3 de la fila (desde xl, sin los márgenes xl:ml-8 y xl:mr-8).
          min-w-max: si los enlaces no caben (pantallas angostas), empieza antes
        -->
        <!--
          Elementos del navbar (menú, o el botón en pantallas chicas): en la entrada de Inicio bajan
          como persiana cuando el logo terminó de escribirse (introLeaving); después aparece el stack
        -->
        <div
          ref="rightRef"
          :inert="!introLeaving"
          :class="[
            'relative shrink-0 xl:mr-8',
            beside && 'flex items-center',
          ]"
        >
          <!-- Mismo alto que el bloque del logo: 36 px en móvil, 48 px desde 640 px -->
          <button
            ref="toggleRef"
            type="button"
            :class="[
              // lg:invisible y no hidden: el botón sigue midiendo, el menú se ubica respecto de él
              'relative grid size-9 shrink-0 cursor-pointer place-items-center text-primario transition-[clip-path] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)] sm:size-12 lg:invisible',
              beside && 'hidden',
              // Entrada de Inicio: baja como persiana cuando el logo terminó de escribirse
              introLeaving ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]',
            ]"
            :aria-expanded="open"
            aria-controls="menu-principal"
            @click="open = !open"
          >
            <span class="sr-only">{{ open ? "Cerrar menú" : "Abrir menú" }}</span>
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
            Menú de texto, sin cajas, como en escritorio. En pantallas chicas baja en persiana bajo
            el logo: en lista en móvil, en una fila de borde a borde de la retícula desde 768 px
          -->
          <div
            id="menu-principal"
            ref="menuRef"
            :class="[
              beside ? 'static' : 'absolute top-full right-0',
              // En la fila del logo cada enlace tiene su propio ancho: al pasar por escríbeme
              // solo crece él (en la grilla de 5 columnas iguales crecerían todos)
              // En la fila: 5 celdas iguales, cada una al menos del ancho del correo (ch = una letra
              // del mono en text-boton), así al mostrarlo en escríbeme no se sale ni mueve a las demás
              // Desde 1024 px: enlaces de texto en la esquina, sin cajas (sobre la franja crema)
              beside
                ? 'flex items-center gap-6 text-boton text-primario'
                : 'flex flex-col text-primario md:flex-row md:items-center md:justify-between',
              'transition-[clip-path] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]',
              open && introLeaving ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]',
            ]"
            :style="menuStyle"
            :inert="!open"
          >
            <!-- Desde 768 px: los 4 enlaces en las columnas 1 a 4, separados por líneas -->
            <ul
              :class="
beside ? 'flex items-center gap-6' : 'flex flex-col md:flex-row md:gap-6'"
            >
              <li v-for="(item, i) in site.nav" :key="item.label">
                <RouterLink
                  :to="item.to"
                  :aria-label="item.label"
                  @click="goToSection(item, $event)"
                  @mouseenter="scrambleMenuItem(i)"
                  @focus="scrambleMenuItem(i)"
                  :class="[
                    'flex items-center py-2.5 text-boton decoration-acento decoration-2 underline-offset-4 hover:underline',
                    isActive(item) && 'underline',
                  ]"
                >
                  <!-- La página activa queda subrayada en rosado, como al pasar el cursor -->
                  <span class="whitespace-pre" aria-hidden="true">{{ menuText[i] }}</span>
                </RouterLink>
              </li>
            </ul>
            <!-- "escríbeme": columna 5 -->
            <button
              type="button"
              :aria-label="`Copiar correo ${site.email}`"
              :class="[
                // py: el subrayado queda dentro del recorte de la persiana del menú
                'w-fit cursor-pointer py-2.5 text-left text-boton decoration-acento decoration-2 underline-offset-4 hover:underline',
                copied && 'bg-acento px-1 text-primario',
              ]"
              title="clickea :)"
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
