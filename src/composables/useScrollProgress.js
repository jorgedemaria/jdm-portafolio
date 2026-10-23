import { ref, onMounted, onBeforeUnmount } from 'vue'

/*
 * Alto de la pantalla con la barra del navegador visible (100svh), en px. En el teléfono
 * window.innerHeight crece cuando la barra se esconde con los primeros scrolls; las partes fijas
 * (h-svh) no, así que todo lo que se calcula con ellas tiene que usar este alto estable.
 * Brave y Chrome en iPhone, en cambio, agrandan la página entera al esconder sus barras (también
 * 100svh): en pantallas táctiles el alto queda congelado mientras no cambie el ancho (al rotar sí
 * se mide de nuevo). Las partes fijas que dependen de él usan este valor en px, no h-svh.
 * En Safari el valor congelado es el mismo 100svh de siempre; en escritorio no se congela.
 */
let probe = null
let frozen = null
export function smallViewportHeight() {
  if (!probe) {
    probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none'
    document.body.appendChild(probe)
  }
  const width = window.innerWidth
  if (frozen?.width === width && window.matchMedia('(pointer: coarse)').matches) return frozen.height
  frozen = { width, height: probe.offsetHeight }
  return frozen.height
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
    // Recorrido de la parte fija (h-svh) hasta que la sección termina
    const distance = rect.height - smallViewportHeight()
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
