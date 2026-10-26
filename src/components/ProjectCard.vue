<script>
/*
 * Fila de entrada compartida por todas las tarjetas: de las que esperan, entra siempre la que está
 * más arriba en la página, cuando la anterior ya terminó (foto, nombre y datos: ENTER_STAGGER) y su
 * foto ya cargó; si la fila está libre, de inmediato. Una foto que no carga no la traba (FOTO_MAX)
 */
const ENTER_STAGGER = 400
const FOTO_MAX = 3000
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const waiting = []
let running = false
async function runLine() {
  running = true
  await wait(0) // junta las que asoman a la vez
  while (waiting.length) {
    waiting.sort((a, b) => a.el.getBoundingClientRect().top - b.el.getBoundingClientRect().top)
    const card = waiting.shift()
    if (card.gone()) continue
    await Promise.race([card.ready, wait(FOTO_MAX)])
    if (card.gone()) continue
    card.enter()
    await wait(ENTER_STAGGER)
  }
  running = false
}
function queueEnter(card) {
  waiting.push(card)
  if (!running) runLine()
}
</script>

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

// Todas las cajas iguales, en 16:9: cada foto se recorta según su foco
const ratio = '16 / 9'
// Todas a lo ancho de la columna; la foto nunca más alta que la pantalla: bajo el fondo del navbar
// (--cabecera) entran la foto, el nombre y las dos filas de datos (9 rem: el texto y el aire) y además
// asoma el registro siguiente (5 rem: el espacio entre registros y 1 rem de su foto), para invitar a bajar
const MAX_PHOTO_HEIGHT = 'calc(100svh - var(--cabecera, 0px) - 14rem)'
const sizes = '(min-width: 1440px) 450px, (min-width: 768px) 33vw, 100vw'

// Con el cursor encima, la foto de esta tarjeta no cambia (ver CardPhoto)
const hovered = ref(false)

const link = computed(() => ({ name: 'project', params: { slug: props.project.slug } }))

// Datos en una línea (categoría, año y lugar); el arquitecto, en la fila de abajo
// Los datos en lista, uno por línea: categoría, año, lugar y arquitectos
const facts = [props.project.categoria.nombre.toLowerCase(), String(props.project.año), props.project.lugar, props.project.arquitecto].filter(Boolean)

/*
 * Entrada, como en "últimos registros": la primera vez que la tarjeta asoma, en cuanto su foto
 * carga, la foto se descubre como persiana que baja; después (TEXT_DELAY) el nombre se escribe con
 * letras al azar y, otro TEXT_DELAY después, los datos. Una tarjeta tras otra (ver queueEnter)
 */
const TEXT_DELAY = 150
const shown = ref(false)
const photoShown = ref(false)
const factsShown = ref(false)
const typed = (on, text) =>
  useScrambleText(
    computed(() => (on.value ? text.value : ' '.repeat(text.value.length))),
    { stagger: 25, scramble: 280, tick: 40, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER },
  )
const title = typed(shown, computed(() => props.project.titulo))
const factsTexts = facts.map((fact) => typed(factsShown, computed(() => fact)))
let observer
let unmounted = false
let textTimers = []
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    shown.value = photoShown.value = factsShown.value = true
    return
  }
  observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return
    observer.disconnect()
    // La foto empieza a cargar ya; la tarjeta espera su turno en la fila y su foto
    const ready = new Promise((resolve) => whenPhotoReady(cardEl.value, resolve))
    queueEnter({
      el: cardEl.value,
      ready,
      gone: () => unmounted,
      enter: () => {
        photoShown.value = true
        textTimers = [
          setTimeout(() => (shown.value = true), TEXT_DELAY),
          setTimeout(() => (factsShown.value = true), TEXT_DELAY * 2),
        ]
      },
    })
  }, { threshold: 0.15 })
  observer.observe(cardEl.value)
  preloadPhoto(cardEl.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  unmounted = true
  textTimers.forEach(clearTimeout)
})

const cardEl = ref(null)
</script>

<template>
  <article ref="cardEl" class="md:grid md:grid-cols-2 md:items-start md:gap-x-6 lg:gap-x-10" @pointerenter="hovered = true" @pointerleave="hovered = false">
    <!-- La foto repite el enlace del nombre; se oculta a lectores de pantalla y al teclado -->
    <RouterLink
      :to="link"
      :class="[
        'block transition-[clip-path] duration-500 ease-(--ease-persiana)',
        photoShown ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]',
      ]"
      tabindex="-1"
      aria-hidden="true"
    >
      <CardPhoto :project="project" :paused="hovered" :ratio="ratio" :sizes="sizes" :max-height="MAX_PHOTO_HEIGHT" />
    </RouterLink>
    <!--
      Desde 768 px, el nombre en una columna y los datos en lista en la siguiente (la 5ª y la 6ª en
      Registros), con el nombre y el primer dato en la misma línea base
    -->
    <div class="md:grid md:grid-cols-2 md:items-baseline md:gap-x-6 lg:gap-x-10">
    <h2 class="mt-4 md:mt-0 font-display text-cuerpo text-balance text-titulo">
      <RouterLink
        :to="link"
        :aria-label="project.titulo"
        class="py-0.5 whitespace-pre-wrap decoration-linea decoration-2 underline-offset-4 hover:underline"
      >
        <span aria-hidden="true">{{ title }}</span>
      </RouterLink>
    </h2>
    <!-- Los datos se escriben después del nombre (ver factsShown); los lectores los leen completos -->
    <ul class="mt-2 text-cuerpo-sm text-dato md:mt-0">
      <li v-for="(fact, i) in facts" :key="fact" class="whitespace-pre-wrap">
        <span class="sr-only">{{ fact }}</span><span aria-hidden="true">{{ factsTexts[i].value }}</span>
      </li>
    </ul>
    </div>
  </article>
</template>
