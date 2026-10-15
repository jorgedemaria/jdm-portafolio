import { ref, reactive, computed, onMounted, onBeforeUnmount, unref } from 'vue'

/*
 * Fotos que van cambiando en las tarjetas de proyecto.
 * Cada 7 a 9 s (al azar) hay una ronda: cambian 1 o 2 tarjetas, al azar tanto cuántas como
 * cuáles. La foto nueva entra como persiana desde un lado al azar (arriba, abajo, izquierda o
 * derecha). Una tarjeta con el cursor encima no cambia.
 * Estado compartido por todas las tarjetas montadas en la página.
 */
// Tiempo entre rondas: al azar entre estos dos valores
const ROUND_MIN = 7000
const ROUND_MAX = 9000

// slug → { count, paused }   (tarjetas montadas)
const cards = new Map()
// slug → índice de la foto que muestra (0 = portada)
const indexes = reactive({})
// slug → lado desde el que entra la última foto nueva
const sides = reactive({})
const SIDES = ['top', 'bottom', 'left', 'right']
const pick = (list) => list[Math.floor(Math.random() * list.length)]
let timer = 0

function shuffle(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function round() {
  const count = Math.random() < 0.5 ? 1 : 2
  const canChange = (slug) => cards.get(slug).count > 1 && !unref(cards.get(slug).paused)
  const candidates = [...cards.keys()].filter(canChange)
  for (const slug of shuffle(candidates).slice(0, count)) {
    sides[slug] = pick(SIDES)
    indexes[slug] = ((indexes[slug] ?? 0) + 1) % cards.get(slug).count
  }
}

function scheduleRound() {
  timer = setTimeout(() => {
    round()
    scheduleRound()
  }, ROUND_MIN + Math.random() * (ROUND_MAX - ROUND_MIN))
}
function start() {
  if (!timer) scheduleRound()
}
function stop() {
  clearTimeout(timer)
  timer = 0
}

// Fotos de una tarjeta: primero la portada y luego el resto de la galería, en orden
export function cardPhotos(project) {
  return [project.portada, ...project.fotos.filter((foto) => foto.src !== project.portada.src)]
}

/*
 * Registra la tarjeta de `project` mientras está montada. Devuelve el índice de la foto que
 * debe mostrar y el lado desde el que entra. `paused` (ref) la saca de las rondas.
 */
export function useCardRotation(project, paused = ref(false)) {
  const slug = project.slug
  const count = cardPhotos(project).length

  onMounted(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    cards.set(slug, { count, paused })
    start()
  })
  onBeforeUnmount(() => {
    cards.delete(slug)
    delete indexes[slug]
    delete sides[slug]
    if (cards.size === 0) stop()
  })

  return {
    index: computed(() => indexes[slug] ?? 0),
    side: computed(() => sides[slug] ?? 'bottom'),
  }
}
