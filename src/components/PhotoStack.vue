<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import ResponsiveImage from './ResponsiveImage.vue'
import { useScrollProgress } from '../composables/useScrollProgress'
import { useReducedMotion } from '../composables/useReducedMotion'
import { useScrambleText } from '../composables/useScrambleText'

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

// Avisa cuando empieza el scroll del stack y cuando se vuelve arriba del todo;
// el navbar lo usa para barajar el logo y el botón, igual que "Desliza" y el contador
const STACK_EDGE_EVENT = 'jdm:stack-edge'
watch(started, () => window.dispatchEvent(new CustomEvent(STACK_EDGE_EVENT)))

const current = computed(() => props.photos.filter((_, i) => arrival(i) >= 0.5).length)

// Indicador inferior: "Desliza" a la izquierda (se desarma al empezar a desplazarse)
// y el contador a la derecha. Ambos cambian con el mismo efecto de letras al azar de la intro.
const SCRAMBLE_TIMING = { stagger: 30, scramble: 240, tick: 45 }
const hint = useScrambleText(
  computed(() => (started.value ? '' : 'Desliza')),
  SCRAMBLE_TIMING,
)
// El contador se desordena completo, también el "/ 5"
const counter = useScrambleText(
  computed(() => `${current.value} / ${props.photos.length}`),
  { ...SCRAMBLE_TIMING, keepUnchanged: false },
)

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

      <!-- Mismos márgenes que el navbar: "Desliza" alineado con el logo, el contador con el botón del menú -->
      <div
        class="absolute inset-x-0 bottom-0 px-2 pb-6 text-cuerpo text-fondo mix-blend-difference"
        aria-hidden="true"
      >
        <div class="mx-auto flex max-w-360 items-end justify-between px-2">
          <p class="ml-1 px-3 whitespace-pre sm:ml-2 xl:ml-8">{{ hint }}</p>
          <p class="whitespace-pre tabular-nums xl:mr-8">{{ counter }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
