import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

/*
 * Scroll suave con inercia (Lenis): con la rueda o el trackpad la página no salta, sino que
 * sigue al scroll y frena de a poco. En pantallas táctiles se deja el scroll nativo (ya tiene
 * su propia inercia) y con movimiento reducido no se activa.
 * Una sola instancia para todo el sitio; las funciones de abajo funcionan también sin ella.
 */
// Qué tan rápido alcanza la página al scroll en cada cuadro (0–1): más bajo = más sedoso y lento
const LERP = 0.085
// Cuánto avanza cada movimiento de rueda (1 = lo normal)
const WHEEL = 0.95

let lenis = null

export function startSmoothScroll() {
  if (lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  lenis = new Lenis({ lerp: LERP, wheelMultiplier: WHEEL, autoRaf: true })
}

// Detiene y reanuda el scroll (ej. mientras está la intro)
export function pauseSmoothScroll() {
  lenis?.stop()
}
export function resumeSmoothScroll() {
  lenis?.start()
}

// Baja suave hasta un elemento (o su hash, ej. '#contacto'). getElementById y no querySelector:
// un hash como '#2024' no es un selector válido y lanzaría un error
export function scrollToElement(target) {
  const el = typeof target === 'string' ? document.getElementById(decodeURIComponent(target.slice(1))) : target
  if (!el) return
  if (lenis) lenis.scrollTo(el, { duration: 1.4 })
  else el.scrollIntoView({ behavior: 'smooth' })
}

// Salta arriba sin animación (al cambiar de página)
export function scrollToTopNow() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  else window.scrollTo(0, 0)
}
