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
import { useCaret } from '../composables/useCaret'
import { contactInView } from '../composables/useMenu'
import TypingCaret from './TypingCaret.vue'

/*
 * Cierre de Inicio, sin título: "¿necesitas fotos? escríbeme:" y el correo en grande.
 * Al llegar con el scroll, la frase se arma con letras al azar; después el correo, de
 * izquierda a derecha, y al final la carita: primero ":" y luego ")". Al irse de pantalla (al
 * volver hacia arriba) todo se borra desde el final, como con la tecla borrar, y se repite al volver. Al hacer clic, el correo se copia y se lee "copiado!".
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
// instantBlank: al reiniciarse (fuera de pantalla o tras borrarse) queda vacío de inmediato
const scramble = { stagger: 40, scramble: 420, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER, instantBlank: true }

const emailPlaying = ref(false)
const prompt = useScrambleText(computed(() => (stage.value >= 1 ? PROMPT : blank(PROMPT))), scramble)
const email = useScrambleText(
  computed(() => (copied.value ? 'copiado!' : stage.value >= 2 ? site.email : blank(site.email))),
  { ...scramble, playing: emailPlaying },
)
/*
 * Borrado al salir: cuántas letras quedan de la frase + el correo + la carita (-1 si no se borra).
 * Mientras tanto se muestran recortados, en ese orden, desde el final.
 */
const ERASE_EVERY = 30 // ms por letra
const erasing = ref(-1)
let eraseTimer = 0
const keep = (text, from) => text.slice(0, Math.max(0, Math.min(erasing.value - from, text.length)))
const promptShown = computed(() => (erasing.value < 0 ? prompt.value : keep(PROMPT, 0)))
const emailShown = computed(() => (erasing.value < 0 ? email.value : keep(site.email, PROMPT.length)))
const emailTyped = computed(() => emailShown.value.trimEnd())
// El correo responde al cursor (subrayado y clic) recién cuando terminó de escribirse
const emailReady = ref(false)
watch(emailPlaying, (playing) => {
  if (!playing && stage.value >= 2) emailReady.value = true
})

// Cursor de texto: el del correo sigue su animación (ver useCaret); el de la carita, los tiempos
const { state: emailCaret, hide: hideEmailCaret } = useCaret(emailPlaying)
// Al terminar, el cursor se queda parpadeando tras la carita
const smileyCaret = ref('off')

// La carita armada se baraja con símbolos al azar cada 7 a 10 s mientras la sección está
// en pantalla
const smileyReplay = useScrambleReplay(':)', { ...scramble, charset: SYMBOL_CHARSET })
const smileyText = computed(() => {
  if (erasing.value >= 0) return keep(':)', PROMPT.length + site.email.length)
  return smileyReplay.playing.value ? smileyReplay.display.value : smiley.value
})
let winkTimer = 0
// Mientras se borra, el cursor va al final de lo que queda; borrado todo, parpadea al comienzo
const P = PROMPT.length
const E = site.email.length
const promptCaret = computed(() => (erasing.value < 0 || erasing.value > P ? 'off' : erasing.value ? 'typing' : 'idle'))
const emailCaretShown = computed(() =>
  erasing.value < 0 ? emailCaret.value : erasing.value > P && erasing.value <= P + E ? 'typing' : 'off',
)
const smileyCaretShown = computed(() => (erasing.value < 0 ? smileyCaret.value : erasing.value > P + E ? 'typing' : 'off'))
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
  erasing.value = -1
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
    setTimeout(() => (smiley.value = ';)'), smileyDone + BLINK_AFTER),
    setTimeout(() => (smiley.value = ':)'), smileyDone + BLINK_AFTER + BLINK_HOLD),
  ]
}
function erase() {
  timers.forEach(clearTimeout)
  stopFaces()
  hideEmailCaret()
  smileyCaret.value = 'off'
  emailReady.value = false
  erasing.value = PROMPT.length + site.email.length + 2
  clearInterval(eraseTimer)
  eraseTimer = setInterval(() => {
    if (--erasing.value > 0) return
    // Queda vacío (erasing en 0) hasta que se vuelva a escribir: así no se ve el barajado a blanco
    reset()
    erasing.value = 0
  }, ERASE_EVERY)
}
function reset() {
  clearInterval(eraseTimer)
  erasing.value = -1
  timers.forEach(clearTimeout)
  stopFaces()
  hideEmailCaret()
  smileyCaret.value = 'off'
  emailReady.value = false
  stage.value = 0
  smiley.value = ''
}

// Ancho en em del correo con la carita (cada letra mono mide 0.6em), para el tamaño que
// llena su caja sin pasar de 6rem (ver la clase del correo)
const emailSize = { '--todo': (site.email.length + 3) * 0.6 }

// Avisa al navbar cuando se ve la sección (el logo se recoge); también con movimiento reducido
let viewObserver
onMounted(() => {
  viewObserver = new IntersectionObserver(([entry]) => (contactInView.value = entry.intersectionRatio >= 0.4), {
    threshold: [0, 0.4],
  })
  viewObserver.observe(root.value)
})
onBeforeUnmount(() => {
  viewObserver?.disconnect()
  contactInView.value = false
})

/*
 * Al volver hacia arriba (más de ERASE_AFTER px desde lo más abajo que se llegó) el texto se borra,
 * aún a la vista; si se vuelve a bajar hasta ahí, se escribe de nuevo
 */
const ERASE_AFTER = 40
let peak = 0
function onScroll() {
  const y = window.scrollY
  if (stage.value > 0 && erasing.value < 0) {
    peak = Math.max(peak, y)
    if (peak - y > ERASE_AFTER) erase()
  } else if (erasing.value >= 0 && y >= peak) {
    reset()
    play()
  }
}

let observer
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    stage.value = 2
    smiley.value = ':)'
    emailReady.value = true
    return
  }
  observer = new IntersectionObserver(([entry]) => {
    if (entry.intersectionRatio >= 0.4) {
      // Volvió a mitad del borrado: empieza de nuevo
      if (erasing.value > 0) reset()
      if (stage.value === 0) {
        play()
        peak = window.scrollY
      }
    } else if (!entry.isIntersecting) reset()
  }, { threshold: [0, 0.4] })
  window.addEventListener('scroll', onScroll, { passive: true })
  observer.observe(root.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('scroll', onScroll)
  timers.forEach(clearTimeout)
  clearInterval(eraseTimer)
  stopFaces()
})
</script>

<template>
  <section id="contacto" ref="root" aria-label="Contacto" class="flex min-h-[calc(100svh-var(--footer-h,4rem))] flex-col justify-center px-2 py-16">
    <div class="page flex w-full flex-col">
      <!--
        Frase en texto, sin bloque (como el resto del sitio), que se arma con letras al azar.
        Cada texto animado tiene su versión fija para lectores de pantalla.
      -->
      <!-- Como los títulos de las páginas, sin pasar del 1º tercio (si no cabe, baja de línea) -->
      <p class="font-display text-h1 whitespace-pre-wrap text-texto md:w-1/3 md:pr-6 lg:pr-10">
        <span class="sr-only">{{ PROMPT }}</span>
        <span aria-hidden="true">{{ promptShown }}<TypingCaret :state="promptCaret" /></span>
      </p>

      <!--
        En móvil el correo y la carita llenan el ancho en una línea. Desde 768 px llenan los 2 primeros
        tercios (menos el aire del 2º), lo mismo que el nombre gigante de Inicio
      -->
      <div class="@container mt-6">
      <p
        class="leading-none font-bold whitespace-pre text-primario [font-size:min(6rem,calc(100cqi/var(--todo)))] md:[font-size:min(6rem,calc((100cqi*2/3-1.5rem)/var(--todo)))] lg:[font-size:min(6rem,calc((100cqi*2/3-2.5rem)/var(--todo)))]"
        :style="emailSize"
      >
        <button
          type="button"
          :class="[
            emailReady ? 'cursor-pointer' : 'pointer-events-none',
          ]"
          :aria-label="`Copiar correo ${site.email}`"
          @click="copy"
        >
          <!-- El correo con el subrayado rosado de los enlaces del sitio, a medida que se escribe -->
          <span aria-hidden="true"
            ><span v-if="emailTyped" class="underline decoration-acento decoration-[0.08em] underline-offset-[0.12em]">{{
              emailTyped
            }}</span
            ><TypingCaret :state="emailCaretShown" />{{ emailShown.slice(emailTyped.length) }}</span
          >
        </button>
        <!--
          La carita va separada del correo por un espacio. Al hacerle clic también copia el correo
          (repite el botón del correo, por eso se oculta a lectores de pantalla y al teclado).
        -->
        <button
          type="button"
          tabindex="-1"
          aria-hidden="true"
          :class="[
            'ml-[0.6em] inline-block cursor-pointer whitespace-pre transition-transform duration-300 ease-[cubic-bezier(0.6,0,0.3,1)] motion-reduce:transition-none',
            copied && 'rotate-90',
          ]"
          @click="copy"
          >{{ smileyText }}<TypingCaret :state="smileyCaretShown" /></button
        >
      </p>
      </div>
      <p class="sr-only" aria-live="polite">{{ copied ? 'Correo copiado' : '' }}</p>
    </div>
  </section>
</template>
