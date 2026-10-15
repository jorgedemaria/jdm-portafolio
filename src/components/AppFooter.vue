<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { site } from '../data/site'
import { useCopyEmail } from '../composables/useCopyEmail'
import { useScrambleReplay, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'

/*
 * Pie de página: sobre una línea fina, los datos en una línea repartidos a lo ancho y separados
 * por puntos (si no caben, siguen en la línea de abajo). Todo en primario; correo, Instagram y
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
      <ul class="flex flex-wrap justify-between gap-x-3 gap-y-1 border-t border-primario pt-3 text-cuerpo-sm">
        <li class="whitespace-nowrap">
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
        </li>

        <li v-if="site.instagram" class="whitespace-nowrap">
          <span class="mr-3" aria-hidden="true">·</span>
          <a :href="instagramUrl" target="_blank" rel="noopener" :class="link">
            <span class="sr-only">Instagram {{ values.instagram }}</span><span aria-hidden="true">{{ shown('instagram') }}</span>
          </a>
        </li>

        <li v-if="site.telefono" class="whitespace-nowrap">
          <span class="mr-3" aria-hidden="true">·</span>
          <a :href="telefonoHref" :class="link">
            <span class="sr-only">Teléfono {{ values.telefono }}</span><span aria-hidden="true">{{ shown('telefono') }}</span>
          </a>
        </li>

        <li v-if="site.ubicacion" class="whitespace-nowrap">
          <span class="mr-3" aria-hidden="true">·</span>
          <span class="sr-only">{{ values.ubicacion }}</span><span aria-hidden="true">{{ shown('ubicacion') }}</span>
        </li>

        <li class="whitespace-nowrap tabular-nums">
          <span class="mr-3" aria-hidden="true">·</span>
          <span class="sr-only">© {{ values.año }}</span><span aria-hidden="true">{{ shown('año') }}</span>
        </li>
      </ul>
    </div>
  </footer>
</template>
