<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import CardPhoto from './CardPhoto.vue'
import { useScrambleText, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'
import { whenPhotoReady, preloadPhoto } from '../composables/useScrollReveal'

/*
 * Tarjeta de un registro, como la ficha del detalle: la foto (en su proporción real), el nombre
 * y los datos en una línea chica, sin cajas. La foto y el nombre llevan al registro.
 * Desde 768 px, en dos columnas de la retícula: la foto en una y el nombre y los datos en la
 * siguiente (la de los enlaces del navbar); en teléfono, el texto bajo la foto.
 */
const props = defineProps({
  project: { type: Object, required: true },
})

// Todas las cajas iguales, cuadradas: cada foto se recorta según su foco
const ratio = '1 / 1'
// Todas a lo ancho de la columna; la foto nunca más alta que la pantalla: bajo el fondo del navbar
// (--cabecera) entran la foto, el nombre y las dos filas de datos (9 rem: el texto y el aire) y además
// asoma el registro siguiente (5 rem: el espacio entre registros y 1 rem de su foto), para invitar a bajar
const MAX_PHOTO_HEIGHT = 'calc(100svh - var(--cabecera, 0px) - 14rem)'
const sizes = '(min-width: 1440px) 450px, (min-width: 768px) 33vw, 100vw'

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

const cardEl = ref(null)
</script>

<template>
  <article ref="cardEl" class="md:grid md:grid-cols-2 md:items-start" @pointerenter="hovered = true" @pointerleave="hovered = false">
    <!-- La foto repite el enlace del nombre; se oculta a lectores de pantalla y al teclado -->
    <RouterLink
      :to="link"
      :class="[
        'block transition-[clip-path] duration-1000 ease-(--ease-persiana) md:mr-6 lg:mr-10',
        photoShown ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]',
      ]"
      tabindex="-1"
      aria-hidden="true"
    >
      <CardPhoto :project="project" :paused="hovered" :ratio="ratio" :sizes="sizes" :max-height="MAX_PHOTO_HEIGHT" />
    </RouterLink>
    <div>
    <h2 ref="titleEl" class="mt-3 md:mt-0 font-display text-cuerpo leading-snug text-balance text-texto">
      <RouterLink
        :to="link"
        :aria-label="project.titulo"
        class="py-0.5 whitespace-pre-wrap decoration-acento decoration-2 underline-offset-4 hover:underline"
      >
        <span aria-hidden="true">{{ title }}</span>
      </RouterLink>
    </h2>
    <p class="mt-1 text-cuerpo-sm text-primario">{{ facts }}</p>
    <p class="text-cuerpo-sm text-primario">{{ project.arquitecto }}</p>
    </div>
  </article>
</template>
