import { onBeforeUnmount } from 'vue'

/*
 * Fotos que aparecen como las tarjetas de Registros: la primera vez que asoman en pantalla se
 * descubren como persiana que baja (desde arriba), y quedan fijas.
 * Uso: `const reveal = useScrollReveal()` y en el template `:ref="reveal"` en el contenedor
 * de cada foto. Con movimiento reducido no hace nada.
 */
const HIDDEN = 'inset(0 0 100% 0)'
const TRANSITION = 'clip-path 1s var(--ease-persiana)'
/*
 * Una foto lazy tapada entera por la persiana no carga nunca (Chrome la cuenta como no visible):
 * se la carga cuando su contenedor (sin recorte) está a 1,5 pantallas de entrar
 */
let preloader = null
export function preloadPhoto(container) {
  preloader ??= new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue
        target.querySelectorAll('img').forEach((img) => (img.loading = 'eager'))
        preloader.unobserve(target)
      }
    },
    { rootMargin: '0px 0px 150% 0px' },
  )
  preloader.observe(container)
}

// Fundido de la foto al cargar (ResponsiveImage)
const PHOTO_FADE = 700

/*
 * Llama a open cuando la foto de el está lista para verse: si aún carga (las lejanas cargan recién
 * al acercarse), espera a que cargue y termine su fundido, así la persiana no abre un recuadro vacío
 */
export function whenPhotoReady(el, open) {
  const img = el.querySelector('img')
  if (!img || (img.complete && img.naturalWidth)) return open()
  img.loading = 'eager'
  img.addEventListener('load', () => setTimeout(open, PHOTO_FADE), { once: true })
}

export function useScrollReveal() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Se observa el padre: con el recorte puesto, la foto misma nunca cuenta como visible
  const clipped = new WeakMap()
  const observer = reduced
    ? null
    : new IntersectionObserver(
        (entries) => {
          for (const { target, isIntersecting } of entries) {
            if (!isIntersecting) continue
            const el = clipped.get(target)
            whenPhotoReady(el, () => (el.style.clipPath = 'inset(0)'))
            observer.unobserve(target)
          }
        },
        { threshold: 0.15 },
      )

  // Ref de función para el template: registra cada contenedor una sola vez
  function reveal(el) {
    const parent = el?.parentElement
    if (!parent || !observer || clipped.has(parent)) return
    clipped.set(parent, el)
    el.style.clipPath = HIDDEN
    el.style.transition = TRANSITION
    observer.observe(parent)
    preloadPhoto(parent)
  }

  onBeforeUnmount(() => observer?.disconnect())

  return reveal
}
