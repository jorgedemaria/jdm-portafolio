import { watch, nextTick, onBeforeUnmount } from 'vue'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Mantiene el foco del teclado dentro de `containerRef` mientras `active` sea true.
export function useFocusTrap(containerRef, active) {
  function onKeydown(event) {
    if (event.key !== 'Tab' || !containerRef.value) return
    const items = [...containerRef.value.querySelectorAll(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null,
    )
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(active, async (isActive) => {
    if (isActive) {
      await nextTick()
      document.addEventListener('keydown', onKeydown)
    } else {
      document.removeEventListener('keydown', onKeydown)
    }
  })

  onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
}
