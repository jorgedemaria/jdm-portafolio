import { ref, onBeforeUnmount } from 'vue'
import { site } from '../data/site'

const COPIED_DURATION = 1800

/*
 * Copia el correo al portapapeles. `copied` queda en true unos segundos, para mostrar
 * "copiado!" (y avisar a lectores de pantalla).
 */
export function useCopyEmail() {
  const copied = ref(false)
  let timer = 0

  async function copy() {
    try {
      await navigator.clipboard.writeText(site.email)
    } catch {
      // Respaldo para navegadores sin acceso al portapapeles
      const field = document.createElement('textarea')
      field.value = site.email
      document.body.append(field)
      field.select()
      document.execCommand('copy')
      field.remove()
    }
    copied.value = true
    clearTimeout(timer)
    timer = setTimeout(() => (copied.value = false), COPIED_DURATION)
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return { copied, copy }
}
