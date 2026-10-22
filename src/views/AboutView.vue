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
const block = 'whitespace-pre text-primario underline decoration-acento decoration-2 underline-offset-4'
</script>

<template>
  <section class="px-2 pt-6 pb-16">
    <div class="page">
      <h1 class="font-display text-h1">Sobre mí</h1>

      <p class="mt-6 max-w-[60ch]">
        aún no sé quién soy, mientras revisa mis
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
