<script setup>
/*
 * Cursor de texto, como el de cuando se escribe: una barra delgada del alto de las letras,
 * justo después del último carácter. No ocupa espacio (ancho 0), así el texto no se mueve.
 * state: 'typing' fijo mientras se escribe, 'idle' parpadeando en las pausas, 'off' oculto.
 */
defineProps({
  state: { type: String, default: 'off' },
})
</script>

<template>
  <span v-if="state !== 'off'" class="caret-box" aria-hidden="true">
    <span :class="['caret', state === 'idle' && 'caret-blink']" />
  </span>
</template>

<style scoped>
/* Caja sin ancho apoyada en la línea base; la barra se dibuja en el espacio siguiente */
.caret-box {
  position: relative;
  display: inline-block;
  width: 0;
  height: 0.78em;
}
.caret {
  position: absolute;
  top: -0.04em;
  bottom: -0.1em;
  left: 0.06em;
  width: max(2px, 0.06em);
  background: currentColor;
}
.caret-blink {
  animation: caret-blink 1s steps(1) infinite;
}
@keyframes caret-blink {
  50% {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .caret-blink {
    animation: none;
  }
}
</style>
