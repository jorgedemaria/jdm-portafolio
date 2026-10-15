<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import ResponsiveImage from './ResponsiveImage.vue'
import { useScrollProgress } from '../composables/useScrollProgress'
import { useReducedMotion } from '../composables/useReducedMotion'
import { useScrambleText } from '../composables/useScrambleText'
import { menuOpen, menuBottom, gridColumns, MAX_GRID_COLUMNS } from '../composables/useMenu'
import { introLeaving, NAV_DURATION, LINES_DURATION } from '../composables/useIntro'

/*
 * Stack de fotos ligado al scroll: la sección se queda fija y cada foto
 * sube desde abajo y se apoya sobre la anterior. Al terminar, la página sigue.
 */
const props = defineProps({
  photos: { type: Array, required: true },
})

const root = ref(null)
const progress = useScrollProgress(root)
const reducedMotion = useReducedMotion()

// Scroll necesario para cada cambio de foto, en alturas de pantalla
const SEGMENT = 1.6
// Parte de cada tramo en la que la foto se mueve; el resto es pausa sobre la foto ya apoyada
const MOVE = 0.8
// Inercia: tiempo (ms) que tarda el stack en alcanzar la posición del scroll
const SMOOTHING = 140

// Responde desde el primer pixel de scroll y frena suave al apoyarse
const easeOutSine = (x) => Math.sin((x * Math.PI) / 2)
const clamp = (x) => Math.min(Math.max(x, 0), 1)

// El stack sigue al scroll con inercia, así un golpe de rueda no hace saltar la foto
const smoothProgress = ref(progress.value)
let frame = 0
let lastTime = 0

function follow(now) {
  const dt = now - lastTime
  lastTime = now
  const diff = progress.value - smoothProgress.value
  if (Math.abs(diff) < 0.0002) {
    smoothProgress.value = progress.value
    frame = 0
    return
  }
  smoothProgress.value += diff * (1 - Math.exp(-dt / SMOOTHING))
  frame = requestAnimationFrame(follow)
}

watch(progress, (value) => {
  if (reducedMotion.value) {
    smoothProgress.value = value
    return
  }
  if (!frame) {
    lastTime = performance.now()
    frame = requestAnimationFrame(follow)
  }
})

onBeforeUnmount(() => cancelAnimationFrame(frame))

// Posición en la secuencia: 0 = primera foto, n-1 = última
const position = computed(() => smoothProgress.value * (props.photos.length - 1))

// 0 = fuera (abajo), 1 = apoyada en el stack
function arrival(index) {
  if (index === 0) return 1
  return easeOutSine(clamp((position.value - (index - 1)) / MOVE))
}

const started = computed(() => progress.value > 0.003)

/*
 * Retícula de 2, 3 o 5 columnas según la pantalla: una línea en cada borde.
 * - Se recogen hacia arriba (ease-in-out, en cascada) al empezar el scroll.
 * - Con el menú abierto, el menú las empuja: empiezan debajo de él y se acortan.
 * - Nunca bajan más allá del borde superior de la foto 2.
 */
// Una línea en cada borde de columna: 3 en móvil, 4 en tablet chica y 6 desde 768 px
const gridLines = computed(() => gridColumns.value + 1)
const LINE_DURATION = 700
const LINE_STAGGER = 45
const PHOTO_GAP = 16 // separación mínima entre las líneas y la foto 2

const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)

// 1 = línea completa, 0 = recogida
/*
 * Entrada (ver useIntro): cuando sube la persiana de la intro, primero se arman el logo y
 * el botón; después bajan las líneas y al final aparecen "Desliza" y el contador.
 * Si se llega a Inicio sin intro, todo está visible desde el principio.
 */
const linesRevealed = ref(introLeaving.value)
const indicatorRevealed = ref(introLeaving.value)
let introTimers = []
if (!introLeaving.value) {
  const stopIntroWatch = watch(introLeaving, (leaving) => {
    if (!leaving) return
    stopIntroWatch()
    introTimers = [
      setTimeout(() => (linesRevealed.value = true), NAV_DURATION),
      setTimeout(() => (indicatorRevealed.value = true), NAV_DURATION + LINES_DURATION),
    ]
  })
}

// Líneas horizontales: tantas filas como para que las celdas sean casi cuadradas
const MAX_ROWS = 16
const H_FIRST = MAX_GRID_COLUMNS + 1 // índice de la primera horizontal en lineVisible
const gridRows = computed(() => {
  const columnWidth = gridBox.value.width / gridColumns.value
  if (!columnWidth) return 1
  return Math.min(Math.max(Math.round(gridBox.value.height / columnWidth), 1), MAX_ROWS)
})
const isUsed = (i) => (i < H_FIRST ? i < gridLines.value : i - H_FIRST <= gridRows.value)

const lineVisible = ref(Array(H_FIRST + MAX_ROWS + 1).fill(linesRevealed.value ? 1 : 0))
const lineTarget = () => (started.value || !linesRevealed.value ? 0 : 1)

let lineFrame = 0
function animateLines() {
  cancelAnimationFrame(lineFrame)
  const from = [...lineVisible.value]
  const to = from.map((f, i) => (isUsed(i) ? lineTarget() : f))
  if (reducedMotion.value) {
    lineVisible.value = to
    return
  }
  // Las líneas que se mueven entran en cascada: verticales de izquierda a derecha,
  // después horizontales de arriba abajo
  const moving = to.map((t, i) => (t !== from[i] ? i : -1)).filter((i) => i >= 0)
  const start = performance.now()
  function step(now) {
    lineVisible.value = from.map((f, i) => {
      const order = moving.indexOf(i)
      if (order === -1) return f
      const x = Math.min(Math.max((now - start - order * LINE_STAGGER) / LINE_DURATION, 0), 1)
      return f + (to[i] - f) * easeInOut(x)
    })
    const done = now - start >= LINE_DURATION + moving.length * LINE_STAGGER
    if (!done) lineFrame = requestAnimationFrame(step)
  }
  lineFrame = requestAnimationFrame(step)
}
watch([started, linesRevealed], animateLines)

// Tope que impone la foto 2: medido sobre el contenedor de las líneas
const gridEl = ref(null)
const gridBox = ref({ top: 0, height: 1, width: 0 })
function measureGridBox() {
  const box = gridEl.value?.getBoundingClientRect()
  if (box) gridBox.value = { top: box.top, height: box.height, width: box.width }
}
onMounted(() => {
  measureGridBox()
  window.addEventListener('resize', measureGridBox)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', measureGridBox)
  cancelAnimationFrame(lineFrame)
  introTimers.forEach(clearTimeout)
})

// Con el menú horizontal abierto las líneas empiezan MENU_GAP px debajo de él
// (el mismo espacio que hay entre el logo y el menú)
const MENU_GAP = 24
const linesOffset = computed(() =>
  menuOpen.value ? Math.max(0, menuBottom.value + MENU_GAP - gridBox.value.top) : 0,
)

const photoLimit = computed(() => {
  if (props.photos.length < 2) return 1
  // La foto 2 está a (1 - llegada) de una pantalla de distancia desde arriba
  const photoTop = (1 - arrival(1)) * window.innerHeight
  const top = gridBox.value.top + linesOffset.value
  const height = Math.max(gridBox.value.height - linesOffset.value, 1)
  return Math.min(Math.max((photoTop - PHOTO_GAP - top) / height, 0), 1)
})

const lineScale = (i) => Math.min(lineVisible.value[i], photoLimit.value)
// Las horizontales se recogen hacia la izquierda; las que quedarían sobre la foto 2 se ocultan
const hLineScale = (j) => (j / gridRows.value > photoLimit.value + 0.001 ? 0 : lineVisible.value[H_FIRST + j])

// Avisa cuando empieza el scroll del stack y cuando se vuelve arriba del todo;
// el navbar lo usa para barajar el logo y el botón, igual que "Desliza" y el contador
const STACK_EDGE_EVENT = 'jdm:stack-edge'
watch(started, () => window.dispatchEvent(new CustomEvent(STACK_EDGE_EVENT)))

const current = computed(() => props.photos.filter((_, i) => arrival(i) >= 0.5).length)

// Indicador inferior: "Desliza" a la izquierda (se desarma al empezar a desplazarse)
// y el contador a la derecha. Ambos cambian con el mismo efecto de letras al azar de la intro.
const SCRAMBLE_TIMING = { stagger: 30, scramble: 240, tick: 45 }
// "Desliza" guiña cada 5 s (se vuelve carita feliz y regresa) mientras no se desplace;
// el contador se vuelve carita al pasar el cursor por encima
const SMILEY = ':)'
const WINK_EVERY = 5000
const WINK_HOLD = 1400
const hintWink = ref(false)
const counterHover = ref(false)
const hintTarget = computed(() =>
  started.value || !indicatorRevealed.value ? '' : hintWink.value ? SMILEY : 'Desliza',
)
let winkTimer
let winkBack
function stopWink() {
  clearInterval(winkTimer)
  clearTimeout(winkBack)
  hintWink.value = false
}
watch(
  () => indicatorRevealed.value && !started.value,
  (waiting) => {
    stopWink()
    if (!waiting || reducedMotion.value) return
    winkTimer = setInterval(() => {
      hintWink.value = true
      winkBack = setTimeout(() => (hintWink.value = false), WINK_HOLD)
    }, WINK_EVERY)
  },
  { immediate: true },
)
onBeforeUnmount(stopWink)
const counterTarget = computed(() =>
  !indicatorRevealed.value ? '' : counterHover.value ? SMILEY : `${current.value} / ${props.photos.length}`,
)
const hint = useScrambleText(
  hintTarget,
  SCRAMBLE_TIMING,
)
// El contador se desordena completo, también el "/ 5"
const counter = useScrambleText(
  counterTarget,
  { ...SCRAMBLE_TIMING, keepUnchanged: false },
)

// El bloque verde se achica o agranda suave al ancho del texto final (medido en una copia
// invisible), en vez de saltar letra a letra mientras se baraja
const hintMeasure = ref(null)
const counterMeasure = ref(null)
const hintWidth = ref(null)
const counterWidth = ref(null)
const counterFullMeasure = ref(null)
const counterFull = ref(null)
function measureBlocks() {
  hintWidth.value = hintMeasure.value?.offsetWidth ?? null
  counterWidth.value = counterMeasure.value?.offsetWidth ?? null
  counterFull.value = counterFullMeasure.value?.offsetWidth ?? null
}
watch([hintTarget, counterTarget, current], () => nextTick(measureBlocks))
onMounted(() => {
  document.fonts?.ready.then(measureBlocks)
  window.addEventListener('resize', measureBlocks)
})
onBeforeUnmount(() => window.removeEventListener('resize', measureBlocks))

function photoStyle(index) {
  const a = arrival(index)
  if (reducedMotion.value) return { opacity: a }
  return {
    transform: `translate3d(0, ${(1 - a) * 100}svh, 0)`,
  }
}
</script>

<template>
  <div ref="root" class="relative" :style="{ height: `${100 + (photos.length - 1) * SEGMENT * 100}svh` }">
    <div class="sticky top-0 h-svh overflow-hidden">
      <div
        v-for="(photo, i) in photos"
        :key="photo.src"
        class="absolute inset-0 will-change-transform"
        :style="photoStyle(i)"
      >
        <ResponsiveImage
          v-bind="photo"
          fill
          :loading="i === 0 ? 'eager' : 'lazy'"
          sizes="100vw"
        />
      </div>

      <!--
        Retícula (2, 3 o 5 columnas) entre el logo y el borde del botón del menú, con aire
        respecto del navbar y de "Desliza" y el contador. Va desde debajo del logo hasta
        encima de "Desliza". Ver lineScale(): se recogen al hacer scroll, bajo el menú abierto
        y delante de la foto 2.
      -->
      <div
        class="pointer-events-none absolute inset-x-0 top-20 bottom-18 px-2 sm:top-22 lg:top-24"
        aria-hidden="true"
      >
        <div class="mx-auto h-full max-w-360 px-2">
          <div
            ref="gridEl"
            class="relative ml-4 h-full sm:ml-5 xl:mr-8 xl:ml-11"
          >
            <!-- El menú las empuja hacia abajo (misma duración y curva que la persiana) -->
            <div
              class="absolute inset-x-0 bottom-0 transition-[top] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]"
              :style="{ top: `${linesOffset}px` }"
            >
            <!--
              Velo oscuro solo fuera de la retícula: una sombra enorme alrededor de su rectángulo.
              Se desvanece apenas empieza el scroll y vuelve arriba del todo.
            -->
            <div
              :class="[
                'absolute inset-0 shadow-[0_0_0_200vmax_rgb(16_16_16/0.1)] transition-opacity duration-700 ease-in-out',
                started ? 'opacity-0' : 'opacity-100',
              ]"
            />
            <!-- La última línea queda alineada con el borde derecho del botón del menú -->
            <span
              v-for="i in gridLines"
              :key="i"
              class="absolute top-0 h-full w-px origin-top bg-primario"
              :style="{
                left: `calc(${((i - 1) / gridColumns) * 100}% - ${i === gridLines ? 1 : 0}px)`,
                transform: `scaleY(${lineScale(i - 1)})`,
              }"
            />
            <!-- Horizontales: la primera arriba y la última abajo, donde terminan las verticales -->
            <span
              v-for="j in gridRows + 1"
              :key="`h${j}`"
              class="absolute left-0 h-px w-full origin-left bg-primario"
              :style="{
                top: `calc(${((j - 1) / gridRows) * 100}% - ${j === gridRows + 1 ? 1 : 0}px)`,
                transform: `scaleX(${hLineScale(j - 1)})`,
              }"
            />
            </div>
          </div>
        </div>
      </div>

      <!-- Mismos márgenes que el navbar: "Desliza" alineado con el logo; el final del contador, con el borde del botón del menú (y la última línea) -->
      <div
        class="absolute inset-x-0 bottom-0 px-2 pb-6 text-cuerpo text-fondo"
        aria-hidden="true"
      >
        <!-- Cada texto en un bloque verde; el bloque empieza en la primera línea y termina en la última -->
        <div class="mx-auto flex max-w-360 items-end justify-between px-2">
          <div class="ml-1 px-3 sm:ml-2 xl:ml-8">
            <p
              v-if="hint"
              class="block-text overflow-hidden bg-primario px-1.5 py-0.5 whitespace-pre"
              :style="{ width: hintWidth ? `${hintWidth}px` : null }"
            >{{ hint }}</p>
          </div>
          <div
            v-if="counter"
            class="flex justify-end xl:mr-8"
            :style="{ minWidth: counterFull ? `${counterFull}px` : null }"
            @pointerenter="counterHover = true"
            @pointerleave="counterHover = false"
          >
            <p
              class="block-text overflow-hidden bg-primario px-1.5 py-0.5 whitespace-pre tabular-nums"
              :style="{ width: counterWidth ? `${counterWidth}px` : null }"
            >{{ counter }}</p>
          </div>
          <!-- Copias invisibles con el texto final, para medir el ancho de cada bloque -->
          <span ref="hintMeasure" class="invisible absolute px-1.5 whitespace-pre">{{ hintTarget }}</span>
          <span ref="counterMeasure" class="invisible absolute px-1.5 whitespace-pre tabular-nums">{{ counterTarget }}</span>
          <span ref="counterFullMeasure" class="invisible absolute px-1.5 whitespace-pre tabular-nums">{{ current }} / {{ photos.length }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.block-text {
  transition: width 350ms cubic-bezier(0.6, 0, 0.3, 1);
}
@media (prefers-reduced-motion: reduce) {
  .block-text {
    transition: none;
  }
}
</style>
