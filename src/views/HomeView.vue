<script setup>
import PhotoStack from '../components/PhotoStack.vue'
import ResponsiveImage from '../components/ResponsiveImage.vue'
import ProjectFacts from '../components/ProjectFacts.vue'
import AppButton from '../components/AppButton.vue'
import { heroPhotos, latestProject } from '../data/content'

const projectLink = latestProject ? { name: 'project', params: { slug: latestProject.slug } } : null
</script>

<template>
  <section aria-label="Fotografías destacadas" data-nav-overlay>
    <h1 class="sr-only">Jorge de María, fotografía de arquitectura</h1>
    <PhotoStack :photos="heroPhotos" />
  </section>

  <section v-if="latestProject" aria-labelledby="ultimo-proyecto" class="px-2 pt-28 pb-28 lg:pt-36">
    <div class="page">
      <h2 id="ultimo-proyecto" class="font-display text-h2">Último proyecto</h2>

      <article class="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
        <!-- La foto repite el enlace del botón; se oculta a lectores de pantalla y al teclado -->
        <RouterLink :to="projectLink" class="block lg:col-span-8" tabindex="-1" aria-hidden="true">
          <ResponsiveImage
            v-bind="latestProject.portada"
            sizes="(min-width: 1024px) 62vw, 100vw"
          />
        </RouterLink>

        <div class="flex flex-col lg:col-span-4 lg:justify-end">
          <p class="text-cuerpo-sm lowercase text-texto/65">{{ latestProject.categoria.nombre }}</p>
          <h3 class="mt-3 font-display text-h3">{{ latestProject.titulo }}</h3>
          <ProjectFacts :project="latestProject" compact class="mt-6" />
          <p class="mt-6 max-w-[45ch]">{{ latestProject.descripcion }}</p>
          <AppButton :to="projectLink" variant="secundario" size="md" class="mt-8 self-start">
            Ver proyecto
          </AppButton>
        </div>
      </article>
    </div>
  </section>
</template>
