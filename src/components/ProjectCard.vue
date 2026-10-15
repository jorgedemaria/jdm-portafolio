<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import CardPhoto from './CardPhoto.vue'
import { useScrambleText, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'

/*
 * Tarjeta de proyecto con el mismo diseño que las de "últimos registros": foto, título chico
 * y una grilla tipo menú (año, lugar, arquitectura y "ver registro"). La foto respeta la
 * proporción real de la portada.
 */
const props = defineProps({
  project: { type: Object, required: true },
  // A todo el ancho de la grilla (el proyecto más reciente)
  featured: { type: Boolean, default: false },
})

const ratio = computed(() => `${props.project.portada.width} / ${props.project.portada.height}`)
// La destacada va a todo el ancho, pero nunca más alta que la pantalla: deja aire para el
// navbar arriba y para el título debajo de la foto
const cardStyle = computed(() => ({
  '--ratio': ratio.value,
  ...(props.featured
    ? { width: `min(100%, calc((100svh - 12rem) * ${props.project.portada.width / props.project.portada.height}))` }
    : {}),
}))
const sizes = computed(() =>
  props.featured ? '(min-width: 1440px) 1360px, 100vw' : '(min-width: 1440px) 680px, (min-width: 768px) 48vw, 100vw',
)

// Con el cursor encima, la foto de esta tarjeta no cambia (ver CardPhoto)
const hovered = ref(false)

const link = computed(() => ({ name: 'project', params: { slug: props.project.slug } }))

// Datos de la grilla (misma estructura que el menú: filas separadas por líneas)
const facts = computed(() => [
  ['año', String(props.project.año)],
  ['lugar', props.project.lugar],
  ['arquitectura', props.project.arquitecto],
])

/*
 * El título se arma desde vacío con letras al azar (como el nombre de la intro) la primera
 * vez que entra en pantalla; después queda fijo.
 */
const titleEl = ref(null)
const shown = ref(false)
const title = useScrambleText(
  computed(() => (shown.value ? props.project.titulo : ' '.repeat(props.project.titulo.length))),
  { stagger: 35, scramble: 400, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER },
)
let observer
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    shown.value = true
    return
  }
  observer = new IntersectionObserver(([entry]) => {
    if (entry.intersectionRatio < 0.8) return
    shown.value = true
    observer.disconnect()
  }, { threshold: 0.8 })
  observer.observe(titleEl.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <!-- Pasar el cursor por la foto o el título abre la grilla -->
  <article
    class="group/card relative"
    :style="cardStyle"
    @pointerenter="hovered = true"
    @pointerleave="hovered = false"
  >
    <!-- La foto repite el enlace de "ver registro"; se oculta a lectores de pantalla y al teclado -->
    <RouterLink :to="link" class="block" tabindex="-1" aria-hidden="true">
      <CardPhoto
        :project="project"
        :paused="hovered"
        :ratio="ratio"
        :sizes="sizes"
      />
    </RouterLink>
    <h2
      ref="titleEl"
      class="mt-3 font-display text-cuerpo leading-snug font-semibold text-balance text-texto"
    >
      <RouterLink
        :to="link"
        :aria-label="project.titulo"
        class="whitespace-pre-wrap decoration-1 underline-offset-4 hover:underline"
      >
        <span aria-hidden="true">{{ title }}</span>
      </RouterLink>
    </h2>

    <!--
      Grilla tipo menú, del alto de su contenido. En pantallas con cursor se apoya en el borde
      inferior de la foto (caja invisible de la misma proporción que la foto) y sube como persiana
      desde abajo al pasar el cursor (o al llegar con el teclado).
      En pantallas táctiles va debajo del título y se ve siempre.
    -->
    <div
      class="mt-4 [@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:absolute [@media(hover:hover)]:inset-x-0 [@media(hover:hover)]:top-0 [@media(hover:hover)]:mt-0 [@media(hover:hover)]:flex [@media(hover:hover)]:aspect-(--ratio) [@media(hover:hover)]:flex-col [@media(hover:hover)]:justify-end"
    >
      <div
        :class="featured && 'md:w-1/2'"
        class="pointer-events-auto flex flex-col border border-primario bg-fondo text-cuerpo-sm transition-[clip-path] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)] group-focus-within/card:[clip-path:inset(0)] group-hover/card:[clip-path:inset(0)] [@media(hover:hover)]:[clip-path:inset(100%_0_0_0)]"
      >
        <dl class="divide-y divide-primario">
          <div
            v-for="[label, value] in facts"
            :key="label"
            class="flex items-baseline justify-between gap-4 px-3 py-2.5"
          >
            <dt class="font-light text-primario">{{ label }}</dt>
            <dd class="text-right text-texto">{{ value }}</dd>
          </div>
        </dl>
        <RouterLink
          :to="link"
          class="group/link flex items-center justify-end border-t border-primario bg-primario px-3 py-2.5 text-fondo focus-visible:-outline-offset-4 focus-visible:outline-fondo"
        >
          ver registro
          <span class="sr-only">: {{ project.titulo }}</span>
          <!-- Al pasar el cursor (o con el foco) aparece la flecha ↗, como en "ver todo" -->
          <span
            class="grid w-0 overflow-hidden transition-[width,margin] duration-300 ease-[cubic-bezier(0.6,0,0.3,1)] group-hover/link:ml-1.5 group-hover/link:w-3 group-focus-visible/link:ml-1.5 group-focus-visible/link:w-3"
            aria-hidden="true"
          >
            <svg class="size-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 9 9 3M4 3h5v5" />
            </svg>
          </span>
        </RouterLink>
      </div>
    </div>
  </article>
</template>
