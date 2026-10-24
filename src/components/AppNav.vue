<script setup>
import { ref, computed, watch, watchEffect, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useFocusTrap } from "../composables/useFocusTrap";
import {
  menuOpen,
  menuBottom,
  menuHeight,
  navOverPhotos,
  navSectionTitle,
  navContentBottom,
  contactInView,
  logoShrink,
  returningHome,
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
import { useReducedMotion } from "../composables/useReducedMotion";
import { playPageExit } from "../composables/usePageExit";

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
// Con el menú en lista (desde 1024 px): aire entre el logo y la lista, y bajo la lista
const LIST_GAP = 12;
const LIST_COLUMN_GAP = 32;
const MENU_LIST_GAP = 32;
const navRowRef = ref(null);
const rightRef = ref(null);
/*
 * small / big: dónde termina la cabecera con el logo chico y con el nombre gigante.
 * Con el menú en lista (ver listStyle): spanTop y textH son la posición y el alto del texto del
 * logo sin transformar, listTop dónde está la lista sin moverla y listEnd dónde termina (inicio a
 * la altura de las minúsculas del logo chico).
 */
const monument = ref({ scale: 1, lift: 0, distance: 1, small: 0, big: 0, spanTop: 0, textH: 0, listTop: 0, listEnd: 0, listH: 0 });
// Altura de las minúsculas (de la x) en la fuente de un elemento, en px
function xHeight(el) {
  const style = getComputedStyle(el);
  const ctx = (measureCanvas ??= document.createElement("canvas")).getContext("2d");
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return ctx.measureText("x").actualBoundingBoxAscent;
}
// Línea base de un elemento (y en pantalla): el borde de abajo de una caja vacía alineada a ella
function baselineOf(el) {
  const mark = document.createElement("span");
  mark.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
  el.appendChild(mark);
  const y = mark.getBoundingClientRect().bottom;
  mark.remove();
  return y;
}
const scrollY = ref(0);
let measureCanvas = null;
function measureMonument() {
  const link = logoLinkRef.value?.$el.getBoundingClientRect();
  const right = rightRef.value?.getBoundingClientRect();
  const row = navRowRef.value?.getBoundingClientRect();
  const text = logoTextRef.value;
  if (!link || !right || !row || !text?.offsetWidth) return;
  const textH = text.offsetHeight;
  const spanTop = text.offsetParent.getBoundingClientRect().top + text.offsetTop;
  const listH = beside.value ? right.height : 0;
  // Con la lista: al final, el borde de arriba de las minúsculas de inicio a la altura del de las
  // minúsculas del logo chico (el palo de la j, sin su punto). Se mide cada uno como línea base
  // menos la altura de la x de su fuente; el de inicio, respecto del borde de arriba de la lista
  const firstLink = beside.value ? menuRef.value?.querySelector("li a span") : null;
  const listEnd = firstLink
    ? baselineOf(logoLinkRef.value.$el) -
      xHeight(text) -
      (baselineOf(firstLink) - xHeight(firstLink) - menuRef.value.getBoundingClientRect().top)
    : 0;
  const small = beside.value
    ? Math.max(row.bottom, listEnd + listH) + MENU_LIST_GAP
    : row.bottom + MONUMENT_GAP;
  const base = { spanTop, textH, listTop: right.top, listEnd, listH };
  // Alto final de la franja crema, con el logo chico (el stack de Inicio en móvil lo usa)
  document.documentElement.style.setProperty("--cabecera-chica", `${small}px`);
  if (route.name !== "home") {
    monument.value = { scale: 1, lift: 0, distance: 1, small, big: small, ...base };
    logoShrink.value = 0;
    document.documentElement.style.setProperty("--cabecera", `${small}px`);
    return;
  }
  // Cabe con la carita (":)", un carácter más que "*"), que se ve al salir de la intro. Se mide el
  // texto final con su fuente (no el que está en pantalla, que en la intro aún está en blanco: en
  // una fuente proporcional los espacios son más angostos que las letras)
  const style = getComputedStyle(text);
  const ctx = (measureCanvas ??= document.createElement("canvas")).getContext("2d");
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.letterSpacing = style.letterSpacing;
  // Hasta el borde derecho; con la lista, hasta antes de su columna (así nunca pasa sobre ella)
  const limit = beside.value ? right.left - LIST_COLUMN_GAP : right.right;
  const scale = Math.max(1, (limit - link.left) / ctx.measureText(PREFIX + FACE).width);
  // El nombre gigante empieza justo bajo la fila del navbar
  const lift = row.bottom - spanTop;
  const giantBottom = row.bottom + textH * scale;
  const big = beside.value ? giantBottom + LIST_GAP + listH + MENU_LIST_GAP : giantBottom + MONUMENT_GAP;
  // El nombre termina de achicarse cuando la página subió lo mismo que baja la franja crema
  // (big - small): así la franja, la lista y el stack de Inicio en móvil van 1:1 con el scroll
  monument.value = { scale, lift, distance: Math.max(1, big - small), small, big, ...base };
  logoShrink.value = monument.value.distance;
  document.documentElement.style.setProperty("--cabecera", `${big}px`);
}
// Al cambiar de página se vuelve a medir (el nombre gigante es solo de Inicio)
watch(() => route.name, () => nextTick(measureMonument));
// 0 = nombre gigante, 1 = logo chico (según cuánto se bajó)
/*
 * Al llegar a Inicio con un salto a una sección (ej. contacto desde otra página), la página está un
 * instante arriba antes del salto: sin esto se vería el nombre gigante. Mientras tanto el logo
 * queda chico; se libera cuando el scroll pasó el tramo del nombre (o a los 2,5 s, si no saltó).
 */
const jumping = ref(false);
let jumpTimer = 0;
watch(
  () => route.name,
  (name, prev) => {
    if (name !== "home" || !route.hash || prev === "home") return;
    jumping.value = true;
    clearTimeout(jumpTimer);
    jumpTimer = setTimeout(() => (jumping.value = false), 2500);
  },
  { immediate: true },
);
onBeforeUnmount(() => clearTimeout(jumpTimer));
const scrollShrink = computed(() => (jumping.value ? 1 : Math.min(scrollY.value / monument.value.distance, 1)));
/*
 * Entre Inicio y otra página la franja y el nombre se mueven solos, como el scroll: al salir de
 * Inicio la franja sube y el nombre se achica antes del cambio de página; al volver, la página
 * llega con el logo chico y la franja baja y el nombre crece. Mientras tanto shrink lo manda forced.
 */
const NAV_MOVE = 800;
const PAGE_FADE = 240; // fundido de salida de la página anterior (main.css)
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const reducedMotion = useReducedMotion();
const forced = ref(null);
let forcedFrame = 0;
let forcedTimer = 0;
// grow: de chico (1) a lo que marca el scroll; si no, de lo que marca el scroll a chico
function moveNav(grow) {
  cancelAnimationFrame(forcedFrame);
  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / NAV_MOVE, 1);
      const e = easeInOut(t);
      const n = scrollShrink.value;
      forced.value = grow ? 1 + (n - 1) * e : n + (1 - n) * e;
      if (t < 1) forcedFrame = requestAnimationFrame(step);
      else {
        if (grow) forced.value = null;
        resolve();
      }
    };
    forcedFrame = requestAnimationFrame(step);
  });
}
// Al ir a otra página, primero sale lo que se ve de esta (ver usePageExit), a la vez que la franja
const removeLeaveGuard = router.beforeEach((to, from) => {
  if (!from.name || to.path === from.path || reducedMotion.value) return;
  const leavingHome = from.name === "home" && to.name !== "home" && scrollShrink.value < 1;
  return Promise.all([leavingHome && moveNav(false), playPageExit()]).then(() => {});
});
watch(
  () => route.name,
  (name, prev) => {
    cancelAnimationFrame(forcedFrame);
    clearTimeout(forcedTimer);
    forced.value = null;
    returningHome.value = false;
    if (name !== "home" || !prev || prev === "home" || route.hash || reducedMotion.value) return;
    returningHome.value = true;
    forced.value = 1;
    forcedTimer = setTimeout(() => moveNav(true), PAGE_FADE);
  },
);
onBeforeUnmount(() => {
  removeLeaveGuard();
  cancelAnimationFrame(forcedFrame);
  clearTimeout(forcedTimer);
});
const shrink = computed(() => forced.value ?? scrollShrink.value);
watch(scrollY, (y) => {
  if (jumping.value && y >= monument.value.distance) jumping.value = false;
});
// Nombre gigante arriba de Inicio, sin scroll: subrayado fijo y no es enlace (ya se está en Inicio).
// Desde el primer scroll el subrayado se desvanece y vuelve solo al pasar el cursor
const logoAtTop = computed(() => route.name === "home" && shrink.value === 0);
// Lista del menú (desde 1024 px): con el nombre gigante empieza bajo él (su borde de abajo +
// LIST_GAP) y sube a la par mientras se achica, hasta quedar con inicio a la altura del logo
// Borde de arriba de la lista en este momento del scroll (null sin la lista en la fila)
const listLiveTop = computed(() => {
  const { scale, lift, spanTop, textH, listEnd } = monument.value;
  if (!beside.value || !textH) return null;
  // Fuera de Inicio no hay nombre gigante: la lista está siempre en su lugar final
  const p = route.name === "home" ? shrink.value : 1;
  const start = spanTop + lift + textH * scale + LIST_GAP;
  return listEnd + (start - listEnd) * (1 - p);
});
const listStyle = computed(() =>
  listLiveTop.value === null ? null : { transform: `translateY(${listLiveTop.value - monument.value.listTop}px)` },
);
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
function playSymbols() {
  logo.play();
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
onBeforeUnmount(() => clearTimeout(typeTimer));
const faceText = useScrambleText(face, { ...SYMBOL_SCRAMBLE, keepUnchanged: false });
const logoText = computed(() => {
  if (logo.playing.value) return logo.display.value;
  return typedDone.value ? PREFIX + faceText.value : typedText.value;
});
// Botón del menú en texto: se arma al entrar (con el resto del navbar) y se baraja al abrir y cerrar
const toggleText = useScrambleText(
  computed(() => (!introLeaving.value ? "    " : open.value ? "cerrar" : "menú")),
  { stagger: 35, scramble: 380, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER },
);

// Al abrir el menú, en cada enlace se desordena una sílaba al azar (a veces también una letra suelta)
const MENU_ITEM_STAGGER = 70;
const menuItems = site.nav.map((item) => ({
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
  // Y cada vez que termina de cargar otra fuente (ej. las de prueba de /guia)
  document.fonts.addEventListener("loadingdone", measureMonument);
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
  document.fonts.removeEventListener("loadingdone", measureMonument);
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
  [open, menuBottom, logoBox, titleBottom, beside, listLiveTop],
  () => {
    // Con el menú en lista, donde termina la lista ahora (se mueve con el scroll en Inicio)
    const listBottom = listLiveTop.value === null ? null : listLiveTop.value + monument.value.listH;
    const bottom = listBottom ?? (open.value ? menuBottom.value : (logoBox.value?.bottom ?? 0));
    // Con el menú en la fila del logo, el título va debajo de él y es lo más bajo
    navContentBottom.value = beside.value && sectionTitle.value.trim() ? Math.max(bottom, titleBottom.value) : bottom;
  },
  { immediate: true },
);
</script>

<template>
  <!--
    Fondo crema en la caja del header (solo la fila del logo, que siempre está sobre la franja
    crema): Safari en iPhone tiñe la barra de estado con el fondo del elemento fijo de arriba
  -->
  <header class="fixed inset-x-0 top-0 z-50 bg-fondo lg:pt-4 p-2">
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
        class="flex h-16 items-center justify-between p-2 lg:h-20 lg:items-start"
      >
        <div class="flex min-w-0 items-center">
        <RouterLink
          ref="logoLinkRef"
          :to="{ name: 'home' }"
          :tabindex="logoHidden || logoAtTop ? -1 : undefined"
          translate="no"
          :class="[
            // Peso por variable: en las pruebas de /guia el logo puede ir en una serif de un solo peso
            'group/logo shrink-0 font-logo text-h3 leading-[0.85] [font-weight:var(--logo-peso,800)] tracking-[-0.04em] whitespace-nowrap text-primario sm:text-logo sm:leading-[0.85] xl:ml-8',
            logoAtTop && 'pointer-events-none',
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
              'inline-block origin-top-left pb-[0.2em] whitespace-pre transition-[clip-path] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]',
              logoHidden ? '[clip-path:inset(0_0_100%_0)]' : '[clip-path:inset(0)]',
            ]"
            :style="logoStyle"
            >
              <!--
                Subrayado rosado en dos partes: el nombre y la carita (o el *), cortado en el último
                espacio. Fijo arriba de Inicio (logoAtTop); si no, solo al pasar el cursor
              -->
              <template v-for="(part, i) in logoText.trimEnd().split(/( +)(?=\S+$)/)" :key="i"
                ><span
                  v-if="part.trim()"
                  :class="[
                    'underline decoration-[0.06em] underline-offset-[0.12em] transition-[text-decoration-color] duration-500',
                    logoAtTop ? 'decoration-acento' : 'decoration-transparent group-hover/logo:decoration-acento',
                  ]"
                  >{{ part }}</span
                ><template v-else>{{ part }}</template></template
              ><TypingCaret :state="logoCaret" />{{ logoText.slice(logoText.trimEnd().length) }}</span
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
            'pointer-events-none hidden min-w-0 items-center gap-[0.25em] font-display text-logo whitespace-pre text-texto md:flex',
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
            // En la fila: el último tercio de la retícula (sin los márgenes xl:ml-8 y xl:mr-8)
            beside && 'flex w-1/3 items-center xl:w-[calc((100%-4rem)/3)]',
          ]"
        >
          <!-- Mismo alto que el bloque del logo: 36 px en móvil, 48 px desde 640 px -->
          <button
            ref="toggleRef"
            type="button"
            :class="[
              // lg:invisible y no hidden: el botón sigue midiendo, el menú se ubica respecto de él
              'group/toggle relative grid h-9 shrink-0 cursor-pointer place-items-center text-primario transition-[clip-path] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)] sm:h-12 lg:invisible',
              beside && 'hidden',
              // Entrada de Inicio: baja como persiana cuando el logo terminó de escribirse
              introLeaving ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]',
            ]"
            :aria-expanded="open"
            aria-controls="menu-principal"
            @click="open = !open"
          >
            <span class="sr-only">{{ open ? "Cerrar menú" : "Abrir menú" }}</span>
            <!-- En texto, como los enlaces: "menú" se baraja a "cerrar" al abrir. Ancho fijo (mono) para que no salte -->
            <span
              class="inline-block w-[6ch] text-right text-boton whitespace-pre decoration-acento decoration-2 underline-offset-4 group-hover/toggle:underline"
              aria-hidden="true"
              >{{ toggleText }}</span
            >
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
              // Desde 1024 px: lista de texto hacia abajo al comienzo del último tercio, sin cajas
              // (sobre la franja crema), siempre debajo del logo (ver listStyle; la cabecera la
              // incluye, ver measureMonument); desde
              // antes, en fila, repartidos de borde a borde bajo el logo
              beside ? 'flex w-full flex-col text-boton text-primario' : 'flex flex-col text-primario',
              'transition-[clip-path] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]',
              open && introLeaving ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]',
            ]"
            :style="[menuStyle, listStyle]"
            :inert="!open"
          >
            <ul
              :class="beside ? 'flex flex-col' : 'flex w-full flex-row items-center justify-between'"
            >
              <li v-for="(item, i) in site.nav" :key="item.label">
                <RouterLink
                  :to="item.to"
                  :aria-label="item.label"
                  @click="goToSection(item, $event)"
                  @mouseenter="scrambleMenuItem(i)"
                  @focus="scrambleMenuItem(i)"
                  :class="[
                    // En la lista de escritorio, menos aire: los 4 entran en el alto de la fila del logo
                    'flex w-fit items-center text-boton decoration-acento decoration-2 underline-offset-4 hover:underline',
                    beside ? 'py-[5px]' : 'py-2.5',
                    isActive(item) && 'underline',
                  ]"
                >
                  <!-- La página activa queda subrayada en rosado, como al pasar el cursor -->
                  <span class="whitespace-pre" aria-hidden="true">{{ menuText[i] }}</span>
                </RouterLink>
              </li>
            </ul>
          </div>
        </div>
      </nav>

    </div>
  </header>
</template>
