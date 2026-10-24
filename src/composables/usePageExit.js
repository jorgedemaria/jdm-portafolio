/*
 * Salida de la página al ir a otra: lo que se ve de ella se retira antes del cambio. Las fotos se
 * recogen como persiana hacia arriba (como la franja del navbar) y los textos se borran desde el
 * final, como con la tecla borrar. Solo lo que
 * está en pantalla; el resto se va con el fundido de siempre.
 */
export const PAGE_EXIT = 500

const inView = (rect) => rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0

export function playPageExit() {
  const main = document.getElementById('contenido')
  if (!main) return Promise.resolve(() => {})

  // La foto con su caja (el <picture> lleva el color de fondo mientras carga)
  const photos = [...main.querySelectorAll('picture, video')].filter((el) => inView(el.getBoundingClientRect()))
  const shutters = photos.map((el) =>
    el.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], {
      duration: PAGE_EXIT,
      easing: 'cubic-bezier(0.6, 0, 0.3, 1)',
      fill: 'forwards',
    }),
  )

  // Textos en pantalla: cada uno pierde sus letras desde el final, todos al mismo tiempo
  const texts = []
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.nodeValue.trim()) continue
    range.selectNodeContents(node)
    if (inView(range.getBoundingClientRect())) texts.push({ node, full: node.nodeValue })
  }
  const typing = new Promise((resolve) => {
    if (!texts.length) return resolve()
    const start = performance.now()
    const step = (now) => {
      const left = 1 - Math.min((now - start) / PAGE_EXIT, 1)
      for (const t of texts) t.node.nodeValue = t.full.slice(0, Math.ceil(t.full.length * left))
      if (left > 0) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })

  // Termina con una función que deshace la salida, para cuando la página sigue en pantalla
  // (volver arriba de Inicio); al cambiar de página no hace falta
  const restore = () => {
    shutters.forEach((a) => a.cancel())
    for (const t of texts) t.node.nodeValue = t.full
  }
  return Promise.all([typing, ...shutters.map((a) => a.finished.catch(() => {}))]).then(() => restore)
}
