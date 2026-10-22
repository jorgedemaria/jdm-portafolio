/*
 * Ubica una lista en la retícula de tercios del sitio (la del stack de Inicio), en orden y por
 * filas: lo horizontal ocupa 2 tercios y lo vertical 1. Cada fila toma los siguientes mientras
 * quepan en los 3 tercios; si sobra espacio, la fila se pega a la izquierda o a la derecha,
 * alternando. Con wideFirst, el primero ocupa los 3 tercios. Con cols: 2 se usa en una grilla de
 * 2 tercios (lo horizontal ocupa la fila entera y lo vertical va de a pares).
 * Devuelve, para cada elemento y en el mismo orden, { row, col, span } (filas y columnas desde 1).
 */
export function thirdsLayout(items, isPortrait, { wideFirst = false, cols = 3 } = {}) {
  const placed = []
  let row = 0
  let i = 0
  while (i < items.length) {
    const spans = []
    let used = 0
    while (i < items.length) {
      const span = wideFirst && i === 0 ? cols : isPortrait(items[i]) ? 1 : 2
      if (spans.length && used + span > cols) break
      spans.push(span)
      used += span
      i++
    }
    let col = row % 2 ? cols + 1 - used : 1
    for (const span of spans) {
      placed.push({ row: row + 1, col, span })
      col += span
    }
    row++
  }
  return placed
}

/*
 * Para usarlo en una grilla de 3 columnas sin espacio entre ellas (así el borde izquierdo de cada
 * elemento cae justo en una línea de tercio). Desde 768 px: THIRDS_CLASS en cada elemento,
 * thirdsStyle(p) como style y thirdsGutter(p) como clase (el aire va por la derecha, salvo en el
 * que llega al borde).
 */
export const THIRDS_CLASS = 'md:[grid-column:var(--col)] md:[grid-row:var(--fila)]'
export const thirdsStyle = ({ row, col, span }) => ({ '--fila': row, '--col': `${col} / span ${span}` })
export const thirdsGutter = ({ col, span }, cols = 3) => col + span - 1 < cols && 'md:pr-6 lg:pr-10'
