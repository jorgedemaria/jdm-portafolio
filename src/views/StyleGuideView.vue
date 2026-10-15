<script setup>
import { ref, onMounted } from 'vue'
import { paletas, aplicarPaleta, paletaGuardada } from '../composables/usePaleta'

const colors = [
  { name: 'fondo', class: 'bg-fondo border border-texto' },
  { name: 'primario', class: 'bg-primario' },
  { name: 'acento', class: 'bg-acento' },
  { name: 'texto', class: 'bg-texto' },
]

// Paleta en prueba: cambia todo el sitio y se recuerda al recorrerlo (ver usePaleta)
const activa = ref(paletaGuardada())
const hex = ref({})
function readColors() {
  const style = getComputedStyle(document.documentElement)
  hex.value = Object.fromEntries(colors.map((c) => [c.name, style.getPropertyValue(`--color-${c.name}`).trim()]))
}
function choose(nombre) {
  activa.value = aplicarPaleta(nombre)
  readColors()
}
onMounted(readColors)

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
      <p class="mt-4 max-w-[60ch] text-cuerpo-sm">
        Paleta en prueba: cambia todo el sitio (solo aquí, en desarrollo). La publicada es la de main.css.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button
          v-for="p in paletas"
          :key="p.nombre"
          type="button"
          :aria-pressed="activa === p.nombre"
          :class="[
            'cursor-pointer border border-primario px-3 py-1.5 text-cuerpo-sm',
            activa === p.nombre ? 'bg-primario text-fondo' : 'text-primario hover:bg-primario hover:text-fondo',
          ]"
          @click="choose(p.nombre)"
        >
          {{ p.nombre }}
        </button>
      </div>
      <ul class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <li v-for="c in colors" :key="c.name">
          <div :class="['aspect-square', c.class]" />
          <p class="mt-2 text-cuerpo-sm">{{ c.name }} <span class="opacity-70">{{ hex[c.name] }}</span></p>
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
    </div>
  </div>
</template>
