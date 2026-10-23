<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { site } from '../data/site'
import { useCopyEmail } from '../composables/useCopyEmail'
import { useScrambleReplay, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'

/*
 * Pie de página: sobre una línea fina, los datos en tres grupos, uno por tercio de la retícula
 * del sitio (en móvil, en una línea separados por puntos; si no caben, siguen abajo). Todo en primario; correo, Instagram y
 * teléfono llevan un subrayado rosado. Instagram, teléfono y ubicación solo aparecen si están
 * completos en site.js.
 * Cada 10 s un dato al azar se baraja con letras al azar; con el cursor encima del pie se detiene.
 */
const { copied, copy } = useCopyEmail()
const year = new Date().getFullYear()

const instagramUrl = computed(() =>
  site.instagram ? `https://www.instagram.com/${site.instagram.replace(/^@/, '')}/` : '',
)
// Para llamar: solo dígitos y "+" (el número se muestra tal como está escrito)
const telefonoHref = computed(() => (site.telefono ? `tel:${site.telefono.replace(/[^\d+]/g, '')}` : ''))

const link = 'underline decoration-acento decoration-2 underline-offset-4'

const SHUFFLE_EVERY = 10000
const scramble = { stagger: 40, scramble: 420, tick: 50, charset: SCRAMBLE_CHARSET_LOWER }
const values = {
  correo: site.email,
  ...(site.instagram ? { instagram: `@${site.instagram.replace(/^@/, '')}` } : {}),
  // El teléfono se muestra todo junto, sin espacios
  ...(site.telefono ? { telefono: site.telefono.replace(/\s/g, '') } : {}),
  ...(site.ubicacion ? { ubicacion: site.ubicacion } : {}),
  año: String(year),
}
const replays = Object.fromEntries(
  Object.entries(values).map(([key, text]) => [key, useScrambleReplay(text, scramble)]),
)
// Texto que se ve en cada celda: el dato, o su versión barajada mientras se anima
const shown = (key) => (replays[key].playing.value ? replays[key].display.value : values[key])

const paused = ref(false)
let timer = 0
function schedule() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (!paused.value) {
      const keys = Object.keys(values).filter((key) => !(key === 'correo' && copied.value))
      replays[keys[Math.floor(Math.random() * keys.length)]].play()
    }
    schedule()
  }, SHUFFLE_EVERY)
}
function pause() {
  paused.value = true
  clearTimeout(timer)
}
function resume() {
  paused.value = false
  schedule()
}
onMounted(schedule)
onBeforeUnmount(() => clearTimeout(timer))

// Alto del pie en --footer-h: contacto lo resta para que entre los dos llenen la pantalla
const footerEl = ref(null)
let footerObserver
onMounted(() => {
  footerObserver = new ResizeObserver(([entry]) =>
    document.documentElement.style.setProperty('--footer-h', `${entry.borderBoxSize[0].blockSize}px`),
  )
  footerObserver.observe(footerEl.value)
})
onBeforeUnmount(() => footerObserver?.disconnect())
</script>

<template>
  <footer ref="footerEl" class="px-2 pt-4 pb-4 text-primario" @pointerenter="pause" @pointerleave="resume">
    <div class="page">
      <!--
        Dos grupos en la retícula de tercios (desde 768 px): correo, Instagram y teléfono juntos en el
        1º; ubicación y año en el 3º. Desde 1024 px, ubicación y año empiezan donde empiezan los
        enlaces del navbar (--menu-inicio, lo mide AppNav). En móvil, como el menú: los contactos en
        lista a la izquierda y ubicación y año a la derecha, a la altura de la última fila
      -->
      <ul class="flex items-end justify-between gap-x-3 border-t border-primario pt-3 text-cuerpo-sm md:grid md:grid-cols-3 lg:grid-cols-[var(--menu-inicio,66.666%)_1fr] lg:gap-x-0">
        <li class="flex flex-col items-start gap-y-2 whitespace-nowrap md:block">
          <!-- Correo: al hacer clic se copia y se lee "copiado!" -->
          <button
            type="button"
            :class="['cursor-pointer', link]"
            :aria-label="`Copiar correo ${site.email}`"
            @click="copy"
          >
            <span aria-hidden="true">{{ copied ? 'copiado!' : shown('correo') }}</span>
          </button>
          <span class="sr-only" aria-live="polite">{{ copied ? 'Correo copiado' : '' }}</span>
          <span v-if="site.instagram || site.telefono" class="mx-3 hidden md:inline" aria-hidden="true">·</span>
          <a v-if="site.instagram" :href="instagramUrl" target="_blank" rel="noopener" :class="link">
            <span class="sr-only">Instagram {{ values.instagram }}</span><span aria-hidden="true">{{ shown('instagram') }}</span>
          </a>
          <span v-if="site.instagram && site.telefono" class="mx-3 hidden md:inline" aria-hidden="true">·</span>
          <a v-if="site.telefono" :href="telefonoHref" :class="link">
            <span class="sr-only">Teléfono {{ values.telefono }}</span><span aria-hidden="true">{{ shown('telefono') }}</span>
          </a>
        </li>

        <li class="whitespace-nowrap tabular-nums md:col-start-3 lg:col-start-2">
          <template v-if="site.ubicacion">
            <span class="sr-only">{{ values.ubicacion }}</span><span aria-hidden="true">{{ shown('ubicacion') }}</span>
            <span class="mx-3" aria-hidden="true">·</span>
          </template>
          <span class="sr-only">© {{ values.año }}</span><span aria-hidden="true">{{ shown('año') }}</span>
        </li>
      </ul>
    </div>
  </footer>
</template>
