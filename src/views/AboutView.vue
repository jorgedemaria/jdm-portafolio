<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useScrambleText, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'
import { useCopyEmail } from '../composables/useCopyEmail'
import { site } from '../data/site'

/*
 * Mientras se escribe la página: un mensaje con dos enlaces en bloque rosado que se arman con
 * letras al azar al llegar. "registros" lleva a la lista; "escríbeme" copia el correo, como en
 * contacto: la palabra se baraja hasta "copiado!" y unos segundos después vuelve.
 */
const SCRAMBLE = { stagger: 35, scramble: 380, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER }
const START_DELAY = 300 // después del fundido entre páginas
const PROJECTS = 'registros'
const WRITE_ME = 'escríbeme'

const shown = ref(false)
const blank = (text) => ' '.repeat(text.length)
const projectsText = useScrambleText(computed(() => (shown.value ? PROJECTS : blank(PROJECTS))), SCRAMBLE)
const { copied, copy } = useCopyEmail()
const writeMeText = useScrambleText(
  computed(() => (!shown.value ? blank(WRITE_ME) : copied.value ? 'copiado!' : WRITE_ME)),
  SCRAMBLE,
)

let timer = 0
onMounted(() => (timer = setTimeout(() => (shown.value = true), START_DELAY)))
onBeforeUnmount(() => clearTimeout(timer))

// Enlaces con el subrayado rosado del resto del sitio (sin bloque)
const block = 'whitespace-pre text-ui underline decoration-linea decoration-2 underline-offset-4'
</script>

<template>
  <section class="px-2 pt-6 pb-16">
    <!--
      Retícula de tercios, como Registros y el detalle: el título en el 1º tercio y el mensaje desde
      el 2º (donde empiezan las fotos allá); en móvil, bajo el título
    -->
    <div class="page md:grid md:grid-cols-6 md:items-baseline md:gap-x-6 lg:gap-x-10">
      <h1 class="font-display text-h1 text-titulo md:col-span-2">Sobre mí</h1>

      <p class="mt-4 max-w-[40ch] text-boton text-dato md:col-span-4 md:col-start-3 md:mt-0">
        aún no sé qué compartir de mi. mientras revisa mis
        <RouterLink :to="{ name: 'projects' }" :class="block" :aria-label="PROJECTS"
          ><span aria-hidden="true">{{ projectsText }}</span></RouterLink
        >
        o
        <button type="button" :class="['cursor-pointer', block]" :aria-label="`Copiar correo ${site.email}`" title="clickea :)" @click="copy">
          <span aria-hidden="true">{{ writeMeText }}</span></button
        >.
      </p>
      <p class="sr-only" aria-live="polite">{{ copied ? 'Correo copiado' : '' }}</p>
    </div>
  </section>
</template>
