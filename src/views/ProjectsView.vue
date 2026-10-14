<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ProjectCard from '../components/ProjectCard.vue'
import { projects, categories } from '../data/content'

const route = useRoute()

// La categoría elegida vive en la dirección (?categoria=casas), así se puede compartir
const active = computed(() =>
  categories.some((c) => c.slug === route.query.categoria) ? route.query.categoria : null,
)

const visible = computed(() =>
  active.value ? projects.filter((p) => p.categoria.slug === active.value) : projects,
)

const filters = computed(() => [
  { slug: null, nombre: 'Todos', count: projects.length },
  ...categories.map((c) => ({
    ...c,
    count: projects.filter((p) => p.categoria.slug === c.slug).length,
  })),
])
</script>

<template>
  <section class="px-2 pt-32 pb-28 lg:pt-40">
    <div class="page">
      <h1 class="font-display text-h1">Proyectos</h1>

      <nav aria-label="Filtrar por categoría" class="mt-10">
        <ul class="flex flex-wrap gap-2">
          <li v-for="filter in filters" :key="filter.nombre">
            <RouterLink
              :to="{ name: 'projects', query: filter.slug ? { categoria: filter.slug } : {} }"
              :aria-current="active === filter.slug ? 'true' : undefined"
              :class="[
                'flex items-center gap-2 border border-primario px-3 py-1.5 text-cuerpo-sm lowercase transition-colors duration-200',
                active === filter.slug
                  ? 'bg-primario text-fondo'
                  : 'text-primario hover:bg-primario hover:text-fondo',
              ]"
            >
              {{ filter.nombre }}
              <span class="tabular-nums opacity-70">{{ filter.count }}</span>
            </RouterLink>
          </li>
        </ul>
      </nav>

      <ul
        v-if="visible.length"
        class="mt-14 grid gap-x-6 gap-y-14 md:grid-cols-2 xl:grid-cols-3"
      >
        <li v-for="project in visible" :key="project.slug">
          <ProjectCard :project="project" />
        </li>
      </ul>
      <p v-else class="mt-14">Todavía no hay proyectos en esta categoría.</p>
    </div>
  </section>
</template>
