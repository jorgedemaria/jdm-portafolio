<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { site } from "../data/site";
import { introLeaving } from "../composables/useIntro";
import TypingCaret from "./TypingCaret.vue";

/*
 * Pantalla de entrada: el nombre aparece sílaba por sílaba y, cada vez, unas pocas sílabas
 * elegidas al azar pasan por caracteres aleatorios antes de fijarse.
 * Se mantiene ~2 s (o hasta que cargue la página, con un tope), sale de la misma
 * forma con otras sílabas al azar y la pantalla se recoge hacia arriba.
 * Un cursor de texto acompaña todo: parpadea un momento antes de escribir, queda fijo
 * mientras se escribe o se borra y parpadea mientras el nombre está quieto.
 */
const emit = defineEmits(["done"]);

// Tiempo que el nombre queda quieto y bien escrito antes de salir (o hasta que cargue la página)
const MIN_DURATION = 1300;
const MAX_WAIT = 4000;
const EXIT_DURATION = 700;
// Parpadeo del cursor solo, antes de empezar a escribir
const CARET_LEAD = 500;

// Desfase entre sílabas y tiempo que una sílaba elegida pasa mostrando caracteres al azar
const STAGGER = 90;
const SCRAMBLE = 600;
// La entrada es más pausada que la salida
const ENTER_STAGGER = 130;
const ENTER_SCRAMBLE = 900;
// Cuántas sílabas se desordenan en cada animación (mínimo y máximo)
const SCRAMBLED_MIN = 2;
const SCRAMBLED_MAX = 3;
// true: todas las sílabas se desordenan (prueba); false: solo SCRAMBLED_MIN–MAX al azar
const SCRAMBLE_ALL = true;
// Cada cuánto cambia el carácter al azar
const TICK = 55;
const CHARSET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ*#/[]";

// Letras del nombre y, para cada una, el índice de su sílaba (null en los espacios)
// La carita ":)" entra después del nombre, primero ":" y luego ")" (sin letras al azar)
const SMILEY = ":)";
const SMILEY_DELAY = 400;
const SMILEY_GAP = 350;

const target = [];
const syllableOf = [];
let syllableCount = 0;
site.nameSyllables.forEach((word, w) => {
  if (w > 0) {
    target.push(" ");
    syllableOf.push(null);
  }
  word.forEach((syllable) => {
    for (const char of syllable.toUpperCase()) {
      target.push(char);
      syllableOf.push(syllableCount);
    }
    syllableCount++;
  });
});
const smileySyllable = site.nameSyllables.flat().at(-1) === SMILEY ? syllableCount - 1 : -1;
const smileyChars = target.flatMap((_, i) => (syllableOf[i] === smileySyllable ? [i] : []));

const display = ref(target.map(() => " "));
// Cursor de texto (ver TypingCaret): 'idle' parpadea, 'typing' fijo, 'off' oculto
const caret = ref("off");
// Texto hasta el último carácter visible: define hasta dónde llega el bloque verde
const visibleText = computed(() => display.value.join("").trimEnd());
// Tamaño grande que siempre cabe en una línea: cada carácter de JetBrains Mono mide 0,6em
// (+0,34em del margen interno del bloque verde, igual que el del logo)
const fontSize = `min(6rem, calc((100vw - 2.5rem) / ${target.length * 0.6 + 0.34}))`;
const leaving = ref(false);

let timers = [];
let frame = 0;

const wait = (ms) => new Promise((resolve) => timers.push(setTimeout(resolve, ms)));
const randomChar = () => CHARSET[Math.floor(Math.random() * CHARSET.length)];

const pageLoaded = () =>
  document.readyState === "complete"
    ? Promise.resolve()
    : new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));

// Elige al azar qué sílabas se desordenan
function pickSyllables() {
  if (SCRAMBLE_ALL) return new Set(Array(syllableCount).keys());
  const count = SCRAMBLED_MIN + Math.floor(Math.random() * (SCRAMBLED_MAX - SCRAMBLED_MIN + 1));
  const all = [...Array(syllableCount).keys()];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return new Set(all.slice(0, count));
}

/*
 * Avanza sílaba por sílaba en orden (de izquierda a derecha, o al revés con `reverse`).
 * Cada sílaba arranca `stagger` ms después de la anterior; si fue elegida muestra caracteres
 * al azar durante `scrambleTime` ms. Ninguna se fija antes que la anterior, así el texto
 * se escribe (o se borra) de forma progresiva. Antes de fijarse muestra `initial`.
 */
function scramble({ initial, final, stagger = STAGGER, scrambleTime = SCRAMBLE, reverse = false }) {
  const chosen = pickSyllables();
  // En la entrada la carita va aparte, después del nombre
  const delaySmiley = !reverse && smileySyllable >= 0;
  const order = [...Array(syllableCount).keys()].filter((s) => !(delaySmiley && s === smileySyllable));
  if (reverse) order.reverse();

  const beginAt = [];
  const endAt = [];
  let previousEnd = -Infinity;
  order.forEach((s, k) => {
    beginAt[s] = k * stagger;
    const ready = chosen.has(s) ? beginAt[s] + scrambleTime : beginAt[s];
    endAt[s] = Math.max(ready, previousEnd + stagger);
    previousEnd = endAt[s];
  });
  const begin = (s) => beginAt[s];
  const end = (s) => endAt[s];
  const charEnd = {};
  if (delaySmiley) {
    smileyChars.forEach((i, n) => (charEnd[i] = previousEnd + SMILEY_DELAY + n * SMILEY_GAP));
  }
  const duration = Math.max(...endAt.filter((t) => t !== undefined), ...Object.values(charEnd));

  caret.value = "typing";
  return new Promise((resolve) => {
    const start = performance.now();
    let lastTick = -Infinity;

    function step(now) {
      const t = now - start;
      if (t - lastTick >= TICK || t >= duration) {
        lastTick = t;
        display.value = target.map((char, i) => {
          const s = syllableOf[i];
          if (s === null) return " ";
          if (i in charEnd) return t >= charEnd[i] ? final(i) : initial(i);
          if (t >= end(s)) return final(i);
          // Las elegidas se desordenan desde su turno; las demás esperan a que se fije la anterior
          if (t >= begin(s) && chosen.has(s)) return randomChar();
          return initial(i);
        });
      }
      if (t < duration) frame = requestAnimationFrame(step);
      else {
        caret.value = "idle";
        resolve();
      }
    }

    frame = requestAnimationFrame(step);
  });
}

onMounted(async () => {
  document.documentElement.style.overflow = "hidden";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) display.value = [...target];
  else {
    caret.value = "idle";
    await wait(CARET_LEAD);
    await scramble({
      initial: () => " ",
      final: (i) => target[i],
      stagger: ENTER_STAGGER,
      scrambleTime: ENTER_SCRAMBLE,
    });
  }

  await Promise.all([wait(MIN_DURATION), Promise.race([pageLoaded(), wait(MAX_WAIT)])]);

  // Salida: se borra al revés, de derecha a izquierda
  if (!reducedMotion) await scramble({ initial: (i) => target[i], final: () => " ", reverse: true });
  caret.value = "off";

  leaving.value = true;
  // Avisa al resto del sitio: empieza la secuencia de entrada (logo, menú, líneas)
  introLeaving.value = true;
  await wait(EXIT_DURATION);
  document.documentElement.style.overflow = "";
  emit("done");
});

onBeforeUnmount(() => {
  timers.forEach(clearTimeout);
  cancelAnimationFrame(frame);
  document.documentElement.style.overflow = "";
});
</script>

<template>
  <div
    :class="[
      'fixed inset-0 z-70 grid place-items-center bg-fondo px-5',
      'transition-[clip-path] duration-700 ease-[cubic-bezier(0.6,0,0.3,1)]',
      leaving ? '[clip-path:inset(0_0_100%_0)]' : '[clip-path:inset(0)]',
    ]"
    aria-hidden="true"
  >
    <!--
      El ancho completo queda reservado (invisible) para que el nombre no se mueva; el bloque
      verde solo llega hasta el último carácter visible: crece hacia la derecha al entrar y
      se achica hacia la izquierda al salir.
    -->
    <!-- prettier-ignore -->
    <p class="relative leading-none font-extrabold whitespace-pre text-fondo" :style="{ fontSize }"><span class="invisible block px-[0.17em] pt-[0.22em] pb-[0.11em]">{{ target.join("") }}</span><span v-if="visibleText || caret !== 'off'" class="absolute top-0 left-0 bg-primario px-[0.17em] pt-[0.22em] pb-[0.11em]">{{ visibleText }}<TypingCaret :state="caret" /></span></p>
  </div>
</template>
