<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppNav from "./components/AppNav.vue";
import AppFooter from "./components/AppFooter.vue";
import GridOverlay from "./components/GridOverlay.vue";
// Retícula a la vista con la tecla G, solo en desarrollo
const dev = import.meta.env.DEV;
import {
  menuOpen,
  menuHeight,
  navOverPhotos,
  navSectionTitle,
} from "./composables/useMenu";
import { introLeaving } from "./composables/useIntro";

/*
 * Entrada: al entrar por Inicio, el logo del navbar se escribe primero y recién entonces aparece el
 * resto (ver AppNav). Al entrar directo a otra página, todo está desde el principio.
 */
if (window.location.pathname !== "/") introLeaving.value = true;

/*
 * Al abrir el menú, el contenido (y el pie) bajan lo que mide el menú + 24 px, así el menú
 * nunca queda encima de nada. Sobre el stack de fotos no: ahí bajan solo sus líneas.
 * Con un título de sección bajo el logo se usa el mismo ritmo que ese título.
 */
const MENU_GAP = 24;
// En Inicio no se baja nada (asomaría el fondo crema); "últimos registros" se corre por su cuenta
const route = useRoute();
// Inicio empieza con una foto a pantalla completa bajo el navbar; el resto de las
// páginas empieza debajo del nombre grande del logo (--cabecera, lo mide AppNav)
const fullBleed = computed(() => route.name === "home");
const contentPush = computed(() =>
  menuOpen.value && !navOverPhotos.value && menuHeight.value && route.name !== "home"
    ? menuHeight.value + MENU_GAP
    : 0,
);
const titleBelowLogo = computed(() => !!navSectionTitle.value);
const pushClass = computed(() => {
  if (titleBelowLogo.value)
    return menuOpen.value
      ? "duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      : "delay-300 duration-500 ease-(--ease-persiana)";
  return "duration-500 ease-(--ease-persiana)";
});
</script>

<template>
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
    :style="{
      paddingTop: fullBleed ? null : 'var(--cabecera, 0px)',
      transform: contentPush ? `translateY(${contentPush}px)` : null,
    }"
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
  <GridOverlay v-if="dev" />
</template>
