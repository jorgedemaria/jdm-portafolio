import { ref } from 'vue'

/*
 * Secuencia de entrada del sitio. La intro marca `introLeaving` cuando su persiana
 * empieza a subir; a partir de ahí:
 *   1. el logo y el botón del menú se arman con letras al azar   (NAV_DURATION)
 *   2. las líneas del stack bajan como persiana                  (LINES_DURATION)
 *   3. aparecen "Desliza" y el contador
 * Si la página se abre sin intro (navegando dentro del sitio), todo aparece de inmediato.
 */
export const introLeaving = ref(false)

export const NAV_DURATION = 850
export const LINES_DURATION = 950
