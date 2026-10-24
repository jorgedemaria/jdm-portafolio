<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { site } from '../data/site'
import { useCopyEmail } from '../composables/useCopyEmail'
import { useScrambleReplay, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'

/*
 * Pie de página: sobre una línea fina, los datos en tres grupos de dos filas, uno por tercio de la
 * retícula del sitio. Todo en primario; correo, Instagram y
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

// py con -my: el área para tocar llega a 24 px de alto (WCAG 2.5.8) sin mover nada
const link = 'py-[7px] -my-[7px] underline decoration-acento decoration-2 underline-offset-4'

const SHUFFLE_EVERY = 10000
const scramble = { stagger: 40, scramble: 420, tick: 50, charset: SCRAMBLE_CHARSET_LOWER }
const values = {
  correo: site.email,
  ...(site.instagram ? { instagram: `@${site.instagram.replace(/^@/, '')}` } : {}),
  // El teléfono se muestra todo junto, sin espacios
  ...(site.telefono ? { telefono: site.telefono.replace(/\s/g, '') } : {}),
  ...(site.ubicacion ? { ubicacion: site.ubicacion } : {}),
  ...(site.pais ? { pais: site.pais } : {}),
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

// Hora de Valdivia (zona de Chile continental), al minuto
const clock = new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const time = ref(clock.format(new Date()))
let clockTimer = 0
onMounted(() => (clockTimer = setInterval(() => (time.value = clock.format(new Date())), 10000)))
onBeforeUnmount(() => clearInterval(clockTimer))

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
        Un grupo por columna: correo y teléfono, ciudad y país, y la hora de Valdivia con el año.
        Desde 1024 px todo en una línea, cada grupo en su tercio de la retícula; en móvil y tablet, en
        dos filas con la ciudad y la hora a la derecha
      -->
      <ul class="grid grid-cols-[1fr_auto_auto] gap-x-6 border-t border-primario pt-3 text-cuerpo-sm whitespace-nowrap lg:grid-cols-3 lg:gap-x-0">
        <li class="flex flex-col items-start gap-y-3.5 lg:flex-row lg:items-baseline lg:gap-x-3">
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
          <template v-if="site.instagram"><span class="hidden lg:inline" aria-hidden="true">·</span></template>
          <a v-if="site.instagram" :href="instagramUrl" target="_blank" rel="noopener" :class="link">
            <span class="sr-only">Instagram {{ values.instagram }}</span><span aria-hidden="true">{{ shown('instagram') }}</span>
          </a>
          <template v-if="site.telefono"><span class="hidden lg:inline" aria-hidden="true">·</span></template>
          <a v-if="site.telefono" :href="telefonoHref" :class="link">
            <span class="sr-only">Teléfono {{ values.telefono }}</span><span aria-hidden="true">{{ shown('telefono') }}</span>
          </a>
        </li>
        <li class="flex flex-col gap-y-3.5 lg:flex-row lg:gap-x-[1ch]">
          <template v-for="key in ['ubicacion', 'pais']" :key="key">
            <span v-if="values[key]"
              ><span class="sr-only">{{ values[key] }}</span><span aria-hidden="true">{{ shown(key) }}</span
              ><span v-if="key === 'ubicacion' && values.pais" class="hidden lg:inline" aria-hidden="true">,</span></span
            >
          </template>
        </li>
        <li class="flex flex-col gap-y-3.5 tabular-nums lg:flex-row lg:gap-x-3">
          <time :datetime="time">{{ time }}</time>
          <span class="hidden lg:inline" aria-hidden="true">·</span>
          <span><span class="sr-only">© {{ values.año }}</span><span aria-hidden="true">{{ shown('año') }}</span></span>
        </li>
      </ul>
    </div>
  </footer>
</template>
