import { ref, shallowRef } from 'vue'

/*
 * Estado compartido del menú principal. Lo usan el navbar (que lo abre, cierra y mide)
 * y el stack de Inicio (para mover o recoger las líneas de la retícula).
 */

/*
 * Columnas de la retícula entre el borde del logo y el borde derecho del botón del menú.
 * Desde 768 px son 5 (una por enlace del menú horizontal); en pantallas más chicas, menos.
 */
export const MAX_GRID_COLUMNS = 5
const GRID_BREAKPOINTS = [
  { query: '(width >= 48rem)', columns: 5 },
  { query: '(width >= 40rem)', columns: 3 },
]
export const gridColumns = ref(2)

export const menuOpen = ref(false)

// Desde 768 px el menú es una fila horizontal (un enlace por columna); antes, una lista vertical.
// (A 640 px las columnas miden ~113 px y "proyectos" no cabe.)
export const menuHorizontal = ref(false)

// Borde inferior del menú abierto, en px desde arriba de la pantalla (lo mide el navbar)
export const menuBottom = ref(0)

// Alto del menú abierto (lo mide el navbar). Al abrirse, el contenido baja esto + 24 px
export const menuHeight = ref(0)

// El navbar está sobre las fotos del stack de Inicio (transparente)
export const navOverPhotos = ref(false)

// Título de la sección en la que se está (se muestra debajo del logo, desde 768 px)
export const navSectionTitle = ref('')

// Acción opcional del título de sección: { label, run }. Con ella el título se vuelve un botón
// con una flecha "←" antes (ej. volver desde el detalle de un proyecto)
export const navTitleAction = shallowRef(null)

// Borde inferior (px desde arriba de la pantalla) de lo más bajo del navbar: el logo, el menú
// abierto o el título de sección. Las secciones fijas lo usan para no quedar debajo.
export const navContentBottom = ref(0)

// Se está viendo la sección de contacto: el logo se recoge hacia arriba (ver ContactCta)
export const contactInView = ref(false)

if (typeof window !== 'undefined') {
  const horizontal = window.matchMedia('(width >= 48rem)')
  const columns = GRID_BREAKPOINTS.map((b) => ({ ...b, list: window.matchMedia(b.query) }))
  const update = () => {
    menuHorizontal.value = horizontal.matches
    gridColumns.value = columns.find((c) => c.list.matches)?.columns ?? 2
  }
  horizontal.addEventListener('change', update)
  columns.forEach((c) => c.list.addEventListener('change', update))
  update()
}
