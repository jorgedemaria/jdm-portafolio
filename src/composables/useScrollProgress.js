import { ref, onMounted, onBeforeUnmount } from 'vue'

/*
 * Alto estable de la pantalla para las partes fijas ligadas al scroll (stack, primera foto del
 * detalle): 100lvh en px, el alto con las barras del navegador escondidas. Con las barras a la
 * vista, lo de abajo queda tras la barra; al esconderse ya está ahí: sin hueco y sin que nada
 * cambie de tamaño. (Con 100svh quedaba un hueco crema abajo al esconderse la barra.)
 * Brave y Chrome en iPhone agrandan la página entera al esconder sus barras (también 100lvh):
 * ahí el alto cambia y todo se recalcula (la foto crece un poco en el primer scroll). No se
 * congela: congelarlo dejaba un hueco crema bajo el stack en esos navegadores.
 */
let probe = null
export function stableViewportHeight() {
  if (!probe) {
    probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none'
    document.body.appendChild(probe)
  }
  return probe.offsetHeight
}

// Progreso de 0 a 1 mientras `targetRef` recorre el viewport con su contenido fijo (sticky).
export function useScrollProgress(targetRef) {
  const progress = ref(0)
  let frame = 0

  function measure() {
    frame = 0
    const el = targetRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    // Recorrido de la parte fija (del alto estable) hasta que la sección termina
    const distance = rect.height - stableViewportHeight()
    progress.value = distance > 0 ? Math.min(Math.max(-rect.top / distance, 0), 1) : 0
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(measure)
  }

  onMounted(() => {
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
  })

  return progress
}
