import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useReducedMotion() {
  const reduced = ref(false)
  let query

  function update() {
    reduced.value = query.matches
  }

  onMounted(() => {
    query = window.matchMedia('(prefers-reduced-motion: reduce)')
    update()
    query.addEventListener('change', update)
  })

  onBeforeUnmount(() => query?.removeEventListener('change', update))

  return reduced
}
