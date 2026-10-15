<script setup>
import { ref, computed, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import ResponsiveImage from '../components/ResponsiveImage.vue'
import NotFoundView from './NotFoundView.vue'
import { findProject } from '../data/content'
import { useNavSectionTitle } from '../composables/useNavSectionTitle'
import { navTitlePlain } from '../composables/useMenu'
import { useScrollReveal } from '../composables/useScrollReveal'

const props = defineProps({
  slug: { type: String, required: true },
})

const project = computed(() => findProject(props.slug))

// Desde 768 px el nombre del proyecto se muestra debajo del logo, con su animación y sin
// fondo: queda sobre la foto
const root = ref(null)
useNavSectionTitle(root, () => project.value?.titulo ?? '')
onMounted(() => (navTitlePlain.value = true))
onBeforeUnmount(() => (navTitlePlain.value = false))

watchEffect(() => {
  document.title = project.value
    ? `${project.value.titulo} — Jorge de María`
    : 'Página no encontrada — Jorge de María'
})

// Datos del proyecto, como la grilla de las tarjetas (filas separadas por líneas)
const facts = computed(() => [
  ['año', String(project.value.año)],
  ['lugar', project.value.lugar],
  ['arquitectura', project.value.arquitecto],
  ...Object.entries(project.value.ficha ?? {}).map(([label, value]) => [label.toLowerCase(), value]),
])

const firstPhoto = computed(() => project.value?.fotos[0])

/*
 * Resto de la galería: las verticales seguidas se agrupan de a dos, lado a lado.
 * Cada foto se ve completa, sin recortes, y nunca más alta que la pantalla.
 */
const rows = computed(() => {
  if (!project.value) return []
  const result = []
  const photos = project.value.fotos.slice(1)
  const isPortrait = (p) => p && p.height > p.width
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const next = photos[i + 1]
    if (isPortrait(photo) && isPortrait(next)) {
      result.push({ type: 'pair', photos: [photo, next] })
      i++
    } else {
      result.push({ type: 'single', photos: [photo] })
    }
  }
  return result
})

// Las fotos de la galería se desenrollan con el scroll a medida que aparecen
const reveal = useScrollReveal()

// Ancho para que la foto quepa entera en la pantalla (deja aire para el navbar)
const fitWidth = (photo) => ({
  width: `min(100%, calc((100svh - 8rem) * ${photo.width / photo.height}))`,
})
</script>

<template>
  <NotFoundView v-if="!project" />

  <article v-else ref="root" class="pb-16">
    <!--
      Primera foto: ocupa toda la pantalla, desde arriba. Mientras se ve, el navbar va sin
      fondo encima de ella (data-nav-overlay, como el stack de Inicio).
    -->
    <div class="relative h-svh w-full" data-nav-overlay>
      <ResponsiveImage v-bind="firstPhoto" fill loading="eager" sizes="100vw" />

      <!-- En móvil el título va sobre la foto, debajo del logo; desde 768 px, en el navbar -->
      <div class="absolute inset-x-0 top-0 px-2 pt-20 md:sr-only">
        <h1 class="page font-display text-h1">{{ project.titulo }}</h1>
      </div>

      <!-- Datos en la esquina inferior izquierda de la foto, alineados con el título -->
      <div class="absolute inset-x-0 bottom-0 px-2 pb-6">
        <div class="page">
          <dl class="divide-y divide-primario border border-primario bg-fondo text-cuerpo-sm md:w-2/5">
            <div class="flex items-baseline justify-between gap-4 px-3 py-2.5">
              <dt class="text-texto/65">categoría</dt>
              <dd class="text-right">
                <RouterLink
                  :to="{ name: 'projects', query: { categoria: project.categoria.slug } }"
                  class="lowercase text-texto decoration-1 underline-offset-4 hover:underline"
                >
                  {{ project.categoria.nombre }}
                </RouterLink>
              </dd>
            </div>
            <div
              v-for="[label, value] in facts"
              :key="label"
              class="flex items-baseline justify-between gap-4 px-3 py-2.5"
            >
              <dt class="text-texto/65">{{ label }}</dt>
              <dd class="text-right text-texto">{{ value }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>

    <div class="px-2">
      <div class="page">
        <div class="mt-6 flex flex-col gap-6 lg:mt-10 lg:gap-10">
          <template v-for="row in rows" :key="row.photos[0].src">
            <div v-if="row.type === 'pair'" class="grid gap-6 md:grid-cols-2 lg:gap-10">
              <div
                v-for="photo in row.photos"
                :key="photo.src"
                :ref="reveal"
                class="mx-auto overflow-hidden"
                :style="fitWidth(photo)"
              >
                <ResponsiveImage v-bind="photo" sizes="(min-width: 768px) 50vw, 100vw" />
              </div>
            </div>
            <div v-else :ref="reveal" class="mx-auto overflow-hidden" :style="fitWidth(row.photos[0])">
              <ResponsiveImage v-bind="row.photos[0]" sizes="(min-width: 1440px) 1320px, 100vw" />
            </div>
          </template>
        </div>
      </div>
    </div>
  </article>
</template>
