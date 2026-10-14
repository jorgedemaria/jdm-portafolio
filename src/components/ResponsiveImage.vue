<script setup>
import { ref, computed, onMounted } from 'vue'

/*
 * Imagen responsive con AVIF/WebP y JPG de respaldo.
 * `src` es la ruta base sin ancho ni extensión: '/images/x/hero' → hero-800.avif, hero-1600.webp…
 * `width` y `height` son las proporciones del original; reservan el espacio antes de cargar.
 */
const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  widths: { type: Array, default: () => [800, 1600, 2400] },
  sizes: { type: String, default: '100vw' },
  // 'eager' solo para la imagen principal visible al cargar
  loading: { type: String, default: 'lazy' },
  // Rellena su contenedor recortando la foto (object-cover) en vez de reservar su proporción
  fill: { type: Boolean, default: false },
  // Proporción fija (ej. '4 / 3'); la foto se recorta para llenarla
  ratio: { type: String, default: null },
  // Punto de la foto que no se debe recortar (object-position), ej. '50% 30%'
  foco: { type: String, default: null },
  // Color promedio de la foto: fondo mientras carga
  color: { type: String, default: null },
})

const loaded = ref(false)
const img = ref(null)

const srcset = (ext) => props.widths.map((w) => `${props.src}-${w}.${ext} ${w}w`).join(', ')
const fallback = computed(() => `${props.src}-${props.widths[1] ?? props.widths[0]}.jpg`)

// La imagen puede venir de caché y estar completa antes de montar
onMounted(() => {
  if (img.value?.complete) loaded.value = true
})
</script>

<template>
  <picture
    :class="['block overflow-hidden', !color && 'bg-texto/5', fill && 'size-full']"
    :style="{
      backgroundColor: color,
      aspectRatio: fill ? null : (ratio ?? `${width} / ${height}`),
    }"
  >
    <source type="image/avif" :srcset="srcset('avif')" :sizes="sizes" />
    <source type="image/webp" :srcset="srcset('webp')" :sizes="sizes" />
    <img
      ref="img"
      :src="fallback"
      :srcset="srcset('jpg')"
      :sizes="sizes"
      :alt="alt"
      :width="width"
      :height="height"
      :loading="loading"
      :fetchpriority="loading === 'eager' ? 'high' : 'auto'"
      decoding="async"
      :style="foco ? { objectPosition: foco } : null"
      :class="[
        'size-full object-cover transition-opacity duration-700 ease-out',
        loaded ? 'opacity-100' : 'opacity-0',
      ]"
      @load="loaded = true"
    />
  </picture>
</template>
