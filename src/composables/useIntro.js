import { ref } from 'vue'

/*
 * Secuencia de entrada del sitio, al entrar por Inicio. El logo del navbar se escribe primero (con
 * una carita que después pasa al "*") y, NAV_DELAY después de ese cambio, marca `introLeaving`;
 * a partir de ahí:
 *   1. aparecen los elementos del navbar (menú o botón)
 *   2. la primera foto del stack baja como persiana desde el navbar      (NAV_DURATION)
 *   3. aparecen "Desliza" y el contador                                   (INDICATOR_DELAY)
 * Si la página se abre en otra página (o se navega dentro del sitio), todo aparece de inmediato.
 */
export const introLeaving = ref(false)

// Pausa entre que la carita del logo pasa al "*" y aparecen los elementos del navbar
export const NAV_DELAY = 800
export const NAV_DURATION = 800
export const INDICATOR_DELAY = 1100
