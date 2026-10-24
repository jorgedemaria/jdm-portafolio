<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

/*
 * Retícula a la vista (solo en desarrollo): la tecla G la muestra u oculta. Repite la misma caja
 * que las páginas (section px-2 + .page) para dibujar:
 * - los márgenes laterales (teñidos),
 * - los tres tercios (desde 768 px; en móvil, una columna),
 * - el aire a la derecha de cada tercio (pr-6, pr-10 desde 1024 px), donde termina lo de la columna,
 * - la línea de los enlaces del menú (--menu-inicio), que siguen el pie, Registros y la 404.
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

const label = 'absolute top-2 left-1 font-mono text-[0.625rem] leading-none text-acento'
</script>

<template>
  <div v-if="shown" class="pointer-events-none fixed inset-0 z-[100]" aria-hidden="true">
    <div class="absolute inset-0 px-2">
      <div class="page relative h-full">
        <!-- La sombra tiñe los márgenes: todo lo que queda fuera de la caja de contenido -->
        <div class="relative grid h-full grid-cols-1 shadow-[0_0_0_100vmax_rgb(200_42_88/0.07)] md:grid-cols-3">
          <div
            v-for="n in 3"
            :key="n"
            :class="['relative h-full border-x border-acento/50', n > 1 && 'hidden md:block']"
          >
            <!-- Columna: lo que ocupa el contenido -->
            <div class="absolute inset-y-0 left-0 right-0 bg-acento/8 md:right-6 lg:right-10" />
            <!-- Aire a la derecha de la columna -->
            <div class="reticula-aire absolute inset-y-0 right-0 hidden w-6 md:block lg:w-10" />
            <span :class="[label, 'hidden md:block']">{{ n }}/3</span>
            <span :class="[label, 'md:hidden']">1 columna</span>
            <span :class="[label, 'top-6 hidden md:block']">aire 24 · 40 px</span>
          </div>
          <!-- Comienzo de los enlaces del menú, medido desde el borde izquierdo del contenido -->
          <div class="absolute inset-y-0 left-(--menu-inicio) hidden border-l-2 border-dashed border-primario lg:block">
            <span class="absolute top-10 left-1 font-mono text-[0.625rem] leading-none whitespace-nowrap text-primario"
              >menú · pie · registros</span
            >
          </div>
        </div>
      </div>
    </div>
    <span class="absolute bottom-2 left-2 font-mono text-[0.625rem] text-acento">margen 16 px · 48 px desde 1280 · máx. 1440 · G oculta</span>
  </div>
</template>

<style scoped>
.reticula-aire {
  background: repeating-linear-gradient(-45deg, rgb(200 42 88 / 0.25) 0 1px, transparent 1px 6px);
}
</style>
