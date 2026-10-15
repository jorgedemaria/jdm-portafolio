<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { site } from '../data/site'
import {
  useScrambleText,
  useScrambleReplay,
  SCRAMBLE_CHARSET_LOWER,
  SYMBOL_CHARSET,
} from '../composables/useScrambleText'
import { useCopyEmail } from '../composables/useCopyEmail'
import { useCaret, CARET_LINGER } from '../composables/useCaret'
import TypingCaret from './TypingCaret.vue'

/*
 * Cierre de Inicio, sin título: "¿necesitas fotos? escríbeme:" y el correo en grande.
 * Al llegar con el scroll, la frase se arma con letras al azar; después el correo, de
 * izquierda a derecha, y al final la carita: primero ":" y luego ")". Al salir de pantalla
 * se reinicia para repetirse. Al hacer clic, el correo se copia y se lee "copiado!".
 * Recién armada, la carita guiña un ojo: al segundo pasa a ";)" y vuelve a ":)". Después,
 * cada 7 a 10 segundos, se baraja con símbolos al azar (!*?#…) y vuelve a ":)". Al hacerle
 * clic copia el correo y gira 90° a la derecha mientras se lee "copiado!".
 * Un cursor de texto acompaña al correo y a la carita como si se tecleara: fijo mientras se
 * escribe, salta del correo a la carita y parpadea un momento al terminar.
 */
const PROMPT = '¿necesitas fotos? escríbeme:'
const SMILEY_DELAY = 400
const SMILEY_GAP = 350
// Pausa entre que termina la frase y empieza el correo
const EMAIL_PAUSE = 250
const BLINK_AFTER = 1000
const BLINK_HOLD = 400
const WINK_MIN = 7000
const WINK_MAX = 10000

const root = ref(null)

const stage = ref(0) // 0 nada, 1 frase, 2 correo
const smiley = ref('')
const { copied, copy } = useCopyEmail()

const blank = (text) => ' '.repeat(text.length)
const scramble = { stagger: 40, scramble: 420, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER }

const emailPlaying = ref(false)
const prompt = useScrambleText(computed(() => (stage.value >= 1 ? PROMPT : blank(PROMPT))), scramble)
const email = useScrambleText(
  computed(() => (copied.value ? 'copiado!' : stage.value >= 2 ? site.email : blank(site.email))),
  { ...scramble, playing: emailPlaying },
)
const emailTyped = computed(() => email.value.trimEnd())
// El correo responde al cursor (subrayado y clic) recién cuando terminó de escribirse
const emailReady = ref(false)
watch(emailPlaying, (playing) => {
  if (!playing && stage.value >= 2) emailReady.value = true
})

// Cursor de texto: el del correo sigue su animación (ver useCaret); el de la carita, los tiempos
const { state: emailCaret, hide: hideEmailCaret } = useCaret(emailPlaying)
const smileyCaret = ref('off')

// La carita armada se baraja con símbolos al azar cada 7 a 10 s mientras la sección está
// en pantalla
const smileyReplay = useScrambleReplay(':)', { ...scramble, charset: SYMBOL_CHARSET })
const smileyText = computed(() => (smileyReplay.playing.value ? smileyReplay.display.value : smiley.value))
let winkTimer = 0
function scheduleWink() {
  clearTimeout(winkTimer)
  winkTimer = setTimeout(() => {
    smileyReplay.play()
    scheduleWink()
  }, WINK_MIN + Math.random() * (WINK_MAX - WINK_MIN))
}
function stopFaces() {
  clearTimeout(winkTimer)
}

// Tiempo que tardan la frase y el correo en armarse (cada letra empieza 40 ms después de la anterior)
const PROMPT_DURATION = (PROMPT.length - 1) * scramble.stagger + scramble.scramble
const EMAIL_DURATION = (site.email.length - 1) * scramble.stagger + scramble.scramble

let timers = []
function play() {
  timers.forEach(clearTimeout)
  stage.value = 1
  smiley.value = ''
  // El correo empieza cuando termina la frase; la carita, cuando termina el correo
  const emailStart = PROMPT_DURATION + EMAIL_PAUSE
  const smileyStart = emailStart + EMAIL_DURATION + SMILEY_DELAY
  const smileyDone = smileyStart + SMILEY_GAP
  timers = [
    setTimeout(() => (stage.value = 2), emailStart),
    setTimeout(() => {
      hideEmailCaret()
      smileyCaret.value = 'typing'
      smiley.value = ':'
    }, smileyStart),
    setTimeout(() => {
      smiley.value = ':)'
      smileyCaret.value = 'idle'
      scheduleWink()
    }, smileyDone),
    setTimeout(() => (smileyCaret.value = 'off'), smileyDone + CARET_LINGER),
    setTimeout(() => (smiley.value = ';)'), smileyDone + BLINK_AFTER),
    setTimeout(() => (smiley.value = ':)'), smileyDone + BLINK_AFTER + BLINK_HOLD),
  ]
}
function reset() {
  timers.forEach(clearTimeout)
  stopFaces()
  hideEmailCaret()
  smileyCaret.value = 'off'
  emailReady.value = false
  stage.value = 0
  smiley.value = ''
}

// Frase del tamaño del logo (36 px); en pantallas angostas se achica para caber en una línea
const promptSize = `min(2.25rem, calc((100vw - 3.5rem) / ${PROMPT.length * 0.6 + 0.34}))`
const promptVisible = computed(() => prompt.value.trimEnd())

// El correo (y la carita) usan el ancho disponible sin pasar de 6rem
const EMAIL_CHARS = site.email.length + 3
const emailSize = `min(6rem, calc((100vw - 3.5rem) / ${EMAIL_CHARS * 0.6}))`

let observer
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    stage.value = 2
    smiley.value = ':)'
    emailReady.value = true
    return
  }
  observer = new IntersectionObserver(([entry]) => {
    if (entry.intersectionRatio >= 0.4 && stage.value === 0) play()
    else if (!entry.isIntersecting) reset()
  }, { threshold: [0, 0.4] })
  observer.observe(root.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  timers.forEach(clearTimeout)
  stopFaces()
})
</script>

<template>
  <section id="contacto" ref="root" aria-label="Contacto" class="flex min-h-[calc(100svh-14.4375rem)] flex-col md:min-h-[calc(100svh-7.9375rem)] xl:min-h-[calc(100svh-5rem)] justify-center px-2 py-16">
    <div class="page flex w-full flex-col">
      <!--
        Frase en un bloque verde, como el logo. El ancho completo queda reservado (invisible) y
        el bloque solo llega hasta el último carácter visible: crece hacia la derecha al armarse.
        Cada texto animado tiene su versión fija para lectores de pantalla.
      -->
      <p class="font-extrabold leading-none whitespace-pre text-fondo" :style="{ fontSize: promptSize }">
        <span class="sr-only">{{ PROMPT }}</span>
        <span class="relative block w-fit" aria-hidden="true">
          <span class="invisible block px-[0.17em] pt-[0.22em] pb-[0.11em]">{{ PROMPT }}</span>
          <span
            v-if="promptVisible"
            class="absolute top-0 left-0 bg-primario px-[0.17em] pt-[0.22em] pb-[0.11em]"
            >{{ promptVisible }}</span
          >
        </span>
      </p>

      <p class="mt-6 font-extrabold leading-none whitespace-pre text-primario" :style="{ fontSize: emailSize }">
        <button
          type="button"
:class="[
            'decoration-[0.06em] underline-offset-[0.12em]',
            emailReady ? 'cursor-pointer hover:underline' : 'pointer-events-none',
          ]"
          :aria-label="`Copiar correo ${site.email}`"
          @click="copy"
        >
          <span aria-hidden="true">{{ emailTyped }}<TypingCaret :state="emailCaret" />{{
            email.slice(emailTyped.length)
          }}</span>
        </button>
        <!--
          La carita va separada del correo por un espacio. Al hacerle clic también copia el correo
          (repite el botón del correo, por eso se oculta a lectores de pantalla y al teclado).
        -->
        <span
          aria-hidden="true"
          :class="[
            'ml-[0.6em] inline-block cursor-pointer whitespace-pre transition-transform duration-300 ease-[cubic-bezier(0.6,0,0.3,1)] motion-reduce:transition-none',
            copied && 'rotate-90',
          ]"
          @click="copy"
          >{{ smileyText }}<TypingCaret :state="smileyCaret" /></span
        >
      </p>
      <p class="sr-only" aria-live="polite">{{ copied ? 'Correo copiado' : '' }}</p>
    </div>
  </section>
</template>
