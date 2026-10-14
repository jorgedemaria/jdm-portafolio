<script setup>
import AppButton from '../components/AppButton.vue'
</script>

<template>
  <section class="px-2 pt-32 pb-24 lg:pt-40">
    <div class="page">
    <h1 class="font-display text-h1">Esta página no existe</h1>
    <p class="mt-6 max-w-[60ch]">Puede que el enlace esté mal escrito o que el proyecto ya no esté publicado.</p>
    <AppButton :to="{ name: 'projects' }" size="md" class="mt-10">Ver proyectos</AppButton>
    </div>
  </section>
</template>
