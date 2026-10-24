<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import CardPhoto from './CardPhoto.vue'
import { useScrambleText, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'
import { menuTextX } from '../composables/useMenu'
import { whenPhotoReady, preloadPhoto } from '../composables/useScrollReveal'

/*
 * Tarjeta de un registro, como la ficha del detalle: la foto (en su proporción real), el nombre
 * y debajo los datos en una línea chica, sin cajas. La foto y el nombre llevan al registro.
 */
const props = defineProps({
  project: { type: Object, required: true },
})

const ratio = computed(() => `${props.project.portada.width} / ${props.project.portada.height}`)
// Todas a lo ancho de la columna; la foto nunca más alta que la pantalla: bajo el fondo del navbar
// (--cabecera) entran la foto, el nombre y las dos filas de datos (9 rem: el texto y el aire) y además
// asoma el registro siguiente (5 rem: el espacio entre registros y 1 rem de su foto), para invitar a bajar
const MAX_PHOTO_HEIGHT = 'calc(100svh - var(--cabecera, 0px) - 14rem)'
const sizes = '(min-width: 1440px) 900px, (min-width: 768px) 66vw, 100vw'

// Con el cursor encima, la foto de esta tarjeta no cambia (ver CardPhoto)
const hovered = ref(false)

const link = computed(() => ({ name: 'project', params: { slug: props.project.slug } }))

// Datos en una línea (categoría, año y lugar); el arquitecto, en la fila de abajo
const facts = computed(() =>
  [props.project.categoria.nombre.toLowerCase(), props.project.año, props.project.lugar].join(' · '),
)

/*
 * El título se arma desde vacío con letras al azar (como el nombre de la intro) la primera
 * vez que entra en pantalla; después queda fijo.
 */
const titleEl = ref(null)
const shown = ref(false)
// La foto se descubre como persiana que baja la primera vez que la tarjeta se ve
const photoShown = ref(false)
let photoObserver
const title = useScrambleText(
  computed(() => (shown.value ? props.project.titulo : ' '.repeat(props.project.titulo.length))),
  { stagger: 35, scramble: 400, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER },
)
let observer
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    shown.value = true
    photoShown.value = true
    return
  }
  photoObserver = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return
    photoObserver.disconnect()
    whenPhotoReady(cardEl.value, () => (photoShown.value = true))
    // Apenas asoma (threshold 0): el registro siguiente se ve abriéndose bajo el actual
  }, { threshold: 0 })
  photoObserver.observe(cardEl.value)
  preloadPhoto(cardEl.value)
  observer = new IntersectionObserver(([entry]) => {
    if (entry.intersectionRatio < 0.8) return
    shown.value = true
    observer.disconnect()
  }, { threshold: 0.8 })
  observer.observe(titleEl.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  photoObserver?.disconnect()
})

/*
 * Desde 1024 px, el nombre y los datos empiezan en la columna de los enlaces del navbar (y de
 * "Valdivia · 2026" en el pie), si esa columna cae dentro de la celda de la tarjeta con espacio
 * para el texto. El texto puede pasar el ancho de la foto (si es angosta) hasta el borde de la celda
 */
const MIN_TEXT = 160
const cardEl = ref(null)
const textStyle = ref(null)
function alignText() {
  const box = cardEl.value?.getBoundingClientRect()
  const cell = cardEl.value?.parentElement.getBoundingClientRect()
  const x = menuTextX.value
  textStyle.value =
    box && x > box.left && x < cell.right - MIN_TEXT
      ? { paddingLeft: `${x - box.left}px`, width: `${cell.right - box.left}px` }
      : null
}
watch(menuTextX, alignText)
onMounted(() => {
  alignText()
  window.addEventListener('resize', alignText)
})
onBeforeUnmount(() => window.removeEventListener('resize', alignText))
</script>

<template>
  <article ref="cardEl" @pointerenter="hovered = true" @pointerleave="hovered = false">
    <!-- La foto repite el enlace del nombre; se oculta a lectores de pantalla y al teclado -->
    <RouterLink
      :to="link"
      :class="[
        'block transition-[clip-path] duration-1000 ease-[cubic-bezier(0.6,0,0.3,1)]',
        photoShown ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]',
      ]"
      tabindex="-1"
      aria-hidden="true"
    >
      <CardPhoto :project="project" :paused="hovered" :ratio="ratio" :sizes="sizes" :max-height="MAX_PHOTO_HEIGHT" />
    </RouterLink>
    <div :style="textStyle">
    <h2 ref="titleEl" class="mt-3 font-display text-cuerpo leading-snug text-balance text-texto">
      <RouterLink
        :to="link"
        :aria-label="project.titulo"
        class="whitespace-pre-wrap decoration-acento decoration-2 underline-offset-4 hover:underline"
      >
        <span aria-hidden="true">{{ title }}</span>
      </RouterLink>
    </h2>
    <p class="mt-1 text-cuerpo-sm text-primario">{{ facts }}</p>
    <p class="text-cuerpo-sm text-primario">{{ project.arquitecto }}</p>
    </div>
  </article>
</template>
