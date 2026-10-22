<script setup>
/*
 * Ficha de un proyecto, como la grilla de las tarjetas: filas tipo menú separadas por líneas,
 * etiqueta a la izquierda y dato a la derecha. La categoría lleva a Registros filtrado.
 */
defineProps({
  project: { type: Object, required: true },
  // [etiqueta, dato] de cada fila después de la categoría
  facts: { type: Array, required: true },
})
</script>

<template>
  <dl class="divide-y divide-primario text-cuerpo-sm text-primario">
    <div class="flex items-baseline justify-between gap-4 px-3 py-2.5">
      <dt class="font-light">categoría</dt>
      <dd class="text-right text-texto">
        <RouterLink
          :to="{ name: 'projects', query: { categoria: project.categoria.slug } }"
          class="lowercase decoration-1 underline-offset-4 hover:underline"
        >
          {{ project.categoria.nombre }}
        </RouterLink>
      </dd>
    </div>
    <div v-for="[label, value] in facts" :key="label" class="flex items-baseline justify-between gap-4 px-3 py-2.5">
      <dt class="font-light">{{ label }}</dt>
      <dd class="text-right text-texto">{{ value }}</dd>
    </div>
  </dl>
</template>
