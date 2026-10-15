import { onMounted, onBeforeUnmount } from 'vue'

/*
 * Fotos que se descubren con el scroll: al entrar por abajo de la pantalla, cada una se
 * desenrolla de arriba hacia abajo (como una persiana) y su imagen se acerca levemente
 * hasta quedar quieta. Va ligado al scroll, no al tiempo: si se sube, se vuelve a recoger.
 * Uso: `const reveal = useScrollReveal()` y en el template `:ref="reveal"` en el contenedor
 * de cada foto (con overflow hidden). Con movimiento reducido no hace nada.
 */
// Parte de la pantalla que recorre la foto desde que asoma hasta quedar completa
const TRAVEL = 0.65
// Acercamiento inicial de la imagen (1 = sin acercamiento)
const START_SCALE = 1.08

const clamp = (x) => Math.min(Math.max(x, 0), 1)
const easeOut = (x) => 1 - Math.pow(1 - x, 3)

export function useScrollReveal() {
  const elements = new Set()
  let frame = 0
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function apply(el) {
    const top = el.getBoundingClientRect().top
    const vh = window.innerHeight
    const p = easeOut(clamp((vh - top) / (vh * TRAVEL)))
    el.style.clipPath = p >= 1 ? '' : `inset(0 0 ${(1 - p) * 100}% 0)`
    const image = el.firstElementChild
    if (image) image.style.transform = p >= 1 ? '' : `scale(${START_SCALE - (START_SCALE - 1) * p})`
  }

  function update() {
    frame = 0
    elements.forEach(apply)
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update)
  }

  // Ref de función para el template: registra y quita contenedores
  function reveal(el) {
    if (!el || reduced) return
    if (!elements.has(el)) {
      elements.add(el)
      apply(el)
    }
  }

  onMounted(() => {
    if (reduced) return
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()
  })
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    cancelAnimationFrame(frame)
    elements.clear()
  })

  return reveal
}
