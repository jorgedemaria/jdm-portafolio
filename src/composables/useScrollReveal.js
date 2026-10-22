import { onBeforeUnmount } from 'vue'

/*
 * Fotos que aparecen como las tarjetas de Registros: la primera vez que asoman en pantalla se
 * descubren como persiana de izquierda a derecha, y quedan fijas.
 * Uso: `const reveal = useScrollReveal()` y en el template `:ref="reveal"` en el contenedor
 * de cada foto. Con movimiento reducido no hace nada.
 */
const HIDDEN = 'inset(0 100% 0 0)'
const TRANSITION = 'clip-path 1s cubic-bezier(0.6, 0, 0.3, 1)'

export function useScrollReveal() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Se observa el padre: con el recorte puesto, la foto misma nunca cuenta como visible
  const clipped = new WeakMap()
  const observer = reduced
    ? null
    : new IntersectionObserver(
        (entries) => {
          for (const { target, isIntersecting } of entries) {
            if (!isIntersecting) continue
            clipped.get(target).style.clipPath = 'inset(0)'
            observer.unobserve(target)
          }
        },
        { threshold: 0.15 },
      )

  // Ref de función para el template: registra cada contenedor una sola vez
  function reveal(el) {
    const parent = el?.parentElement
    if (!parent || !observer || clipped.has(parent)) return
    clipped.set(parent, el)
    el.style.clipPath = HIDDEN
    el.style.transition = TRANSITION
    observer.observe(parent)
  }

  onBeforeUnmount(() => observer?.disconnect())

  return reveal
}
