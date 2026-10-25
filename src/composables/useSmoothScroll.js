import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { easePersiana } from './usePersiana'

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

// Baja suave hasta un elemento (o su hash, ej. '#contacto'), o salta de una con immediate.
// getElementById y no querySelector: un hash como '#2024' no es un selector válido
export function scrollToElement(target, { immediate = false } = {}) {
  const el = typeof target === 'string' ? document.getElementById(decodeURIComponent(target.slice(1))) : target
  if (!el) return
  // Lenis limita el destino al alto de página que tiene medido, y lo mide un instante tarde: al
  // llegar desde una página más corta aún recuerda ese alto y no bajaría. Se vuelve a medir antes
  lenis?.resize()
  if (lenis) lenis.scrollTo(el, immediate ? { immediate: true, force: true } : { duration: 1.4 })
  else el.scrollIntoView({ behavior: immediate ? 'instant' : 'smooth' })
}

// Salta a una sección (ej. contacto) y la descubre subiendo desde abajo como persiana, con la
// misma curva que el resto del sitio. Con movimiento reducido solo salta
const REVEAL = { duration: 700 }
export function jumpToSection(el) {
  scrollToElement(el, { immediate: true })
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  el.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0)' }], { ...REVEAL, easing: easePersiana() })
}

// Lleva el scroll hasta una altura (px) en `duration` segundos con la curva `easing`, sin que el
// usuario lo interrumpa (el paso por gestos, ver usePaging)
export function scrollToY(y, duration, easing) {
  lenis?.scrollTo(y, { duration, easing, lock: true, force: true })
}

// Salta arriba sin animación (al cambiar de página)
export function scrollToTopNow() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  else window.scrollTo(0, 0)
}
