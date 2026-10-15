<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'

/*
 * Botón basado en "botón primario" de Figma (sin esquinas redondeadas): un bloque de color
 * con un bloque interior claro que contiene el texto, y la flecha ↗ a la derecha.
 * Hover: el bloque interior se rellena con el color del botón.
 * Clic: la flecha sale por la esquina superior derecha y vuelve por la inferior izquierda.
 */
const props = defineProps({
  // 'sm' reproduce las medidas del navbar; 'md' para llamadas a la acción en página
  size: { type: String, default: 'sm' },
  to: { type: [String, Object], default: null },
  type: { type: String, default: 'button' },
  arrow: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
})

const tag = computed(() => (props.to ? RouterLink : 'button'))

const attrs = computed(() => (props.to ? { to: props.to } : { type: props.type, disabled: props.disabled }))

const sizes = {
  sm: { outer: 'p-0.5 gap-px', inner: 'px-1 py-0.5', arrow: 'size-3 mx-0.5' },
  md: { outer: 'p-1 gap-1', inner: 'px-4 py-2.5', arrow: 'size-4 mx-2' },
}

const arrowAnimating = ref(false)

function onClick() {
  if (!props.arrow || props.disabled) return
  // Reinicia la animación si se hace clic varias veces seguidas
  arrowAnimating.value = false
  requestAnimationFrame(() => (arrowAnimating.value = true))
}

const s = computed(() => sizes[props.size] ?? sizes.sm)
</script>

<template>
  <component
    :is="tag"
    v-bind="attrs"
    @click="onClick"
    :class="[
      'group inline-flex shrink-0 items-center bg-primario text-boton text-fondo whitespace-nowrap',
      'transition-transform duration-150 active:translate-y-px',
      'disabled:cursor-not-allowed disabled:opacity-50',
      s.outer,
    ]"
  >
    <span
      :class="[
        'bg-fondo text-primario transition-colors duration-200 ease-out group-hover:bg-primario group-hover:text-fondo',
        s.inner,
      ]"
    >
      <slot />
    </span>
    <span v-if="arrow" :class="['block shrink-0 overflow-hidden', s.arrow]">
      <span
        :class="['block size-full', arrowAnimating && 'animate-arrow-through']"
        @animationend="arrowAnimating = false"
      >
        <svg
          class="size-full"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path d="M3 9 9 3M4 3h5v5" />
        </svg>
      </span>
    </span>
  </component>
</template>
