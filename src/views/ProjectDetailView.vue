<script setup>
import { computed, watchEffect } from 'vue'
import ResponsiveImage from '../components/ResponsiveImage.vue'
import ProjectFacts from '../components/ProjectFacts.vue'
import NotFoundView from './NotFoundView.vue'
import { findProject, neighbors } from '../data/content'

const props = defineProps({
  slug: { type: String, required: true },
})

const project = computed(() => findProject(props.slug))
const around = computed(() => neighbors(props.slug))

watchEffect(() => {
  document.title = project.value
    ? `${project.value.titulo} — Jorge de María`
    : 'Página no encontrada — Jorge de María'
})

/*
 * Galería: las fotos horizontales van a todo el ancho; las verticales seguidas
 * se agrupan de a dos, lado a lado. Una vertical suelta va centrada, más angosta.
 */
const rows = computed(() => {
  if (!project.value) return []
  const result = []
  const photos = project.value.fotos
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const next = photos[i + 1]
    const isPortrait = (p) => p && p.height > p.width
    if (isPortrait(photo) && isPortrait(next)) {
      result.push({ type: 'pair', photos: [photo, next] })
      i++
    } else {
      result.push({ type: isPortrait(photo) ? 'portrait' : 'landscape', photos: [photo] })
    }
  }
  return result
})
</script>

<template>
  <NotFoundView v-if="!project" />

  <article v-else class="px-2 pt-32 pb-28 lg:pt-40">
    <div class="page">
      <header>
        <RouterLink
          :to="{ name: 'projects', query: { categoria: project.categoria.slug } }"
          class="text-cuerpo-sm lowercase text-texto/65 decoration-1 underline-offset-4 hover:underline"
        >
          {{ project.categoria.nombre }}
        </RouterLink>
        <h1 class="mt-3 font-display text-h1">{{ project.titulo }}</h1>

        <div class="mt-10 grid gap-10 lg:grid-cols-12">
          <p class="max-w-[60ch] lg:col-span-7">{{ project.descripcion }}</p>
          <ProjectFacts :project="project" class="lg:col-span-4 lg:col-start-9" />
        </div>
      </header>

      <div class="mt-16 flex flex-col gap-6 lg:mt-24 lg:gap-10">
        <template v-for="(row, r) in rows" :key="row.photos[0].src">
          <ResponsiveImage
            v-if="row.type === 'landscape'"
            v-bind="row.photos[0]"
            :loading="r === 0 ? 'eager' : 'lazy'"
            sizes="(min-width: 1440px) 1320px, calc(100vw - 4rem)"
          />
          <div v-else-if="row.type === 'pair'" class="grid gap-6 md:grid-cols-2 lg:gap-10">
            <ResponsiveImage
              v-for="photo in row.photos"
              :key="photo.src"
              v-bind="photo"
              :loading="r === 0 ? 'eager' : 'lazy'"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
          <ResponsiveImage
            v-else
            v-bind="row.photos[0]"
            :loading="r === 0 ? 'eager' : 'lazy'"
            sizes="(min-width: 768px) 50vw, 100vw"
            class="w-full md:mx-auto md:w-1/2"
          />
        </template>
      </div>

      <nav
        v-if="around.previous"
        aria-label="Otros proyectos"
        class="mt-24 grid grid-cols-2 gap-6 border-t border-primario pt-6"
      >
        <RouterLink :to="{ name: 'project', params: { slug: around.previous.slug } }" class="group">
          <span class="block text-cuerpo-sm text-texto/65">anterior</span>
          <span class="mt-2 block font-display text-h4 decoration-1 underline-offset-4 group-hover:underline">
            {{ around.previous.titulo }}
          </span>
        </RouterLink>
        <RouterLink
          :to="{ name: 'project', params: { slug: around.next.slug } }"
          class="group text-right"
        >
          <span class="block text-cuerpo-sm text-texto/65">siguiente</span>
          <span class="mt-2 block font-display text-h4 decoration-1 underline-offset-4 group-hover:underline">
            {{ around.next.titulo }}
          </span>
        </RouterLink>
      </nav>
    </div>
  </article>
</template>
