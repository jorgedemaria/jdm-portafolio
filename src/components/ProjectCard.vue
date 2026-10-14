<script setup>
import ResponsiveImage from './ResponsiveImage.vue'

defineProps({
  project: { type: Object, required: true },
  // Nivel del título según la página donde se use
  headingLevel: { type: Number, default: 2 },
})
</script>

<template>
  <RouterLink :to="{ name: 'project', params: { slug: project.slug } }" class="group block">
    <ResponsiveImage
      v-bind="project.portada"
      ratio="4 / 3"
      sizes="(min-width: 1280px) 30vw, (min-width: 768px) 46vw, 100vw"
    />
    <component
      :is="`h${headingLevel}`"
      class="mt-4 font-display text-h4 decoration-1 underline-offset-4 group-hover:underline"
    >
      {{ project.titulo }}
    </component>
    <div class="mt-2 flex justify-between gap-4 text-cuerpo-sm">
      <p>{{ project.lugar }}</p>
      <p class="text-texto/65 tabular-nums">{{ project.año }}</p>
    </div>
  </RouterLink>
</template>
