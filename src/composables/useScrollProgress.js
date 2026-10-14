import { ref, onMounted, onBeforeUnmount } from 'vue'

// Progreso de 0 a 1 mientras `targetRef` recorre el viewport con su contenido fijo (sticky).
export function useScrollProgress(targetRef) {
  const progress = ref(0)
  let frame = 0

  function measure() {
    frame = 0
    const el = targetRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const distance = rect.height - window.innerHeight
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
