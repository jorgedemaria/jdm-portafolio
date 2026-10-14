<script setup>
import { computed } from 'vue'

/*
 * Ficha técnica de un proyecto. `compact` muestra solo año, lugar y arquitectura.
 */
const props = defineProps({
  project: { type: Object, required: true },
  compact: { type: Boolean, default: false },
})

const rows = computed(() => {
  const p = props.project
  const base = [
    ['Año', String(p.año)],
    ['Lugar', p.lugar],
    ['Arquitectura', p.arquitecto],
  ]
  if (props.compact) return base
  return [['Categoría', p.categoria.nombre], ...base, ...Object.entries(p.ficha)]
})
</script>

<template>
  <dl class="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-cuerpo-sm leading-lectura">
    <template v-for="[label, value] in rows" :key="label">
      <dt class="text-texto/65">{{ label }}</dt>
      <dd>{{ value }}</dd>
    </template>
  </dl>
</template>
