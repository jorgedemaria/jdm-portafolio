import { onMounted, onBeforeUnmount } from 'vue'
import { scrollToY } from './useSmoothScroll'
import { introLeaving } from './useIntro'

/*
 * Paso por gestos (tipo páginas de producto): en las secciones que registran paradas, cada gesto
 * (rueda, trackpad o dedo) lleva exactamente a la parada siguiente o a la anterior, con una
 * animación fija. Las paradas de todas las secciones forman una sola cadena (ej. la última foto
 * del stack → el primer proyecto de "últimos registros"). Fuera de la cadena el scroll es libre.
 * Mientras dura la animación no se cuenta otro gesto. Después, la inercia del trackpad (eventos de
 * rueda que van frenando) tampoco; sí un gesto nuevo o la rueda que se sigue girando (no frena).
 */
const PAGE_DURATION = 0.9 // s
const CROSS_DURATION = 1.4 // s: al pasar de una sección a otra (ej. del stack a "últimos registros")
const FIRST_DURATION = 1.4 // s: desde arriba de todo (el nombre gigante se achica) o de vuelta ahí
// Entre fotos, la curva del sitio; entre secciones, una más pareja (sinusoidal), sin tirón al medio
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2
const GESTURE_GAP = 250 // ms sin rueda para dar por terminado un gesto
const FRESH_DELTA = 15 // px: menos, es la cola de la inercia

// Cada sección da { stops: [alturas de página], end: hasta dónde llega su tramo } o null si no participa
const sections = new Set()

// Parada siguiente en esa dirección: { y, cross, first } (cross: es de otra sección; first: sale de la
// primera parada o vuelve a ella), o null si es libre
function nextStop(dir) {
  const parts = [...sections].map((fn) => fn()).filter(Boolean)
  if (!parts.length) return null
  const stops = parts.flatMap((p) => p.stops).sort((a, b) => a - b)
  const end = Math.max(...parts.map((p) => p.end))
  const y = window.scrollY
  if (y < stops[0] - 1 || y > end) return null
  const stop = dir > 0 ? stops.find((s) => s > y + 1) : stops.findLast((s) => s < y - 1)
  if (stop === undefined) return null
  const here = parts.find((p) => y >= p.stops[0] - 1 && y <= p.end)
  const first = Math.abs(y - stops[0]) <= 1 || stop === stops[0]
  return { y: stop, cross: !here?.stops.includes(stop), first }
}

let paging = false // animando o con el gesto aún en curso
let animating = false
let gestureTimer = 0
let pageTimer = 0
let lastDelta = 0
function release() {
  clearTimeout(gestureTimer)
  gestureTimer = setTimeout(() => !animating && (paging = false), GESTURE_GAP)
}
function page(dir) {
  const next = nextStop(dir)
  if (!next) return false
  const duration = next.cross ? CROSS_DURATION : next.first ? FIRST_DURATION : PAGE_DURATION
  paging = animating = true
  scrollToY(next.y, duration, next.cross ? easeInOutSine : easeInOutCubic)
  // Por tiempo y no con el aviso de Lenis: si otro salto corta la animación, el aviso nunca llega
  clearTimeout(pageTimer)
  pageTimer = setTimeout(() => {
    animating = false
    release()
  }, duration * 1000)
  return true
}

const off = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || !introLeaving.value

// En captura, antes que el scroll suave (Lenis), que así no recibe la rueda que se usa aquí.
// ctrlKey: zoom del navegador (Ctrl + rueda, pellizco en el trackpad)
function onWheel(event) {
  if (!event.deltaY || event.ctrlKey || off()) return
  const delta = Math.abs(event.deltaY)
  const fresh = delta >= FRESH_DELTA && delta >= lastDelta
  lastDelta = delta
  if (animating || (paging && !fresh) || page(Math.sign(event.deltaY))) {
    event.preventDefault()
    event.stopImmediatePropagation()
    release()
  }
}

// Dedo: se decide con el primer movimiento; si toca pasar, la página no se mueve con el dedo.
// Con dos dedos es zoom del navegador: no se toca
let touchY = 0
let touchControl = null // null sin decidir, true pasa, false scroll libre
function onTouchStart(event) {
  touchY = event.touches[0].clientY
  touchControl = event.touches.length > 1 ? false : null
}
function onTouchMove(event) {
  if (event.touches.length > 1) touchControl = false
  if (off()) return
  const dy = touchY - event.touches[0].clientY
  if (touchControl === null && Math.abs(dy) > 6) touchControl = animating || nextStop(Math.sign(dy)) !== null
  if (touchControl) event.preventDefault()
}
function onTouchEnd(event) {
  const dy = touchY - event.changedTouches[0].clientY
  if (touchControl && !animating && Math.abs(dy) > 30) page(Math.sign(dy))
  touchControl = null
}

function listen(on) {
  const method = on ? 'addEventListener' : 'removeEventListener'
  window[method]('wheel', onWheel, { passive: false, capture: true })
  window[method]('touchstart', onTouchStart, { passive: true })
  window[method]('touchmove', onTouchMove, { passive: false })
  window[method]('touchend', onTouchEnd, { passive: true })
}

export function usePagingStops(fn) {
  onMounted(() => {
    if (!sections.size) listen(true)
    sections.add(fn)
  })
  onBeforeUnmount(() => {
    sections.delete(fn)
    if (sections.size) return
    listen(false)
    clearTimeout(gestureTimer)
    clearTimeout(pageTimer)
    paging = animating = false
  })
}
