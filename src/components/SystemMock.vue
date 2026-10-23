<script setup>
import { computed } from 'vue'
import ResponsiveImage from './ResponsiveImage.vue'
import { site } from '../data/site'
import { thirdsLayout, thirdsStyle, thirdsGutter, THIRDS_CLASS } from '../composables/thirdsLayout'

/*
 * Maqueta de una página de registro (solo para /guia): navbar, foto principal, ficha, galería en
 * tercios y pie, con un registro real, en una de las propuestas de sistema:
 * 'ficha' (ficha técnica), 'minimo', 'cajas' (menú en cajas en tercios), 'lugar' (la foto manda),
 * 'monumento' (el nombre como monumento), 'oscuro' (cuarto oscuro) y 'mezcla' (el navbar de
 * 'monumento' con todo lo demás de 'lugar').
 */
const props = defineProps({
  variant: { type: String, required: true },
  project: { type: Object, required: true },
})

const hero = computed(() => props.project.fotos[0])
const gallery = computed(() => props.project.fotos.slice(1, 8))
const placement = computed(() => thirdsLayout(gallery.value, (p) => p.height > p.width))
const links = site.nav.map((item) => item.label)
const facts = computed(() => [
  ['categoría', props.project.categoria.nombre.toLowerCase()],
  ['año', String(props.project.año)],
  ['lugar', props.project.lugar],
  ['arquitectura', props.project.arquitecto],
])
const dark = computed(() => props.variant === 'oscuro')
// En la ficha en tercios: categoría y año en el 1º, lugar en el 2º, arquitectura en el 3º
const factCol = (i) => (i < 2 ? 'col-start-1' : i === 2 ? 'col-start-2' : 'col-start-3')
const lineas = computed(() => (dark.value ? 'border-fondo/40' : 'border-primario'))
</script>

<template>
  <div
    :class="[
      'overflow-hidden border border-texto/15 p-4 md:p-6',
      dark ? 'bg-texto text-fondo' : 'bg-fondo text-texto',
    ]"
  >
    <!-- ── NAVBAR ─────────────────────────────────────────── -->
    <!-- Ficha técnica / cuarto oscuro: una regla de tercios -->
    <div
      v-if="variant === 'ficha' || variant === 'oscuro'"
      :class="['grid grid-cols-3 items-center border-b pb-3', lineas]"
    >
      <span class="w-fit bg-acento px-3 pt-1.5 pb-1 text-h4 leading-none font-extrabold text-primario">{{
        site.wordmark
      }}</span>
      <span class="font-display text-h4">← {{ project.titulo }}</span>
      <span :class="['flex justify-between text-boton', dark ? 'text-acento' : 'text-primario']">
        <span v-for="label in links" :key="label">{{ label }}</span>
        <span>escríbeme</span>
      </span>
    </div>

    <!-- Mínimo: sin bloques, todo texto -->
    <div v-else-if="variant === 'minimo'" class="grid grid-cols-3 items-baseline pb-3">
      <span class="text-h4 font-extrabold text-primario">{{ site.wordmark }}</span>
      <span class="text-boton">{{ project.titulo }} ←</span>
      <span class="flex justify-between text-boton text-primario">
        <span v-for="(label, i) in links" :key="label" :class="i === 1 && 'underline decoration-acento decoration-2 underline-offset-4'">{{
          label
        }}</span>
        <span>escríbeme</span>
      </span>
    </div>

    <!-- Menú en cajas: 4 enlaces en el 2º tercio, escríbeme en el 3º -->
    <div v-else-if="variant === 'cajas'" class="pb-3">
      <div class="grid grid-cols-3 items-center">
        <span class="w-fit bg-acento px-3 pt-1.5 pb-1 text-h4 leading-none font-extrabold text-primario">{{
          site.wordmark
        }}</span>
        <span class="grid h-10 grid-cols-4 divide-x divide-primario border border-primario text-boton text-primario">
          <span v-for="label in links" :key="label" class="flex items-center justify-end px-2">{{ label }}</span>
        </span>
        <span class="flex h-10 items-center justify-end border border-l-0 border-primario bg-primario px-3 text-boton text-fondo">
          escríbeme
        </span>
      </div>
      <p class="col-start-2 mt-2 ml-[33.333%] font-display text-h4">← {{ project.titulo }}</p>
    </div>

    <!-- El nombre como monumento: el nombre a todo el ancho, el menú en una esquina -->
    <div v-else-if="variant === 'monumento' || variant === 'mezcla'" class="pb-3">
      <div class="flex justify-end gap-4 text-boton text-primario">
        <span v-for="label in links" :key="label">{{ label }}</span>
        <span>escríbeme</span>
      </div>
      <p class="mt-2 text-[clamp(2rem,7.5vw,6.5rem)] leading-[0.85] font-extrabold tracking-[-0.04em] whitespace-nowrap text-primario">
        {{ site.wordmark }}
      </p>
    </div>

    <!-- ── FOTO PRINCIPAL ─────────────────────────────────── -->
    <div class="relative">
      <div class="aspect-video">
        <ResponsiveImage v-bind="hero" fill sizes="(min-width: 1024px) 80vw, 100vw" />
      </div>
      <!-- La foto manda: el menú encima en las esquinas y el nombre del registro como título de película -->
      <template v-if="variant === 'lugar' || variant === 'mezcla'">
        <div v-if="variant === 'lugar'" class="absolute inset-x-0 top-0 flex items-start justify-between p-4 text-fondo">
          <span class="text-boton font-extrabold">{{ site.wordmark }}</span>
          <span class="flex gap-4 text-boton">
            <span v-for="label in links" :key="label">{{ label }}</span>
            <span>escríbeme</span>
          </span>
        </div>
        <p
          class="absolute inset-x-0 bottom-0 p-4 font-display text-[clamp(2rem,6vw,5rem)] leading-[0.9] tracking-[-0.03em] text-fondo"
        >
          {{ project.titulo }}
        </p>
      </template>
    </div>

    <!-- ── FICHA ──────────────────────────────────────────── -->
    <!-- En tercios, con línea arriba (ficha técnica, monumento, cuarto oscuro) o sin línea (mínimo) -->
    <dl
      v-if="['ficha', 'oscuro', 'monumento', 'minimo'].includes(variant)"
      :class="[
        'mt-4 grid grid-flow-row-dense grid-cols-3 gap-y-1 text-cuerpo-sm',
        variant !== 'minimo' && ['border-t pt-3', lineas],
      ]"
    >
      <div v-for="([label, value], i) in facts" :key="label" :class="['flex gap-2', factCol(i)]">
        <dt v-if="variant !== 'minimo'" :class="['font-light', dark ? 'text-acento' : 'text-primario']">{{ label }}</dt>
        <dd>{{ value }}</dd>
      </div>
    </dl>
    <!-- Cajas: la ficha en lista, bajo el 2º tercio -->
    <div v-else-if="variant === 'cajas'" class="mt-4 grid grid-cols-3">
      <dl class="col-start-2 divide-y divide-primario border border-primario text-cuerpo-sm">
        <div v-for="[label, value] in facts" :key="label" class="flex justify-between gap-4 px-3 py-2">
          <dt class="font-light text-primario">{{ label }}</dt>
          <dd class="text-right">{{ value }}</dd>
        </div>
      </dl>
    </div>
    <!-- La foto manda: una sola línea chica bajo la foto -->
    <p v-else-if="variant === 'lugar' || variant === 'mezcla'" class="mt-3 text-cuerpo-sm">
      {{ facts.map(([, value]) => value).join(' · ') }}
    </p>

    <!-- ── GALERÍA EN TERCIOS (igual que el sitio) ────────── -->
    <ul class="mt-8 grid grid-cols-3 gap-y-6">
      <li
        v-for="(photo, i) in gallery"
        :key="photo.src"
        :class="[THIRDS_CLASS, thirdsGutter(placement[i])]"
        :style="thirdsStyle(placement[i])"
      >
        <ResponsiveImage v-bind="photo" sizes="(min-width: 1024px) 40vw, 50vw" />
      </li>
    </ul>

    <!-- ── PIE ────────────────────────────────────────────── -->
    <!-- El nombre vuelve a todo el ancho (la foto manda, monumento) -->
    <p
      v-if="['lugar', 'monumento', 'mezcla'].includes(variant)"
      class="mt-10 text-[clamp(2rem,7.5vw,6.5rem)] leading-[0.85] font-extrabold tracking-[-0.04em] whitespace-nowrap text-primario"
    >
      {{ site.wordmark }}
    </p>
    <!-- Cajas: celdas con líneas, una por tercio -->
    <div
      v-if="variant === 'cajas'"
      class="mt-10 grid grid-cols-3 gap-px border border-primario bg-primario text-cuerpo-sm text-primario"
    >
      <span class="bg-fondo px-3 py-2">{{ site.email }}</span>
      <span class="bg-fondo px-3 py-2">@{{ site.instagram }} · {{ site.telefono.replace(/\s/g, '') }}</span>
      <span class="bg-fondo px-3 py-2">{{ site.ubicacion }} · 2026</span>
    </div>
    <!-- En tercios, con línea arriba (o sin ella en mínimo) -->
    <div
      v-else
      :class="[
        'grid grid-cols-3 text-cuerpo-sm',
        ['lugar', 'monumento', 'mezcla'].includes(variant) ? 'mt-4' : 'mt-10',
        variant !== 'minimo' && ['border-t pt-3', lineas],
        dark ? 'text-acento' : 'text-primario',
      ]"
    >
      <span class="underline decoration-acento decoration-2 underline-offset-4">{{ site.email }}</span>
      <span>@{{ site.instagram }} · {{ site.telefono.replace(/\s/g, '') }}</span>
      <span>{{ site.ubicacion }} · 2026</span>
    </div>
  </div>
</template>
