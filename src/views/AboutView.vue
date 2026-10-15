<script setup>
import { ref } from 'vue'
import { useNavSectionTitle } from '../composables/useNavSectionTitle'

const root = ref(null)
useNavSectionTitle(root, 'sobre mí')
</script>

<template>
  <section ref="root" class="px-2 pt-32 pb-16 md:pt-44">
    <div class="page">
    <!-- Desde 768 px el título se muestra debajo del logo (navbar), con su animación -->
    <h1 class="font-display text-h1 md:sr-only">Sobre mí</h1>
    <p class="mt-6 max-w-[60ch]">Esta página se construirá en los próximos pasos.</p>
    </div>
  </section>
</template>
