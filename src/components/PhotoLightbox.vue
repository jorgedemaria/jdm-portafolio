<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import Lenis from 'lenis'
import ResponsiveImage from './ResponsiveImage.vue'
import { pauseSmoothScroll, resumeSmoothScroll } from '../composables/useSmoothScroll'
import { useReducedMotion } from '../composables/useReducedMotion'

/*
 * Galería a pantalla completa con la mecánica del stack de Inicio (ver PhotoStack): con el scroll,
 * cada foto sube desde abajo y se apoya sobre la anterior. Cada foto se ve completa, sobre crema.
 * Tiene su propio scroll (con la misma inercia del sitio) y abre en la foto elegida.
 */
const props = defineProps({
  photos: { type: Array, required: true },
  start: { type: Number, default: 0 },
})
const emit = defineEmits(['close'])

const reducedMotion = useReducedMotion()
// Mismo recorrido y curva que el stack de Inicio
const SEGMENT = 1.6
const MOVE = 0.8
const easeOutSine = (x) => Math.sin((x * Math.PI) / 2)
const clamp = (x) => Math.min(Math.max(x, 0), 1)

const wrapper = ref(null)
const content = ref(null)
const closeButton = ref(null)
const progress = ref(0)
const position = computed(() => progress.value * (props.photos.length - 1))

function arrival(i) {
  if (i === 0) return 1
  return easeOutSine(clamp((position.value - (i - 1)) / MOVE))
}
// Fotos ya apoyadas (más de la mitad del recorrido), como el contador del stack
const current = computed(() => props.photos.filter((_, i) => arrival(i) >= 0.5).length)
function photoStyle(i) {
  const a = arrival(i)
  if (reducedMotion.value) return { opacity: a }
  return { transform: `translate3d(0, ${(1 - a) * 100}svh, 0)` }
}

function onScroll() {
  const el = wrapper.value
  const max = el.scrollHeight - el.clientHeight
  progress.value = max > 0 ? el.scrollTop / max : 0
}
// Scroll que lleva a la foto i ya apoyada
const offsetOf = (i) => i * SEGMENT * wrapper.value.clientHeight
let lenis = null
function goTo(i) {
  const y = offsetOf(Math.min(Math.max(i, 0), props.photos.length - 1))
  if (lenis) lenis.scrollTo(y, { duration: 1.2 })
  else wrapper.value.scrollTo({ top: y, behavior: reducedMotion.value ? 'instant' : 'smooth' })
}

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
  // El único control es "cerrar": el foco se queda en él
  else if (event.key === 'Tab') event.preventDefault()
  else if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(event.key)) {
    event.preventDefault()
    goTo(Math.round(position.value) + 1)
  } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) {
    event.preventDefault()
    goTo(Math.round(position.value) - 1)
  }
}

let returnFocus = null
onMounted(async () => {
  returnFocus = document.activeElement
  pauseSmoothScroll()
  document.documentElement.style.overflow = 'hidden'
  document.addEventListener('keydown', onKeydown)
  await nextTick()
  wrapper.value.scrollTop = offsetOf(props.start)
  onScroll()
  if (!reducedMotion.value) {
    lenis = new Lenis({ wrapper: wrapper.value, content: content.value, lerp: 0.085, wheelMultiplier: 0.95, autoRaf: true })
  }
  closeButton.value?.focus({ preventScroll: true })
})
onBeforeUnmount(() => {
  lenis?.destroy()
  document.removeEventListener('keydown', onKeydown)
  document.documentElement.style.overflow = ''
  resumeSmoothScroll()
  returnFocus?.focus?.({ preventScroll: true })
})
</script>

<template>
  <div
    ref="wrapper"
    role="dialog"
    aria-modal="true"
    aria-label="Galería de fotos"
    class="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-fondo"
    data-lenis-prevent
    @scroll="onScroll"
  >
    <div ref="content" :style="{ height: `${100 + (photos.length - 1) * SEGMENT * 100}svh` }">
      <div class="sticky top-0 h-svh overflow-hidden">
        <!-- Cada foto sobre su propio fondo crema: al apoyarse tapa entera a la anterior -->
        <div
          v-for="(photo, i) in photos"
          :key="photo.src"
          class="absolute inset-0 bg-fondo will-change-transform"
          :style="photoStyle(i)"
        >
          <!-- Caja disponible entre las líneas de arriba y abajo; la foto entra completa (cqw/cqh) -->
          <div class="absolute inset-x-4 top-16 bottom-16 grid place-items-center [container-type:size] xl:inset-x-12">
            <div :style="{ width: `min(100cqw, 100cqh * ${photo.width / photo.height})` }">
              <ResponsiveImage v-bind="photo" :loading="Math.abs(i - start) < 2 ? 'eager' : 'lazy'" sizes="100vw" />
            </div>
          </div>
        </div>

        <!-- "cerrar" arriba y el contador abajo, en texto como el navbar -->
        <div class="absolute inset-x-0 top-0 px-2 pt-6 text-boton text-primario">
          <div class="mx-auto flex max-w-360 justify-end px-2">
            <button
              ref="closeButton"
              type="button"
              class="cursor-pointer decoration-acento decoration-2 underline-offset-4 hover:underline xl:mr-8"
              @click="emit('close')"
            >
              cerrar
            </button>
          </div>
        </div>
        <div class="absolute inset-x-0 bottom-0 px-2 pb-6 text-boton text-primario" aria-live="polite">
          <div class="mx-auto flex max-w-360 justify-end px-2">
            <p class="tabular-nums xl:mr-8">{{ current }} / {{ photos.length }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
