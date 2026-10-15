import { ref, watch, onBeforeUnmount } from 'vue'

/*
 * Estado del cursor de texto (ver TypingCaret) a partir de `playing`: fijo ('typing')
 * mientras el texto se anima; al terminar parpadea ('idle') `linger` ms y se oculta ('off').
 * hide() lo oculta de inmediato, ej. cuando el cursor "salta" a otro texto.
 */
export const CARET_LINGER = 1200

export function useCaret(playing, { linger = CARET_LINGER } = {}) {
  const state = ref('off')
  let timer = 0

  watch(playing, (now) => {
    clearTimeout(timer)
    if (now) {
      state.value = 'typing'
    } else if (state.value === 'typing') {
      state.value = 'idle'
      timer = setTimeout(() => (state.value = 'off'), linger)
    }
  })

  function hide() {
    clearTimeout(timer)
    state.value = 'off'
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return { state, hide }
}
