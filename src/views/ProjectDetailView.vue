<script setup>
import { ref, computed, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import ResponsiveImage from '../components/ResponsiveImage.vue'
import PhotoLightbox from '../components/PhotoLightbox.vue'
import NotFoundView from './NotFoundView.vue'
import { findProject } from '../data/content'
import { useScrollReveal } from '../composables/useScrollReveal'
import { useScrambleText, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'

const props = defineProps({
  slug: { type: String, required: true },
})

const project = computed(() => findProject(props.slug))

watchEffect(() => {
  document.title = (project.value ? `${project.value.titulo} * jorge de maría` : 'página no encontrada * jorge de maría').toLowerCase()
})

// Ficha: los datos, sin etiquetas, después de la categoría
const facts = computed(() => [
  String(project.value.año),
  project.value.lugar,
  project.value.arquitecto,
  ...Object.values(project.value.ficha ?? {}),
])

/*
 * Entrada, como en Registros: el nombre se escribe con letras al azar y después la categoría y los
 * datos, uno tras otro (FACT_STAGGER); cada número, cuando su foto termina de abrirse (TEXT_DELAY)
 */
const TEXT_DELAY = 150
const FACT_DELAY = 250
const FACT_STAGGER = 90
const SCRAMBLE = { stagger: 35, scramble: 380, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER }
const entered = ref(0) // 0 nada, 1 el nombre, 2 + i el dato i (el 0 es la categoría)
const typed = (step, text) =>
  useScrambleText(computed(() => (entered.value >= step ? text() : ' '.repeat(text().length))), SCRAMBLE)
const title = typed(1, () => project.value?.titulo ?? '')
const categoryText = typed(2, () => project.value?.categoria.nombre.toLowerCase() ?? '')
const factTexts = project.value ? facts.value.map((fact, i) => typed(3 + i, () => fact)) : []
// Número de cada foto, como el nombre en una tarjeta de Registros
const nro = (i) => String(i + 1).padStart(2, '0')
const numbersShown = ref([]) // índices de las fotos ya abiertas
const numberTexts = (project.value?.fotos ?? []).map((_, i) =>
  useScrambleText(computed(() => (numbersShown.value.includes(i) ? nro(i) : '  ')), SCRAMBLE),
)
let enterTimers = []
function photoOpened(el) {
  const i = Number(el.dataset.foto)
  enterTimers.push(setTimeout(() => numbersShown.value.push(i), TEXT_DELAY))
}
onMounted(() => {
  if (!project.value) return
  entered.value = 1
  enterTimers = [0, ...facts.value].map((_, i) =>
    setTimeout(() => (entered.value = 2 + i), FACT_DELAY + i * FACT_STAGGER),
  )
  // Sin movimiento las fotos no se abren (ver useScrollReveal): todo escrito de una vez
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  entered.value = 2 + facts.value.length
  numbersShown.value = project.value.fotos.map((_, i) => i)
})
onBeforeUnmount(() => enterTimers.forEach(clearTimeout))
// Foto abierta a pantalla completa (índice) o null
const lightbox = ref(null)

// Las fotos se descubren como persiana que baja al aparecer, como en Registros
const reveal = useScrollReveal(photoOpened)
</script>

<template>
  <NotFoundView v-if="!project" />

  <article v-else class="px-2 pb-16 md:pt-6">
    <!--
      Como Registros: el nombre fijo bajo el navbar al bajar (en móvil arriba, sobre el fondo; desde
      768 px en las columnas 1–2) y las fotos en las 3–6
    -->
    <div class="page md:grid md:grid-cols-6 md:items-start md:gap-x-6 lg:gap-x-10">
      <div
        class="sticky top-(--cabecera,0px) z-10 bg-fondo pt-6 pb-2 md:top-[calc(var(--cabecera,0px)+1.5rem)] md:z-auto md:col-span-2 md:bg-transparent md:pt-0 md:pb-0"
      >
        <!-- El nombre real, invisible, fija el tamaño: no salta de línea mientras se escribe -->
        <h1 class="font-display text-h1 text-balance whitespace-pre-wrap text-titulo">
          <span class="sr-only">{{ project.titulo }}</span
          ><span aria-hidden="true" class="relative block"
            ><span class="invisible">{{ project.titulo }}</span
            ><span class="absolute inset-0 overflow-hidden">{{ title }}</span></span
          >
        </h1>
        <!-- La categoría y los datos bajo el nombre, como las categorías en Registros -->
        <ul class="mt-4 text-boton text-dato md:mt-6">
          <li>
            <RouterLink
              :to="{ name: 'projects', query: { categoria: project.categoria.slug } }"
              class="-my-[7px] block w-fit py-[7px] decoration-linea decoration-2 underline-offset-4 hover:underline"
              ><span class="sr-only">{{ project.categoria.nombre }}</span
              ><span aria-hidden="true" class="whitespace-pre">{{ categoryText }}</span></RouterLink
            >
          </li>
          <li v-for="(fact, j) in facts" :key="fact" class="whitespace-pre-wrap">
            <span class="sr-only">{{ fact }}</span><span aria-hidden="true">{{ factTexts[j].value }}</span>
          </li>
        </ul>
      </div>

      <!--
        Cada foto, una fila como una tarjeta de Registros: la foto en las columnas 3–5 y su número en
        la 6ª
      -->
      <ul class="mt-10 grid gap-y-16 md:col-span-4 md:mt-0">
        <li
          v-for="(photo, i) in project.fotos"
          :key="photo.src"
          class="md:grid md:grid-cols-4 md:items-start md:gap-x-6 lg:gap-x-10"
        >
          <!-- Todas del mismo ancho, cada una en su proporción real -->
          <div :ref="reveal" :data-foto="i" class="overflow-hidden md:col-span-3">
            <button
              type="button"
              class="block w-full cursor-zoom-in"
              :aria-label="`Ver foto ${i + 1} de ${project.fotos.length} a pantalla completa`"
              @click="lightbox = i"
            >
              <ResponsiveImage
                v-bind="photo"
                :loading="i === 0 ? 'eager' : 'lazy'"
                sizes="(min-width: 1440px) 680px, (min-width: 768px) 50vw, 100vw"
              />
            </button>
          </div>
          <p class="mt-4 whitespace-pre text-cuerpo text-titulo tabular-nums md:mt-0" aria-hidden="true">{{ numberTexts[i].value }}</p>
        </li>
      </ul>
    </div>

    <Transition
      enter-active-class="transition-[clip-path] duration-500 ease-(--ease-persiana)"
      leave-active-class="transition-[clip-path] duration-500 ease-(--ease-persiana)"
      enter-from-class="[clip-path:inset(100%_0_0_0)]"
      leave-to-class="[clip-path:inset(100%_0_0_0)]"
    >
      <PhotoLightbox v-if="lightbox !== null" :photos="project.fotos" :start="lightbox" @close="lightbox = null" />
    </Transition>
  </article>
</template>
