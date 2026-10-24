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

const filters = [{ slug: null, nombre: 'Todos' }, ...categories]
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
        class="sticky top-(--cabecera,0px) z-10 bg-fondo pt-6 pb-2 md:top-[calc(var(--cabecera,0px)+1.5rem)] md:z-auto md:bg-transparent md:pt-0 md:pr-6 md:pb-0 lg:pr-10"
      >
        <h1 class="font-display text-h1">Registros</h1>
        <!-- Categorías como los enlaces del navbar: texto, la elegida subrayada en rosado (y al pasar) -->
        <nav aria-label="Filtrar por categoría" class="mt-4 md:mt-6">
          <ul class="flex flex-wrap gap-x-6 text-boton text-primario lowercase md:flex-col">
            <li v-for="filter in filters" :key="filter.nombre">
              <RouterLink
                :to="{ name: 'projects', query: filter.slug ? { categoria: filter.slug } : {} }"
                :aria-current="active === filter.slug ? 'true' : undefined"
                :class="[
                  'block w-fit py-2.5 decoration-acento decoration-2 underline-offset-4 hover:underline md:py-1.5',
                  active === filter.slug && 'underline',
                ]"
              >
                <span>{{ filter.nombre }}</span>
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
