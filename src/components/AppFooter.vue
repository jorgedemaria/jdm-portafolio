<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { site } from '../data/site'
import { useCopyEmail } from '../composables/useCopyEmail'
import { useScrambleReplay, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'

/*
 * Pie de página: una grilla con líneas, como el menú, a modo de ficha técnica (etiqueta
 * arriba, dato abajo). Todo en color primario. En móvil va en filas; en tablet, en 3 columnas;
 * desde 1280 px, en una sola fila. Las celdas de Instagram, teléfono y ubicación
 * solo aparecen si están completas en site.js; con las 5 celdas, sus divisiones coinciden
 * con la retícula de 5 columnas del sitio. Al final, una columna angosta con el año.
 * Cada 10 s el dato de una celda al azar se baraja con letras al azar; con el cursor encima
 * del pie se detiene.
 */
const { copied, copy } = useCopyEmail()
const year = new Date().getFullYear()

const instagramUrl = computed(() =>
  site.instagram ? `https://www.instagram.com/${site.instagram.replace(/^@/, '')}/` : '',
)
// Para llamar: solo dígitos y "+" (el número se muestra tal como está escrito)
const telefonoHref = computed(() => (site.telefono ? `tel:${site.telefono.replace(/[^\d+]/g, '')}` : ''))
const cells = computed(
  () => 2 + (site.instagram ? 1 : 0) + (site.telefono ? 1 : 0) + (site.ubicacion ? 1 : 0),
)

const link = 'decoration-1 underline-offset-4 hover:underline'

const SHUFFLE_EVERY = 10000
const scramble = { stagger: 40, scramble: 420, tick: 50, charset: SCRAMBLE_CHARSET_LOWER }
const values = {
  nombre: site.name.toLowerCase(),
  correo: site.email,
  ...(site.instagram ? { instagram: `@${site.instagram.replace(/^@/, '')}` } : {}),
  ...(site.telefono ? { telefono: site.telefono } : {}),
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
</script>

<template>
  <footer class="px-2 pt-4 pb-4 text-primario" @pointerenter="pause" @pointerleave="resume">
    <div class="page">
      <dl
        class="grid gap-px border border-primario bg-primario"
        :style="{ '--cells': cells }"
      >
        <div class="cell">
          <dt class="text-etiqueta">fotografía de arquitectura</dt>
          <dd class="shrink-0 text-right text-cuerpo whitespace-nowrap md:text-left">
            <span class="sr-only">{{ values.nombre }}</span><span aria-hidden="true">{{ shown('nombre') }}</span>
          </dd>
        </div>

        <div class="cell">
          <dt class="text-etiqueta">correo</dt>
          <dd class="shrink-0 text-right text-cuerpo whitespace-nowrap md:text-left">
            <button
              type="button"
              :class="['cursor-pointer text-left', link]"
              :aria-label="`Copiar correo ${site.email}`"
              @click="copy"
            >
              <span aria-hidden="true">{{ copied ? 'copiado!' : shown('correo') }}</span>
            </button>
            <span class="sr-only" aria-live="polite">{{ copied ? 'Correo copiado' : '' }}</span>
          </dd>
        </div>

        <div v-if="site.instagram" class="cell">
          <dt class="text-etiqueta">instagram</dt>
          <dd class="shrink-0 text-right text-cuerpo whitespace-nowrap md:text-left">
            <a :href="instagramUrl" target="_blank" rel="noopener" :class="link">
              <span class="sr-only">{{ values.instagram }}</span><span aria-hidden="true">{{ shown('instagram') }}</span>
            </a>
          </dd>
        </div>

        <div v-if="site.telefono" class="cell">
          <dt class="text-etiqueta">teléfono</dt>
          <dd class="shrink-0 text-right text-cuerpo whitespace-nowrap md:text-left">
            <a :href="telefonoHref" :class="link">
              <span class="sr-only">{{ values.telefono }}</span><span aria-hidden="true">{{ shown('telefono') }}</span>
            </a>
          </dd>
        </div>

        <div v-if="site.ubicacion" class="cell">
          <dt class="text-etiqueta">ubicación</dt>
          <dd class="shrink-0 text-right text-cuerpo whitespace-nowrap md:text-left">
            <span class="sr-only">{{ values.ubicacion }}</span><span aria-hidden="true">{{ shown('ubicacion') }}</span>
          </dd>
        </div>

        <!-- Año: columna angosta al final, del ancho de su contenido -->
        <div class="cell">
          <dt class="text-etiqueta">©</dt>
          <dd class="shrink-0 text-right text-cuerpo whitespace-nowrap tabular-nums md:text-left">
            <span class="sr-only">{{ values.año }}</span><span aria-hidden="true">{{ shown('año') }}</span>
          </dd>
        </div>
      </dl>
    </div>
  </footer>
</template>

<style scoped>
/*
 * Las líneas entre celdas son el fondo verde que asoma por un espacio de 1 px entre ellas;
 * así funcionan en cualquier distribución (filas, 3 columnas o una sola fila).
 * En móvil, filas como las del menú: etiqueta a la izquierda, dato a la derecha.
 */
.cell {
  background: var(--color-fondo);
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
}

/* Desde 768 px, celdas tipo ficha (etiqueta arriba, dato abajo) en 3 columnas */
@media (width >= 48rem) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .cell {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
  }
}

/* Desde 1280 px todo en una fila; el año, angosto al final */
@media (width >= 80rem) {
  .grid {
    grid-template-columns: repeat(var(--cells), minmax(0, 1fr)) auto;
  }
}
</style>
