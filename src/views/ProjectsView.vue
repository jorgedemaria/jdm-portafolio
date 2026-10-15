<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useScrambleText, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'
import ProjectCard from '../components/ProjectCard.vue'
import { projects, categories } from '../data/content'
import { useNavSectionTitle } from '../composables/useNavSectionTitle'

const route = useRoute()
const root = ref(null)
useNavSectionTitle(root, 'registros')

// La categoría elegida vive en la dirección (?categoria=casas), así se puede compartir
const active = computed(() =>
  categories.some((c) => c.slug === route.query.categoria) ? route.query.categoria : null,
)

const visible = computed(() =>
  active.value ? projects.filter((p) => p.categoria.slug === active.value) : projects,
)

const filters = [{ slug: null, nombre: 'Todos' }, ...categories]

const isFeatured = (i) => i === 0 && visible.value[0].portada.width > visible.value[0].portada.height
// Columna derecha (desfasada): cuenta desde después del destacado, si lo hay
const isRight = (i) => (i - (isFeatured(0) ? 1 : 0)) % 2 === 1

/*
 * Selector de categoría con la estética del menú: un botón con la categoría elegida y,
 * al abrirlo, una lista de enlaces que baja como persiana. Se cierra al elegir, con Escape
 * o al hacer clic fuera.
 */
const filterOpen = ref(false)
const filterRef = ref(null)
const filterButton = ref(null)
const current = computed(() => filters.find((f) => f.slug === active.value) ?? filters[0])
// La categoría elegida cambia con el mismo efecto de letras al azar del título de inicio
const currentText = useScrambleText(
  computed(() => current.value.nombre.toLowerCase()),
  { stagger: 30, scramble: 240, tick: 45, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER },
)

function closeFilter({ restoreFocus = false } = {}) {
  filterOpen.value = false
  if (restoreFocus) filterButton.value?.focus()
}
function onPointerDown(event) {
  if (filterOpen.value && !filterRef.value?.contains(event.target)) closeFilter()
}
function onKeydown(event) {
  if (event.key === 'Escape' && filterOpen.value) closeFilter({ restoreFocus: true })
}
watch(() => route.fullPath, () => closeFilter())
onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <section ref="root" class="px-2 pt-32 pb-16 md:pt-24 lg:pt-28">
    <div class="page">
      <!-- Desde 768 px el título se muestra debajo del logo (navbar), con su animación -->
      <h1 class="font-display text-h1 md:sr-only">registros</h1>

      <!-- Ancho de una columna de la retícula (como cada enlace del menú); a todo el ancho en móvil -->
      <nav ref="filterRef" aria-label="Filtrar por categoría" class="relative z-10 mt-10 md:mt-0 md:w-1/5">
        <button
          ref="filterButton"
          type="button"
          :aria-expanded="filterOpen"
          aria-controls="filtro-categorias"
          :class="[
            'flex w-full cursor-pointer items-center justify-between gap-2 border border-primario px-4 py-2.5 text-boton lowercase transition-colors duration-200 md:px-3',
            filterOpen ? 'bg-primario text-fondo' : 'bg-fondo text-primario hover:bg-primario hover:text-fondo',
          ]"
          @click="filterOpen = !filterOpen"
        >
          <!-- Categoría elegida al comienzo; al final, el "+" que gira a "×" al abrir, como el botón del menú -->
          <span class="sr-only">Categoría: {{ current.nombre }}</span>
          <span class="whitespace-pre" aria-hidden="true">{{ currentText }}</span>
          <span
            :class="[
              'relative block size-3 shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]',
              filterOpen && 'rotate-135',
            ]"
            aria-hidden="true"
          >
            <span class="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
            <span class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current" />
          </span>
        </button>

        <!-- Lista: baja como persiana desde el borde inferior del botón -->
        <ul
          id="filtro-categorias"
          :class="[
            'absolute inset-x-0 top-full flex flex-col divide-y divide-primario border border-t-0 border-primario bg-fondo transition-[clip-path,visibility] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]',
            filterOpen ? '[clip-path:inset(0)]' : 'invisible [clip-path:inset(0_0_100%_0)]',
          ]"
        >
          <li v-for="filter in filters" :key="filter.nombre">
            <RouterLink
              :to="{ name: 'projects', query: filter.slug ? { categoria: filter.slug } : {} }"
              :aria-current="active === filter.slug ? 'true' : undefined"
              class="flex items-center justify-between gap-2 px-4 py-2.5 text-boton text-primario lowercase transition-colors duration-200 ease-out hover:bg-primario hover:text-fondo focus-visible:-outline-offset-4 md:px-3"
            >
              <!-- Texto a la izquierda; "*" en la categoría elegida, a la derecha (alineado con el "+") -->
              <span>{{ filter.nombre }}</span>
              <span class="w-3 shrink-0 text-center" aria-hidden="true">{{ active === filter.slug ? '*' : '' }}</span>
            </RouterLink>
          </li>
        </ul>
      </nav>

      <!--
        Dos columnas con la de la derecha desfasada hacia abajo; cada foto en su proporción real.
        El proyecto más reciente va a todo el ancho si su portada es horizontal.
      -->
      <ul v-if="visible.length" class="mt-6 grid gap-x-10 gap-y-16 md:grid-cols-2 md:items-start">
        <li
          v-for="(project, i) in visible"
          :key="project.slug"
          :class="[isFeatured(i) && 'md:col-span-2', isRight(i) && 'md:mt-24']"
        >
          <ProjectCard :project="project" :featured="isFeatured(i)" />
        </li>
      </ul>
      <p v-else class="mt-6">Todavía no hay registros en esta categoría.</p>
    </div>
  </section>
</template>
