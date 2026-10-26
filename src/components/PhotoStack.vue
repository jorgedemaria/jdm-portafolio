<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import ResponsiveImage from './ResponsiveImage.vue'
import { useScrollProgress, stableViewportHeight } from '../composables/useScrollProgress'
import { useReducedMotion } from '../composables/useReducedMotion'
import { useScrambleText } from '../composables/useScrambleText'
import { logoShrink, returningHome } from '../composables/useMenu'
import { introLeaving, NAV_DURATION, INDICATOR_DELAY } from '../composables/useIntro'
import { usePagingStops } from '../composables/usePaging'

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

// Responde desde el primer pixel de scroll y frena suave al apoyarse
const easeOutSine = (x) => Math.sin((x * Math.PI) / 2)
const clamp = (x) => Math.min(Math.max(x, 0), 1)

// Posición en la secuencia: 0 = primera foto, n-1 = última. La inercia la da el scroll suave
// del sitio (useSmoothScroll)
const position = computed(() => stackProgress.value * (props.photos.length - 1))

/*
 * Teléfono y tablet: como en el lightbox, cada foto sube entera, en su proporción real, centrada
 * sobre su propio fondo crema (al apoyarse tapa a la anterior). Desde 1024 px, a pantalla completa
 */
const narrow = ref(false)
const viewport = ref({ width: 0, height: 0 })
let narrowQuery
const measureViewport = () => {
  narrow.value = narrowQuery.matches
  viewport.value = { width: window.innerWidth, height: stableViewportHeight() }
}
onMounted(() => {
  narrowQuery = window.matchMedia('(width < 64rem)')
  measureViewport()
  narrowQuery.addEventListener('change', measureViewport)
  window.addEventListener('resize', measureViewport)
})
onBeforeUnmount(() => {
  narrowQuery?.removeEventListener('change', measureViewport)
  window.removeEventListener('resize', measureViewport)
})

// 0 = fuera (abajo), 1 = apoyada en el stack
function arrival(index) {
  if (index === 0) return 1
  return easeOutSine(clamp((position.value - (index - 1)) / MOVE))
}

/*
 * Los primeros scrolls solo achican el nombre gigante del navbar (logoShrink px): el stack espera
 * quieto, con la primera foto, y recién después empieza a subir la segunda. Para eso el recorrido
 * se alarga en ese tramo y el progreso del stack descuenta lo que ya se usó en el logo.
 */
const wait = computed(() => logoShrink.value)
const travel = computed(() => viewport.value.height * (props.photos.length - 1) * SEGMENT)
const stackProgress = computed(() => {
  if (!travel.value) return progress.value
  return clamp((progress.value * (travel.value + wait.value) - wait.value) / travel.value)
})

const rootStyle = computed(() => ({
  height: `${viewport.value.height * (1 + (props.photos.length - 1) * SEGMENT) + wait.value}px`,
}))

const started = computed(() => stackProgress.value > 0.003)

/*
 * Paso por gestos (ver usePaging): cada gesto lleva a la foto siguiente o a la anterior ya
 * apoyada. El primer gesto achica el nombre gigante y a la vez trae la 2ª foto
 */
// Paradas (px desde que empieza el stack): arriba de todo, cada foto apoyada
function stops() {
  const segment = viewport.value.height * SEGMENT
  return [-wait.value, ...props.photos.slice(1).map((_, i) => (i + MOVE) * segment)]
}
usePagingStops(() => {
  if (!root.value) return null
  const start = root.value.getBoundingClientRect().top + window.scrollY + wait.value
  return { stops: stops().map((y) => start + y), end: start + travel.value }
})

/*
 * Entrada (ver useIntro): cuando sube la persiana de la intro, primero se arma el navbar y al
 * final aparecen "Desliza" y el contador. Si se llega a Inicio sin intro, ya están visibles.
 */
const indicatorRevealed = ref(introLeaving.value)
let introTimer = 0
if (!introLeaving.value) {
  const stopIntroWatch = watch(introLeaving, (leaving) => {
    if (!leaving) return
    stopIntroWatch()
    introTimer = setTimeout(() => (indicatorRevealed.value = true), NAV_DURATION + INDICATOR_DELAY)
  })
}
onBeforeUnmount(() => clearTimeout(introTimer))

// La primera foto aparece como persiana desde el navbar hacia abajo, después de que entraron los
// elementos del navbar (NAV_DURATION después de que el logo terminó de escribirse, ver useIntro).
// Al volver a Inicio desde otra página baja igual, a la par de la franja del navbar (ver AppNav).
// Sin esa entrada está visible desde el principio
const firstShown = ref(introLeaving.value && !returningHome.value)
let firstTimer = 0
// Dos cuadros: el primero pinta la foto recogida, así la transición tiene desde dónde partir
if (returningHome.value)
  onMounted(() => requestAnimationFrame(() => requestAnimationFrame(() => (firstShown.value = true))))
if (!introLeaving.value) {
  const stopFirstWatch = watch(introLeaving, (leaving) => {
    if (!leaving) return
    stopFirstWatch()
    firstTimer = setTimeout(() => (firstShown.value = true), NAV_DURATION)
  })
}
onBeforeUnmount(() => clearTimeout(firstTimer))
// Al volver arriba de Inicio desde más abajo (ver returnHome en AppNav): se recoge sin transición
// (está fuera de pantalla) y baja de nuevo ya arriba
const firstInstant = ref(false)
watch(returningHome, (back) => {
  if (!back) return
  firstInstant.value = true
  firstShown.value = false
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      firstInstant.value = false
      firstShown.value = true
    }),
  )
})

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


function photoStyle(index) {
  const a = arrival(index)
  if (reducedMotion.value) return { opacity: a }
  // La siguiente empuja a la anterior hacia arriba, a la par (como un carrusel)
  const pushed = index < props.photos.length - 1 ? arrival(index + 1) : 0
  return { transform: `translate3d(0, ${(1 - a - pushed) * viewport.value.height}px, 0)` }
}

</script>

<template>
  <div ref="root" class="relative" :style="rootStyle">
    <!-- Del alto estable en px (ver stableViewportHeight) -->
    <div class="sticky top-0 h-lvh overflow-hidden" :style="viewport.height ? { height: `${viewport.height}px` } : null">
      <div
        v-for="(photo, i) in photos"
        :key="photo.src"
        :class="[
          // Las fotos ocupan el área bajo el fondo del navbar (--cabecera-viva): cada una sube y se
          // apoya contra él. En teléfono y tablet, sobre su propio fondo crema (ver abajo)
          'absolute inset-x-0 top-(--cabecera-viva,0px) bottom-0',
          narrow && 'bg-fondo',
          'will-change-transform',
          i === 0 && [
            !firstInstant && 'transition-[clip-path] duration-1000 ease-(--ease-persiana)',
            firstShown ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]',
          ],
        ]"
        :style="photoStyle(i)"
      >
        <!--
          Teléfono y tablet, como el lightbox: en la caja disponible (sobre la franja de "Desliza"),
          a todo el ancho y en su proporción; si es más alta que la caja (las verticales), se
          recorta arriba y abajo según su punto de foco
        -->
        <div v-if="narrow" class="absolute inset-x-0 top-0 bottom-10 grid place-items-center [container-type:size]">
          <div class="w-full" :style="{ height: `min(100cqh, 100cqw * ${photo.height / photo.width})` }">
            <ResponsiveImage v-bind="photo" fill :loading="i === 0 ? 'eager' : 'lazy'" sizes="100vw" />
          </div>
        </div>
        <ResponsiveImage v-else v-bind="photo" fill :loading="i === 0 ? 'eager' : 'lazy'" sizes="100vw" />
      </div>


      <!--
        "Desliza" y el contador en primario sobre una franja crema de lado a lado: "Desliza"
        alineado con el logo y el contador con el borde derecho de la retícula. La franja entra
        con ellos, como persiana desde abajo
      -->
      <!-- Sobre el borde visible: con las barras del navegador a la vista, la parte fija sigue debajo -->
      <div
        :class="[
          'absolute inset-x-0 bottom-0 bg-fondo px-2 py-2 text-boton text-ui transition-[clip-path] duration-500 ease-(--ease-persiana)',
          indicatorRevealed ? '[clip-path:inset(0)]' : '[clip-path:inset(100%_0_0_0)]',
        ]"
        :style="{ bottom: `max(0px, calc(${viewport.height}px - 100dvh))` }"
        aria-hidden="true"
      >
        <!-- En la retícula: "Desliza" en la 1ª columna y el contador en la 6ª (en el teléfono, a la derecha) -->
        <div class="page grid grid-cols-2 items-end md:grid-cols-6 md:gap-x-6 lg:gap-x-10">
          <!-- min-h: la fila mide lo mismo aunque los textos aún estén vacíos -->
          <p class="min-h-lh whitespace-pre">{{ hint }}</p>
          <p
            class="col-start-2 min-h-lh justify-self-end whitespace-pre tabular-nums md:col-start-6 md:justify-self-start"
            @pointerenter="counterHover = true"
            @pointerleave="counterHover = false"
          >{{ counter }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

