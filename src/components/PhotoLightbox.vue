<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { easePersiana } from '../composables/usePersiana'
import Lenis from 'lenis'
import ResponsiveImage from './ResponsiveImage.vue'
import { pauseSmoothScroll, resumeSmoothScroll } from '../composables/useSmoothScroll'
import { useReducedMotion } from '../composables/useReducedMotion'
import { useFocusTrap } from '../composables/useFocusTrap'

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
// Mismo recorrido que el stack de Inicio
const SEGMENT = 1.6
// La foto sigue al scroll sin pausa ni curva propia; la curva la pone el paso con las flechas
// (ease in-out): así sube y baja a la misma velocidad
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)
const clamp = (x) => Math.min(Math.max(x, 0), 1)

const wrapper = ref(null)
const content = ref(null)
const closeButton = ref(null)
const progress = ref(0)
const position = computed(() => progress.value * (props.photos.length - 1))

function arrival(i) {
  if (i === 0) return 1
  return clamp(position.value - (i - 1))
}
// Fotos ya apoyadas (más de la mitad del recorrido), como el contador del stack
const current = computed(() => props.photos.filter((_, i) => arrival(i) >= 0.5).length)
function photoStyle(i) {
  const a = arrival(i)
  if (reducedMotion.value) return { opacity: a }
  // Como el stack: la siguiente empuja a la anterior hacia arriba, a la par (vertical push)
  const pushed = i < props.photos.length - 1 ? arrival(i + 1) : 0
  return { transform: `translate3d(0, ${(1 - a - pushed) * 100}svh, 0)` }
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
  if (lenis) lenis.scrollTo(y, { duration: 1, easing: easeInOut })
  else wrapper.value.scrollTo({ top: y, behavior: reducedMotion.value ? 'instant' : 'smooth' })
}

// Foto apoyada en este momento (0 = la primera): las flechas no van más allá de los extremos
const at = computed(() => Math.round(position.value))

/*
 * Como el stack: cada gesto (rueda, trackpad o dedo) pasa exactamente una foto, con la animación de
 * las flechas. Mientras dura no se cuenta otro; después, la inercia del trackpad (eventos que van
 * frenando) tampoco, pero sí un gesto nuevo o la rueda que se sigue girando
 */
let busyUntil = 0
let gestureEnd = 0
let lastDelta = 0
function step(dir) {
  if (performance.now() < busyUntil) return
  goTo(at.value + dir)
  busyUntil = performance.now() + 1000
}
// En captura, antes que el scroll suave del lightbox (Lenis). ctrlKey: zoom del navegador
function onWheel(event) {
  if (!event.deltaY || event.ctrlKey || reducedMotion.value) return
  event.preventDefault()
  event.stopImmediatePropagation()
  const delta = Math.abs(event.deltaY)
  const fresh = delta >= 15 && delta >= lastDelta
  lastDelta = delta
  const now = performance.now()
  if (now > gestureEnd || fresh) step(Math.sign(event.deltaY))
  gestureEnd = now + 250
}
let touchY = 0
function onTouchStart(event) {
  touchY = event.touches[0].clientY
}
function onTouchMove(event) {
  // Con dos dedos es zoom del navegador; con uno, la foto no sigue al dedo: pasa al soltar
  if (event.touches.length === 1 && !reducedMotion.value) event.preventDefault()
}
function onTouchEnd(event) {
  const dy = touchY - event.changedTouches[0].clientY
  if (Math.abs(dy) > 30 && !reducedMotion.value) step(Math.sign(dy))
}

/*
 * Al pasar de foto (flechas, teclado o scroll), la flecha de esa dirección "rueda" (text roll): el
 * carácter sale como persiana y entra su copia por el otro lado. ↑ hacia arriba, ↓ hacia abajo
 */
const rollEls = {}
watch(current, (now, before) => {
  const el = rollEls[now > before ? 1 : -1]
  if (!el || reducedMotion.value) return
  const frames = now > before ? ['translateY(-50%)', 'translateY(0)'] : ['translateY(0)', 'translateY(-50%)']
  el.animate(frames.map((transform) => ({ transform })), { duration: 500, easing: easePersiana() })
})
// El foco del teclado se queda en los controles del lightbox (cerrar y las flechas)
const trapOn = ref(false)
useFocusTrap(wrapper, trapOn)

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
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
  wrapper.value.addEventListener('wheel', onWheel, { passive: false, capture: true })
  wrapper.value.addEventListener('touchstart', onTouchStart, { passive: true })
  wrapper.value.addEventListener('touchmove', onTouchMove, { passive: false })
  wrapper.value.addEventListener('touchend', onTouchEnd, { passive: true })
  closeButton.value?.focus({ preventScroll: true })
  trapOn.value = true
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
        <!-- Cada foto sobre su propio fondo crema; al llegar empuja a la anterior hacia arriba (ver photoStyle) -->
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

        <!-- "cerrar" arriba; abajo las flechas y el contador, en texto como el navbar -->
        <div class="absolute inset-x-0 top-0 px-2 pt-6 text-boton text-ui">
          <div class="mx-auto flex max-w-360 justify-end px-2">
            <button
              ref="closeButton"
              type="button"
              class="cursor-pointer decoration-linea decoration-2 underline-offset-4 hover:underline xl:mr-8"
              @click="emit('close')"
            >
              cerrar
            </button>
          </div>
        </div>
        <div class="absolute inset-x-0 bottom-0 px-2 pb-6 text-boton text-ui">
          <div class="mx-auto flex max-w-360 items-center justify-end gap-6 px-2 xl:pr-10">
            <!-- Verticales, como el stack: la anterior baja, la siguiente sube -->
            <span class="flex gap-4">
              <button
                v-for="[dir, label, char] in [[-1, 'Foto anterior', '↑'], [1, 'Foto siguiente', '↓']]"
                :key="dir"
                type="button"
                :aria-label="label"
                :disabled="dir < 0 ? at <= 0 : at >= photos.length - 1"
                class="-my-2.5 cursor-pointer px-1 py-2.5 decoration-linea decoration-2 underline-offset-4 hover:underline disabled:cursor-default disabled:opacity-30 disabled:hover:no-underline"
                @click="goTo(at + dir)"
              >
                <!-- Máscara de una línea con el carácter dos veces, para el text roll (ver rollEls) -->
                <span class="block h-lh overflow-hidden"
                  ><span :ref="(el) => (rollEls[dir] = el)" class="block"
                    >{{ char }}<br />{{ char }}</span
                  ></span
                >
              </button>
            </span>
            <p class="tabular-nums" aria-live="polite">{{ current }} / {{ photos.length }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
