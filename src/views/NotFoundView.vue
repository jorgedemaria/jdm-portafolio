<script setup>
import { ref, computed, onMounted } from 'vue'
import { useScrambleText, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'

/*
 * Página 404, con el lenguaje del resto del sitio: el mensaje que se arma con letras al azar y
 * los enlaces a la izquierda, y un rompecabezas chico en el otro extremo (abajo en móvil).
 */

/*
 * Mensaje y enlaces como en la sección de contacto: la frase en verde, que se arma con letras
 * al azar, y debajo los enlaces en bloques verdes (como "¿necesitas fotos? escríbeme:").
 */
const TITLE = 'Esta página no existe :('
const titleShown = ref(false)
const title = useScrambleText(
  computed(() => (titleShown.value ? TITLE : ' '.repeat(TITLE.length))),
  { stagger: 40, scramble: 420, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER },
)
onMounted(() => (titleShown.value = true))

// Mismas fórmulas que contacto: cada carácter de JetBrains Mono mide 0,6em y todo cabe en una línea
const titleSize = `min(1.5rem, calc((100vw - 3.5rem) / ${TITLE.length * 0.6}))`
const LINKS = [
  { label: 'ir al inicio', to: { name: 'home' } },
  { label: 'ver registros', to: { name: 'projects' } },
]
// +0,34em: el margen interno del bloque verde, igual que en contacto
const linkSize = `min(2.25rem, calc((100vw - 3.5rem) / ${Math.max(...LINKS.map((l) => l.label.length)) * 0.6 + 0.34}))`

/*
 * Rompecabezas deslizante de 3 × 3 con la imagen de public/images/juego.png, en 8 piezas y un
 * hueco. Se toca una pieza junto al hueco para moverla. Se mezcla con movimientos válidos
 * desde la imagen armada, así siempre tiene solución. Al armarla se ve completa. El récord
 * (menos movimientos) queda guardado en este navegador.
 */
const SIZE = 3
const COUNT = SIZE * SIZE
const EMPTY = COUNT - 1 // la última pieza es el hueco
const PIECES = [...Array(EMPTY).keys()]
const SHUFFLE_MOVES = 120
const BEST_KEY = 'jdm:404-rompecabezas'

// Para cambiar la imagen: reemplazar el archivo y poner aquí su ancho y alto en px
const IMAGE = { src: '/images/juego.png', width: 700, height: 700, alt: 'Snoopy con casco y gafas de aviador' }
const ratio = IMAGE.width / IMAGE.height
const tiles = ref([]) // tiles[posición] = pieza
const moves = ref(0)
const best = ref(readBest())
const solved = computed(() => tiles.value.every((piece, i) => piece === i))

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || null
  } catch {
    return null
  }
}
function saveBest() {
  try {
    localStorage.setItem(BEST_KEY, String(best.value))
  } catch {
    // Sin almacenamiento (ventana privada): el récord dura hasta cerrar la página
  }
}

const rowCol = (i) => [Math.floor(i / SIZE), i % SIZE]
const isNeighbor = (a, b) => {
  const [ra, ca] = rowCol(a)
  const [rb, cb] = rowCol(b)
  return Math.abs(ra - rb) + Math.abs(ca - cb) === 1
}
const neighbors = (i) => [...Array(COUNT).keys()].filter((j) => isNeighbor(i, j))

function swapWithEmpty(list, position) {
  const hole = list.indexOf(EMPTY)
  ;[list[hole], list[position]] = [list[position], list[hole]]
}

function newPuzzle() {
  const list = [...Array(COUNT).keys()]
  let previous = -1
  for (let n = 0; n < SHUFFLE_MOVES || list.every((p, i) => p === i); n++) {
    const hole = list.indexOf(EMPTY)
    // Sin deshacer el movimiento anterior, para que la mezcla avance
    const options = neighbors(hole).filter((j) => j !== previous)
    swapWithEmpty(list, options[Math.floor(Math.random() * options.length)])
    previous = hole
  }
  tiles.value = list
  moves.value = 0
}
newPuzzle()

function move(position) {
  if (solved.value || !isNeighbor(position, tiles.value.indexOf(EMPTY))) return
  const list = [...tiles.value]
  swapWithEmpty(list, position)
  tiles.value = list
  moves.value++
  if (solved.value && (!best.value || moves.value < best.value)) {
    best.value = moves.value
    saveBest()
  }
}

// Cada pieza muestra su parte de la foto y se ubica en su posición actual (se desliza al moverse)
function pieceStyle(piece, position) {
  const [row, col] = rowCol(piece)
  const [atRow, atCol] = rowCol(position)
  return {
    width: `${100 / SIZE}%`,
    height: `${100 / SIZE}%`,
    transform: `translate(${atCol * 100}%, ${atRow * 100}%)`,
    backgroundImage: `url(${IMAGE.src})`,
    backgroundSize: `${SIZE * 100}% ${SIZE * 100}%`,
    backgroundPosition: `${(col / (SIZE - 1)) * 100}% ${(row / (SIZE - 1)) * 100}%`,
  }
}

const status = computed(() => (solved.value ? `armada en ${moves.value} movimientos` : ''))

// Encima del tablero: la consigna y, al ganar, el mensaje (cambia con letras al azar)
const heading = computed(() => (solved.value ? 'ganaste! :)' : 'arma la imagen'))
const headingText = useScrambleText(heading, {
  stagger: 30,
  scramble: 320,
  tick: 45,
  keepUnchanged: false,
  charset: SCRAMBLE_CHARSET_LOWER,
})
</script>

<template>
  <section class="px-2 pt-6 pb-24">
    <div class="page">
      <div
        class="flex w-full flex-col gap-10 md:flex-row md:items-start md:justify-between"
      >
        <div>
          <h1 class="font-extrabold leading-none whitespace-pre text-primario" :style="{ fontSize: titleSize }">
            <span class="sr-only">{{ TITLE }}</span>
            <span aria-hidden="true">{{ title }}</span>
          </h1>
          <ul class="mt-6 flex flex-col gap-[0.25em] font-extrabold leading-none text-primario" :style="{ fontSize: linkSize }">
            <li v-for="link in LINKS" :key="link.label">
              <RouterLink
                :to="link.to"
                class="whitespace-pre underline decoration-acento decoration-[0.08em] underline-offset-[0.12em]"
                >{{ link.label }}</RouterLink
              >
            </li>
          </ul>
        </div>

        <!-- Rompecabezas chico -->
        <div class="w-full max-w-72 md:w-72">
          <p class="text-cuerpo-sm whitespace-pre text-primario">
            <span class="sr-only">{{ heading }}</span><span aria-hidden="true">{{ headingText }}</span>
          </p>

          <div class="mt-3">
            <div
              class="relative overflow-hidden"
              :style="{ aspectRatio: ratio }"
              role="group"
              aria-label="Rompecabezas: toca una pieza junto al espacio vacío para moverla"
            >
              <!-- Armada: la imagen completa, sin líneas -->
              <img
                v-if="solved"
                :src="IMAGE.src"
                :alt="IMAGE.alt"
                class="absolute inset-0 size-full object-cover"
              />
              <template v-else>
                <!-- El hueco deja ver el fondo crema; cada pieza (fondo crema, la imagen es transparente) lleva una línea verde fina -->
                <div class="absolute inset-0 bg-fondo" />
                <!-- Siempre en el mismo orden: solo cambia su transform, así se ve el deslizamiento -->
                <button
                  v-for="piece in PIECES"
                  :key="piece"
                  type="button"
                  :aria-label="`pieza ${piece + 1}`"
                  class="absolute top-0 left-0 cursor-pointer bg-fondo bg-no-repeat shadow-[inset_0_0_0_0.5px_var(--color-primario)] transition-transform duration-200 ease-[cubic-bezier(0.6,0,0.3,1)] focus-visible:z-10 focus-visible:-outline-offset-2"
                  :style="pieceStyle(piece, tiles.indexOf(piece))"
                  @click="move(tiles.indexOf(piece))"
                />
              </template>
            </div>
          </div>

          <!-- Debajo: los movimientos y "mezclar" (también para jugar otra vez al armarla) -->
          <div class="mt-3 flex items-baseline justify-between gap-4 text-cuerpo-sm text-primario">
            <p class="tabular-nums">
              {{ moves }} mov.<template v-if="best"> · récord {{ best }}</template>
            </p>
            <button
              type="button"
              class="cursor-pointer text-primario decoration-1 underline-offset-4 hover:underline"
              @click="newPuzzle"
            >
              {{ solved ? 'otra vez' : 'mezclar' }}
            </button>
          </div>
          <p class="sr-only" aria-live="polite">{{ status }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
