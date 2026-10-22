<script setup>
import { ref, computed, watch, toRef } from 'vue'
import ResponsiveImage from './ResponsiveImage.vue'
import { useCardRotation, cardPhotos } from '../composables/useCardRotation'

/*
 * Foto de una tarjeta de proyecto que cambia sola cada cierto tiempo (ver useCardRotation).
 * La foto nueva se carga encima, sin verse, y cuando está lista entra como persiana sobre la
 * anterior, desde un lado al azar.
 */
const props = defineProps({
  project: { type: Object, required: true },
  ratio: { type: String, required: true },
  sizes: { type: String, required: true },
  // Con el cursor encima la tarjeta no cambia
  paused: { type: Boolean, default: false },
  // Alto máximo (CSS): la foto mantiene el ancho y, si en su proporción queda más alta, se recorta
  // arriba y abajo
  maxHeight: { type: String, default: null },
})

const photos = cardPhotos(props.project)
const { index, side } = useCardRotation(props.project, toRef(props, 'paused'))

// Recorte inicial (persiana cerrada) según el lado desde el que entra
const HIDDEN_FROM = {
  top: 'inset(0 0 100% 0)',
  bottom: 'inset(100% 0 0 0)',
  left: 'inset(0 100% 0 0)',
  right: 'inset(0 0 0 100%)',
}

const shown = ref(index.value) // foto de abajo, ya visible
const incoming = ref(null) // foto que está entrando
const revealing = ref(false)

watch(index, (next) => {
  if (next === shown.value) return
  finishSwap()
  revealing.value = false
  incoming.value = next
})

// Recién cargada la foto nueva, sube la persiana (en el cuadro siguiente, para que se anime)
function onIncomingLoaded() {
  requestAnimationFrame(() => requestAnimationFrame(() => (revealing.value = true)))
}

// Al terminar, la foto nueva pasa a ser la de abajo; la capa de arriba se quita recién cuando
// la de abajo ya la muestra, así no hay parpadeo
let swapping = false
let swapTimer = 0
function finishSwap() {
  if (!swapping) return
  swapping = false
  clearTimeout(swapTimer)
  incoming.value = null
  revealing.value = false
}
function onRevealed(event) {
  if (event.propertyName !== 'clip-path' || !revealing.value || swapping) return
  swapping = true
  shown.value = incoming.value
  swapTimer = setTimeout(finishSwap, 1000)
}

const incomingPhoto = computed(() => (incoming.value === null ? null : photos[incoming.value]))
</script>

<template>
  <div class="relative">
    <ResponsiveImage v-bind="photos[shown]" :ratio="ratio" :sizes="sizes" :style="maxHeight && { width: '100%', maxHeight }" @loaded="finishSwap" />
    <div
      v-if="incomingPhoto"
      :key="incomingPhoto.src"
      :class="[
        'absolute inset-0',
        revealing && 'transition-[clip-path] duration-700 ease-[cubic-bezier(0.6,0,0.3,1)]',
      ]"
      :style="{ clipPath: revealing ? 'inset(0)' : HIDDEN_FROM[side] }"
      @transitionend="onRevealed"
    >
      <ResponsiveImage
        v-bind="incomingPhoto"
        fill
        loading="eager"
        :sizes="sizes"
        @loaded="onIncomingLoaded"
      />
    </div>
  </div>
</template>
