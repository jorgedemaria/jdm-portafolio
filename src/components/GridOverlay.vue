<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

/*
 * Retícula a la vista (solo en desarrollo): la tecla G la muestra u oculta. Repite la misma caja
 * que las páginas (section px-2 + .page) para dibujar:
 * - los márgenes laterales (teñidos),
 * - las 6 columnas (desde 768 px; los tercios, cada 2, más marcados; en móvil, una columna),
 * - el gutter entre columnas (24 px, 40 px desde 1024 px), la franja sin teñir,
 * - la línea de los enlaces del menú (--menu-inicio), que siguen el pie, Registros y la 404,
 * - la grilla horizontal de 8 px (más marcada cada 24 px), sobre toda la página: se mueve con el
 *   scroll, así se ve si los textos y los espacios caen en ella.
 */
const KEY = 'jdm:reticula'
const shown = ref(false)
try {
  shown.value = localStorage.getItem(KEY) === '1'
} catch {
  // Sin almacenamiento: empieza oculta
}

function onKeydown(event) {
  if (event.key.toLowerCase() !== 'g' || event.metaKey || event.ctrlKey || event.altKey) return
  if (event.target.closest?.('input, textarea, [contenteditable]')) return
  shown.value = !shown.value
  try {
    localStorage.setItem(KEY, shown.value ? '1' : '0')
  } catch {
    // Dura hasta recargar
  }
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

// Alto de la página, para que la grilla horizontal la cubra entera
const pageHeight = ref(0)
let pageObserver
onMounted(() => {
  pageObserver = new ResizeObserver(() => (pageHeight.value = document.documentElement.scrollHeight))
  pageObserver.observe(document.body)
})
onBeforeUnmount(() => pageObserver?.disconnect())

const label = 'absolute top-2 left-1 font-sans text-[0.625rem] leading-none text-acento'
</script>

<template>
  <!-- Grilla horizontal (8 px, cada 24 px más marcada), en toda la página -->
  <div
    v-if="shown"
    class="reticula-filas pointer-events-none absolute inset-x-0 top-0 z-[100]"
    :style="{ height: `${pageHeight}px` }"
    aria-hidden="true"
  />
  <div v-if="shown" class="pointer-events-none fixed inset-0 z-[100]" aria-hidden="true">
    <div class="absolute inset-0 px-2">
      <div class="page relative h-full">
        <!-- La sombra tiñe los márgenes: todo lo que queda fuera de la caja de contenido -->
        <!--
          6 columnas iguales con gutter (24 px, 40 px desde 1024 px): la franja sin teñir entre columnas; los
          comienzos de los tercios (columnas 1, 3 y 5) más marcados
        -->
        <div
          class="relative grid h-full grid-cols-1 shadow-[0_0_0_100vmax_rgb(200_42_88/0.07)] md:grid-cols-6 md:gap-x-6 lg:gap-x-10"
        >
          <div
            v-for="n in 6"
            :key="n"
            :class="[
              'relative h-full border-x border-acento/30',
              n % 2 === 1 && 'border-l-acento/80',
              n > 1 && 'hidden md:block',
            ]"
          >
            <div class="absolute inset-0 bg-acento/10" />
            <span :class="[label, 'hidden md:block']">{{ n }}/6</span>
            <span :class="[label, 'md:hidden']">1 columna</span>
          </div>
          <!-- Comienzo de los enlaces del menú, medido desde el borde izquierdo del contenido -->
          <div class="absolute inset-y-0 left-(--menu-inicio) hidden border-l-2 border-dashed border-primario lg:block">
            <span class="absolute top-10 left-1 font-sans text-[0.625rem] leading-none whitespace-nowrap text-primario"
              >menú · pie · registros</span
            >
          </div>
        </div>
      </div>
    </div>
    <span class="absolute bottom-2 left-2 font-sans text-[0.625rem] text-acento">margen 16 px · 48 px desde 1280 · máx. 1440 · filas de 8 px (24 px marcadas) · G oculta</span>
  </div>
</template>

<style scoped>
.reticula-filas {
  background:
    repeating-linear-gradient(to bottom, rgb(200 42 88 / 0.35) 0 1px, transparent 1px 24px),
    repeating-linear-gradient(to bottom, rgb(200 42 88 / 0.12) 0 1px, transparent 1px 8px);
}
</style>
