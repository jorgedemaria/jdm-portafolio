import { ref } from 'vue'

/*
 * Estado compartido del menú principal. Lo usan el navbar (que lo abre, cierra y mide)
 * y el stack de Inicio (para mover o recoger las líneas de la retícula).
 */

export const menuOpen = ref(false)


// Borde inferior del menú abierto, en px desde arriba de la pantalla (lo mide el navbar)
export const menuBottom = ref(0)

// Alto del menú abierto (lo mide el navbar). Al abrirse, el contenido baja esto + 24 px
export const menuHeight = ref(0)

// El navbar está sobre las fotos del stack de Inicio (transparente)
export const navOverPhotos = ref(false)

// Título de la sección en la que se está (se muestra debajo del logo, desde 768 px)
export const navSectionTitle = ref('')


// Borde inferior (px desde arriba de la pantalla) de lo más bajo del navbar: el logo, el menú
// abierto o el título de sección. Las secciones fijas lo usan para no quedar debajo.
export const navContentBottom = ref(0)

// Scroll (px) que toma el nombre gigante de Inicio en achicarse hasta el logo (lo mide el navbar;
// 0 en las demás páginas). El stack de Inicio espera quieto ese tramo
export const logoShrink = ref(0)
// Se vuelve a Inicio desde otra página: la franja baja sola y el stack entra como persiana
export const returningHome = ref(false)
// Desde 1024 px: posición x (en pantalla) donde empieza el texto del primer enlace del menú; 0 si no
// está en la fila del logo. Las tarjetas de Registros alinean su texto ahí
export const menuTextX = ref(0)

// Se está viendo la sección de contacto: el logo se recoge hacia arriba (ver ContactCta)
export const contactInView = ref(false)

