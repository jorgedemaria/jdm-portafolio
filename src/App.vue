<script setup>
import { ref } from "vue";
import AppNav from "./components/AppNav.vue";
import AppIntro from "./components/AppIntro.vue";

const showIntro = ref(true);
</script>

<template>
  <AppIntro v-if="showIntro" @done="showIntro = false" />
  <a
    href="#contenido"
    class="fixed top-2 left-2 z-[60] -translate-y-24 bg-primario px-4 py-2 text-fondo focus:translate-y-0"
  >
    Saltar al contenido
  </a>
  <AppNav />
  <RouterView v-slot="{ Component, route }">
    <Transition name="page" mode="out-in">
      <main id="contenido" :key="route.path" tabindex="-1" class="outline-none">
        <component :is="Component" />
      </main>
    </Transition>
  </RouterView>
</template>
