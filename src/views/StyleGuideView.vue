<script setup>
import AppButton from '../components/AppButton.vue'

const colors = [
  { name: 'fondo', hex: '#F1F0E2', class: 'bg-fondo border border-texto' },
  { name: 'primario', hex: '#207349', class: 'bg-primario' },
  { name: 'acento', hex: '#C82A58', class: 'bg-acento' },
  { name: 'texto', hex: '#101010', class: 'bg-texto' },
]

const type = [
  { token: 'h1', class: 'font-display text-h1', sample: 'Nave de producción, planta norte' },
  { token: 'h2', class: 'font-display text-h2', sample: 'Nave de producción, planta norte' },
  { token: 'h3', class: 'font-display text-h3', sample: 'Nave de producción, planta norte' },
  { token: 'h4', class: 'font-display text-h4', sample: 'Nave de producción, planta norte' },
  { token: 'cuerpo', class: 'text-cuerpo', sample: 'Hormigón, acero y luz de la tarde.' },
  { token: 'cuerpo-sm', class: 'text-cuerpo-sm', sample: 'Hormigón, acero y luz de la tarde.' },
  { token: 'etiqueta', class: 'text-etiqueta', sample: 'Planta norte, 2025' },
  { token: 'logo', class: 'text-logo text-primario', sample: 'jorge de maría' },
]
</script>

<template>
  <div class="px-2 pt-32 pb-24 lg:pt-40">
    <div class="page">
    <h1 class="font-display text-h1">Guía de estilos</h1>
    <p class="mt-4 text-cuerpo-sm">Solo visible en desarrollo.</p>

    <section class="mt-16" aria-labelledby="g-colores">
      <h2 id="g-colores" class="font-display text-h3">Colores</h2>
      <ul class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <li v-for="c in colors" :key="c.name">
          <div :class="['aspect-square', c.class]" />
          <p class="mt-2 text-cuerpo-sm">{{ c.name }} <span class="opacity-70">{{ c.hex }}</span></p>
        </li>
      </ul>
    </section>

    <section class="mt-16" aria-labelledby="g-tipo">
      <h2 id="g-tipo" class="font-display text-h3">Tipografía</h2>
      <dl class="mt-6 divide-y divide-texto/15">
        <div v-for="t in type" :key="t.token" class="grid gap-2 py-4 sm:grid-cols-[8rem_1fr] sm:items-baseline">
          <dt class="text-etiqueta">{{ t.token }}</dt>
          <dd :class="t.class">{{ t.sample }}</dd>
        </div>
      </dl>
    </section>

    <section class="mt-16" aria-labelledby="g-botones">
      <h2 id="g-botones" class="font-display text-h3">Botones</h2>
      <p class="mt-4 max-w-[60ch] text-cuerpo-sm">Pasa el cursor para ver el hover y usa Tab para ver el foco.</p>
      <div class="mt-8 flex flex-wrap items-center gap-6">
        <AppButton>Escríbeme</AppButton>
        <AppButton variant="secundario">Ver proyecto</AppButton>
        <AppButton disabled>Desactivado</AppButton>
      </div>
      <div class="mt-6 flex flex-wrap items-center gap-6">
        <AppButton size="md">Escríbeme</AppButton>
        <AppButton size="md" variant="secundario">Ver proyectos</AppButton>
        <AppButton size="md" :arrow="false" type="submit">Enviar mensaje</AppButton>
      </div>
    </section>
    </div>
  </div>
</template>
