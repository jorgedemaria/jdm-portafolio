<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import ResponsiveImage from './ResponsiveImage.vue'
import { useScrollProgress, smallViewportHeight } from '../composables/useScrollProgress'
import { useReducedMotion } from '../composables/useReducedMotion'
import { useScrambleText } from '../composables/useScrambleText'
import { logoShrink } from '../composables/useMenu'
import { introLeaving, NAV_DURATION, INDICATOR_DELAY } from '../composables/useIntro'

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
 * Teléfono y tablet: como la primera foto del detalle de un proyecto, cada foto llega a
 * pantalla completa y, al seguir el scroll, su marco se achica (anclado arriba, el borde de
 * abajo sube) hasta la proporción real de la foto, que termina completa a todo el ancho.
 * Recién entonces sube la siguiente. El achique va 1:1 con el scroll; al achicarse la última,
 * la página sigue pegada a su borde de abajo, sin hueco.
 */
const narrow = ref(false)
const viewport = ref({ width: 0, height: 0 })
let narrowQuery
const measureViewport = () => {
  narrow.value = narrowQuery.matches
  viewport.value = { width: window.innerWidth, height: smallViewportHeight() }
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
const shrinkMode = computed(() => narrow.value && !reducedMotion.value && viewport.value.height > 0)

// Scroll (px) que achica cada foto: lo que le sobra a la pantalla respecto de su alto real.
// Si ya casi la llena, no se achica (igual que en el detalle)
const shrinkDistance = computed(() => {
  const { width, height } = viewport.value
  return props.photos.map((p) => {
    const full = (width * p.height) / p.width
    return full < height * 0.97 ? height - full : 0
  })
})
// Scroll (px) de la llegada de cada foto: lo que sube, desde el borde de abajo de la anterior
// ya achicada hasta arriba. Va 1:1 con el scroll, como el achique, así el stack sigue al dedo
const arriveDistance = computed(() =>
  shrinkDistance.value.map((_, i) => (i === 0 ? 0 : viewport.value.height - shrinkDistance.value[i - 1])),
)
const shrinkTotal = computed(() =>
  [...shrinkDistance.value, ...arriveDistance.value].reduce((sum, d) => sum + d, 0),
)

// Por foto: llegada (0 abajo → 1 apoyada) y achique (0 pantalla completa → 1 alto real),
// en orden: achique de la 1, llegada de la 2, achique de la 2…
const timeline = computed(() => {
  const scrolled = stackProgress.value * shrinkTotal.value
  let at = 0
  return props.photos.map((_, i) => {
    let arrive = 1
    if (i > 0) {
      arrive = clamp((scrolled - at) / arriveDistance.value[i])
      at += arriveDistance.value[i]
    }
    const d = shrinkDistance.value[i]
    const shrink = d ? clamp((scrolled - at) / d) : 0
    at += d
    return { arrive, shrink, height: viewport.value.height - d * shrink }
  })
})

// 0 = fuera (abajo), 1 = apoyada en el stack
function arrival(index) {
  if (index === 0) return 1
  if (shrinkMode.value) return timeline.value[index].arrive
  return easeOutSine(clamp((position.value - (index - 1)) / MOVE))
}

// Alto del recorrido: el de siempre o, en teléfono y tablet, pantalla + llegadas + achiques.
// La parte fija mide una pantalla pero la última foto termina en su alto real: un margen
// negativo sube la página esa diferencia, para que siga justo donde termina la foto
/*
 * Los primeros scrolls solo achican el nombre gigante del navbar (logoShrink px): el stack espera
 * quieto, con la primera foto, y recién después empieza a subir la segunda. Para eso el recorrido
 * se alarga en ese tramo y el progreso del stack descuenta lo que ya se usó en el logo.
 * En teléfono y tablet, mientras espera, la foto sube pegada a la franja crema (ver LIFT): se
 * desliza como un scroll normal, sin descubrirse por arriba ni dejar asomar la siguiente.
 */
const wait = computed(() => logoShrink.value)
// Lo que le falta a la franja crema para llegar a su alto final (--cabecera-chica, lo mide AppNav)
const LIFT = 'var(--cabecera-viva, 0px) - var(--cabecera-chica, 0px)'
const travel = computed(() =>
  shrinkMode.value ? shrinkTotal.value : viewport.value.height * (props.photos.length - 1) * SEGMENT,
)
const stackProgress = computed(() => {
  if (!travel.value) return progress.value
  return clamp((progress.value * (travel.value + wait.value) - wait.value) / travel.value)
})

const rootStyle = computed(() => {
  if (!shrinkMode.value)
    return { height: `calc(${100 + (props.photos.length - 1) * SEGMENT * 100}svh + ${wait.value}px)` }
  return {
    height: `${viewport.value.height + shrinkTotal.value + wait.value}px`,
    marginBottom: `${-shrinkDistance.value.at(-1)}px`,
  }
})

const started = computed(() => stackProgress.value > 0.003)

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
// Sin esa entrada está visible desde el principio
const firstShown = ref(introLeaving.value)
let firstTimer = 0
if (!introLeaving.value) {
  const stopFirstWatch = watch(introLeaving, (leaving) => {
    if (!leaving) return
    stopFirstWatch()
    firstTimer = setTimeout(() => (firstShown.value = true), NAV_DURATION)
  })
}
onBeforeUnmount(() => clearTimeout(firstTimer))

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
  if (shrinkMode.value) {
    // Una foto ya tapada por la siguiente se oculta: al achicarse la de encima no asoma debajo
    const covered = index < props.photos.length - 1 && timeline.value[index + 1].arrive === 1
    // Sube pegada al borde de abajo de la anterior (ya achicada), sin hueco entre ambas
    const start = index > 0 ? timeline.value[index - 1].height : viewport.value.height
    return {
      bottom: 'auto',
      height: `${timeline.value[index].height}px`,
      transform: `translate3d(0, calc(${(1 - a) * start}px + ${LIFT}), 0)`,
      visibility: covered ? 'hidden' : null,
    }
  }
  return {
    transform: `translate3d(0, ${(1 - a) * 100}svh, 0)`,
  }
}

</script>

<template>
  <div ref="root" class="relative" :style="rootStyle">
    <div class="sticky top-0 h-svh overflow-hidden">
      <div
        v-for="(photo, i) in photos"
        :key="photo.src"
        :class="[
          // Desde 1024 px las fotos ocupan el área bajo el fondo del navbar (--cabecera-viva): cada
          // una sube y se apoya contra él, no contra el borde de la pantalla. En el stack de
          // teléfono y tablet (fotos que se achican) ocupan la pantalla completa
          shrinkMode ? 'absolute inset-0' : 'absolute inset-x-0 top-(--cabecera-viva,0px) bottom-0',
          'will-change-transform',
          i === 0 && [
            'transition-[clip-path] duration-1000 ease-[cubic-bezier(0.6,0,0.3,1)]',
            firstShown ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]',
          ],
        ]"
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
        "Desliza" y el contador en texto crema sobre la foto, como el menú: "Desliza" alineado con
        el logo y el contador con el borde derecho de la retícula
      -->
      <div class="absolute inset-x-0 bottom-0 px-2 pb-6 text-boton text-fondo" aria-hidden="true">
        <div class="mx-auto flex max-w-360 items-end justify-between px-2">
          <p class="whitespace-pre xl:ml-8">{{ hint }}</p>
          <p
            class="whitespace-pre tabular-nums xl:mr-8"
            @pointerenter="counterHover = true"
            @pointerleave="counterHover = false"
          >{{ counter }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

