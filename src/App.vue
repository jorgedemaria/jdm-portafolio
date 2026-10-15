<script setup>
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import AppNav from "./components/AppNav.vue";
import AppIntro from "./components/AppIntro.vue";
import AppFooter from "./components/AppFooter.vue";
import {
  menuOpen,
  menuHeight,
  menuHorizontal,
  navOverPhotos,
  navSectionTitle,
} from "./composables/useMenu";
import { introLeaving } from "./composables/useIntro";

/*
 * La intro sale cada vez que se entra por Inicio; al entrar directo a otra página, no. Sin
 * intro, el resto del sitio (logo, datos de un proyecto) se arma de inmediato como si ya hubiera salido.
 */
const showIntro = ref(window.location.pathname === "/");
if (!showIntro.value) introLeaving.value = true;

/*
 * Al abrir el menú, el contenido (y el pie) bajan lo que mide el menú + 24 px, así el menú
 * nunca queda encima de nada. Sobre el stack de fotos no: ahí bajan solo sus líneas.
 * Con un título de sección bajo el logo se usa el mismo ritmo que ese título.
 */
const MENU_GAP = 24;
// En Inicio no se baja nada (asomaría el fondo crema); "últimos trabajos" se corre por su cuenta
const route = useRoute();
const contentPush = computed(() =>
  menuOpen.value && !navOverPhotos.value && menuHeight.value && route.name !== "home"
    ? menuHeight.value + MENU_GAP
    : 0,
);
const titleBelowLogo = computed(() => !!navSectionTitle.value && menuHorizontal.value);
const pushClass = computed(() => {
  if (titleBelowLogo.value)
    return menuOpen.value
      ? "duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      : "delay-300 duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]";
  return "duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]";
});
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
  <!-- Columna de al menos una pantalla de alto: el contenido crece y el pie queda siempre al fondo -->
  <div
    :class="['flex min-h-svh flex-col transition-transform', pushClass]"
    :style="contentPush ? { transform: `translateY(${contentPush}px)` } : null"
  >
    <RouterView v-slot="{ Component, route }">
      <Transition name="page" mode="out-in">
        <main id="contenido" :key="route.path" tabindex="-1" class="flex-1 outline-none">
          <component :is="Component" />
        </main>
      </Transition>
    </RouterView>
    <AppFooter />
  </div>
</template>
