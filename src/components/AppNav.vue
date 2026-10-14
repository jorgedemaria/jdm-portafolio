<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useFocusTrap } from "../composables/useFocusTrap";
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

const open = ref(false);
// Al empezar el scroll del stack de fotos y al volver arriba, el logo y el botón pasan por símbolos al azar
const SYMBOL_SCRAMBLE = { stagger: 35, scramble: 380, tick: 50, charset: SYMBOL_CHARSET };
const logo = useScrambleReplay(site.wordmark, SYMBOL_SCRAMBLE);
const toggleSymbol = useScrambleReplay("+", { ...SYMBOL_SCRAMBLE, scramble: 600 });
function playSymbols() {
  logo.play();
  if (!open.value) toggleSymbol.play();
}
const logoText = logo.display;
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
const overPhotos = ref(false);
const navRef = ref(null);
const toggleRef = ref(null);

useFocusTrap(navRef, open);

// "Proyectos" sigue activo dentro del detalle de un proyecto
function isActive(item) {
  const path = router.resolve(item.to).path;
  return path === "/" ? route.path === "/" : route.path.startsWith(path);
}

function close({ restoreFocus = false } = {}) {
  open.value = false;
  if (restoreFocus) toggleRef.value?.focus();
}

function onKeydown(event) {
  if (event.key === "Escape" && open.value) close({ restoreFocus: true });
}

watch(
  () => route.fullPath,
  () => {
    close();
    // Volver a medir cuando termine la transición de página
    setTimeout(onScroll, 300);
  },
);

function onScroll() {
  const overlay = document.querySelector("[data-nav-overlay]");
  // Basta con que asome cualquier parte de la sección para quitar el fondo
  overPhotos.value = !!overlay && overlay.getBoundingClientRect().bottom > 0;
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("jdm:stack-edge", playSymbols);
  // En la primera carga la página aún no está montada: medir cuando el router termine
  router.isReady().then(() => nextTick(onScroll));
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("jdm:stack-edge", playSymbols);
});
</script>

<template>
  <header
    :class="[
      'fixed inset-x-0 top-0 z-50 p-2 transition-colors duration-150',
      overPhotos ? 'bg-transparent' : 'bg-fondo',
    ]"
  >
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
        <RouterLink
          :to="{ name: 'home' }"
          class="ml-1 px-3 text-h3 font-extrabold whitespace-nowrap text-primario sm:ml-2 sm:text-logo xl:ml-8"
        >
          <span class="sr-only">{{ site.name }} — inicio</span>
          <span aria-hidden="true" class="whitespace-pre">{{ logoText }}</span>
        </RouterLink>

        <div class="relative xl:mr-8">
          <button
            ref="toggleRef"
            type="button"
            :class="[
              'grid size-10 shrink-0 place-items-center transition-colors duration-300',
              open ? 'bg-primario text-fondo' : 'text-primario hover:bg-primario hover:text-fondo',
            ]"
            :aria-expanded="open"
            aria-controls="menu-principal"
            @click="open = !open"
          >
            <span class="sr-only">{{ open ? "Cerrar menú" : "Abrir menú" }}</span>
            <!-- Mientras se baraja, el "+" se muestra como texto con símbolos al azar -->
            <span v-if="toggleScrambling" class="text-boton leading-none" aria-hidden="true">{{
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
              <span class="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-current" />
              <span class="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-current" />
            </span>
          </button>

          <!--
            Menú transparente: borde verde y una línea entre cada enlace.
            Baja en persiana desde el borde inferior del botón.
          -->
          <div
            id="menu-principal"
            :class="[
              'absolute top-full right-0 flex w-[calc(100vw-2rem)] flex-col overflow-hidden border border-primario bg-transparent sm:w-72',
              'transition-[clip-path] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]',
              open ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]',
            ]"
            :inert="!open"
          >
            <ul class="flex flex-col divide-y divide-primario border-b border-primario">
              <li v-for="(item, i) in site.nav" :key="item.label">
                <RouterLink
                  :to="item.to"
                  :aria-label="item.label"
                  @mouseenter="scrambleMenuItem(i)"
                  @focus="scrambleMenuItem(i)"
                  class="flex items-center justify-between gap-2 bg-transparent px-4 py-2.5 text-right text-boton text-primario transition-colors duration-200 ease-out hover:bg-primario hover:text-fondo focus-visible:-outline-offset-4"
                >
                  <!-- El "*" de la página activa va a la izquierda; el texto, a la derecha -->
                  <span class="w-3 shrink-0 text-center" aria-hidden="true">{{
                    isActive(item) ? "*" : ""
                  }}</span>
                  <span class="whitespace-pre" aria-hidden="true">{{ menuText[i] }}</span>
                </RouterLink>
              </li>
            </ul>
            <button
              type="button"
              :aria-label="`Copiar correo ${site.email}`"
              class="flex cursor-pointer items-center justify-end bg-acento px-4 py-2.5 text-right text-boton text-fondo focus-visible:-outline-offset-4 focus-visible:outline-fondo"
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
