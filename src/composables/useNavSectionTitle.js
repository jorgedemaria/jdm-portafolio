import { onMounted, onBeforeUnmount, unref } from 'vue'
import { navSectionTitle } from './useMenu'

const NAV_HEIGHT = 96
// La sección tiene que ocupar al menos esto debajo del navbar para considerarse "actual"
const MIN_VISIBLE = 200

/*
 * Mientras la sección `rootRef` está bajo el navbar, su `title` se muestra debajo del logo.
 * `title` puede ser un texto, una ref o una función. Solo borra el título si es el suyo,
 * así varias secciones pueden usarlo sin pisarse.
 */
export function useNavSectionTitle(rootRef, titleSource) {
  const read = () => (typeof titleSource === 'function' ? titleSource() : unref(titleSource))
  let title = ''
  function update() {
    if (navSectionTitle.value === title && read() !== title) navSectionTitle.value = ''
    title = read()
    const box = rootRef.value?.getBoundingClientRect()
    const active = box && box.top <= NAV_HEIGHT && box.bottom > NAV_HEIGHT + MIN_VISIBLE
    if (active) navSectionTitle.value = title
    else if (navSectionTitle.value === title) navSectionTitle.value = ''
  }

  onMounted(() => {
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    update()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
    if (navSectionTitle.value === title) navSectionTitle.value = ''
  })
}
