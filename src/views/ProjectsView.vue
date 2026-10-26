<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import ProjectCard from '../components/ProjectCard.vue'
import { useScrambleText, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'
import { projects, categories } from '../data/content'

const route = useRoute()

// La categoría elegida vive en la dirección (?categoria=casas), así se puede compartir
const active = computed(() =>
  categories.some((c) => c.slug === route.query.categoria) ? route.query.categoria : null,
)

const visible = computed(() =>
  active.value ? projects.filter((p) => p.categoria.slug === active.value) : projects,
)

const filters = [{ slug: null, nombre: 'Todos' }, ...categories]

/*
 * Entrada: el título se escribe con letras al azar y después las categorías, una tras otra
 * (FILTER_STAGGER), como el resto de los textos del sitio
 */
const FILTER_DELAY = 250
const FILTER_STAGGER = 90
const SCRAMBLE = { stagger: 35, scramble: 380, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER }
const TITLE = 'Registros'
const entered = ref(0) // 0 nada, 1 el título, 2 + i la categoría i
const pageTitle = useScrambleText(computed(() => (entered.value >= 1 ? TITLE : ' '.repeat(TITLE.length))), SCRAMBLE)
const filterNames = filters.map((filter, i) =>
  useScrambleText(
    computed(() => (entered.value >= 2 + i ? filter.nombre : ' '.repeat(filter.nombre.length))),
    SCRAMBLE,
  ),
)
let enterTimers = []
onMounted(() => {
  entered.value = 1
  enterTimers = filters.map((_, i) => setTimeout(() => (entered.value = 2 + i), FILTER_DELAY + i * FILTER_STAGGER))
})
onBeforeUnmount(() => enterTimers.forEach(clearTimeout))

/*
 * Desde 1024 px la primera categoría queda en la misma línea base que el nombre del primer registro
 * (otra columna: CSS no puede alinearlas, se mide y se corre la diferencia)
 */
const navEl = ref(null)
const navShift = ref(0)
const baseline = (el) => {
  const mark = document.createElement('span')
  mark.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
  el.appendChild(mark)
  const y = mark.getBoundingClientRect().bottom
  mark.remove()
  return y
}
function alignNav() {
  const cat = navEl.value?.querySelector('a span[aria-hidden]')
  const title = document.querySelector('main article h2 [aria-hidden]')
  if (!cat || !title || !window.matchMedia('(width >= 64rem)').matches) return (navShift.value = 0)
  navShift.value += baseline(title) - baseline(cat)
}
onMounted(() => {
  document.fonts.ready.then(alignNav)
  window.addEventListener('resize', alignNav)
})
onBeforeUnmount(() => window.removeEventListener('resize', alignNav))
watch(visible, () => nextTick(alignNav))
</script>

<template>
  <section class="px-2 pb-16 md:pt-6">
    <!--
      El título y las categorías quedan fijos bajo el navbar al bajar: en móvil arriba, sobre fondo
      crema (los registros pasan por debajo); desde 768 px en el 1º tercio de la retícula, con los
      registros en los otros dos
    -->
    <div class="page md:grid md:grid-cols-3 md:items-start">
      <div
        class="sticky top-(--cabecera,0px) z-10 bg-fondo pt-6 pb-2 md:top-[calc(var(--cabecera,0px)+1.5rem)] md:z-auto md:bg-transparent md:pt-0 md:pr-6 md:pb-0 lg:grid lg:items-start lg:pr-10 lg:*:[grid-area:1/1]"
      >
        <h1 class="font-display text-h1 whitespace-pre">
          <span class="sr-only">{{ TITLE }}</span><span aria-hidden="true">{{ pageTitle }}</span>
        </h1>
        <!--
          Categorías como los enlaces del navbar: texto, la elegida subrayada en rosado (y al pasar).
          Desde 768 px en lista, en la misma línea vertical que el teléfono del pie (--footer-telefono).
          Desde 1024 px, al lado del título (la misma celda de la grilla), la primera en la línea base
          del nombre del primer registro (ver alignNav); antes, bajo el título (el teléfono va al
          borde y chocarían)
        -->
        <nav
          ref="navEl"
          aria-label="Filtrar por categoría"
          class="mt-4 md:mt-6 md:pl-(--footer-telefono,0px) lg:mt-0"
          :style="navShift ? { transform: `translateY(${navShift}px)` } : null"
        >
          <ul class="flex flex-wrap gap-x-6 text-boton text-primario lowercase md:flex-col">
            <!--
              Desde 1024 px, con el mismo ritmo de renglones que el nombre y los datos del registro
              de al lado: la 2ª categoría a la altura de los datos, y de ahí cada 16,5 px. El área
              para tocar sigue en 24 px (py con -my)
            -->
            <li v-for="(filter, i) in filters" :key="filter.nombre" class="lg:first:mb-[5.5px]">
              <RouterLink
                :to="{ name: 'projects', query: filter.slug ? { categoria: filter.slug } : {} }"
                :aria-current="active === filter.slug ? 'true' : undefined"
                :class="[
                  'block w-fit py-2.5 decoration-acento decoration-2 underline-offset-4 hover:underline md:py-1.5 lg:-my-1 lg:py-1 lg:leading-[16.5px]',
                  active === filter.slug && 'underline',
                ]"
              >
                <span class="sr-only">{{ filter.nombre }}</span
                ><span aria-hidden="true" class="whitespace-pre">{{ filterNames[i].value }}</span>
              </RouterLink>
            </li>
          </ul>
        </nav>
      </div>

      <!-- Una columna en los 2 tercios de la derecha: todas las fotos del mismo ancho -->
      <ul v-if="visible.length" class="mt-10 grid gap-y-16 md:col-span-2 md:mt-0">
        <li v-for="project in visible" :key="project.slug">
          <ProjectCard :project="project" />
        </li>
      </ul>
      <p v-else class="mt-10 md:col-span-2 md:mt-0">Todavía no hay registros en esta categoría.</p>
    </div>
  </section>
</template>
