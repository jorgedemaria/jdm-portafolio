import { ref, watch, onBeforeUnmount } from 'vue'

export const SCRAMBLE_CHARSET = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789*#/[]'
// Igual, en minúsculas (para el menú)
export const SCRAMBLE_CHARSET_LOWER = SCRAMBLE_CHARSET.toLowerCase()
// Símbolos del teclado, para el logo y el botón del menú
export const SYMBOL_CHARSET = '!*?#%&@$+=<>/^~'

/*
 * Lleva `display` de `from` a `target`: cada carácter pasa por caracteres al azar antes
 * de fijarse, de izquierda a derecha. Devuelve una función que cancela la animación.
 */
function animate(display, from, target, opts, onDone) {
  const { stagger, scramble, tick, keepUnchanged, charset } = opts
  const randomChar = () => charset[Math.floor(Math.random() * charset.length)]
  const length = Math.max(from.length, target.length)
  const duration = (length - 1) * stagger + scramble
  const start = performance.now()
  let lastTick = -Infinity
  let frame = 0

  function step(now) {
    const t = now - start
    if (t - lastTick >= tick || t >= duration) {
      lastTick = t
      let text = ''
      for (let i = 0; i < length; i++) {
        const begin = i * stagger
        if (opts.only && !opts.only.has(i)) text += target[i] ?? ''
        else if (keepUnchanged && from[i] === target[i]) text += target[i]
        else if (t < begin) text += from[i] ?? ''
        else if (t >= begin + scramble) text += target[i] ?? ''
        else text += target[i] === ' ' ? ' ' : randomChar()
      }
      display.value = text
    }
    if (t < duration) frame = requestAnimationFrame(step)
    else {
      display.value = target
      onDone?.()
    }
  }

  frame = requestAnimationFrame(step)
  return () => cancelAnimationFrame(frame)
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const DEFAULTS = { stagger: 35, scramble: 280, tick: 50, keepUnchanged: true, charset: SCRAMBLE_CHARSET }

/*
 * Devuelve un texto que sigue a `source`: cada vez que cambia, sus caracteres pasan por
 * caracteres al azar antes de fijarse en el nuevo.
 * keepUnchanged: los caracteres que no cambian se quedan quietos en vez de desordenarse.
 * playing (ref, opcional): queda en true mientras se anima (ej. para mostrar el cursor).
 */
export function useScrambleText(source, options = {}) {
  const opts = { ...DEFAULTS, ...options }
  const display = ref(source.value)
  const reducedMotion = prefersReducedMotion()
  const playing = options.playing
  let cancel = () => {}

  watch(source, (target) => {
    cancel()
    if (reducedMotion) {
      display.value = target
      return
    }
    if (playing) playing.value = true
    cancel = animate(display, display.value, target, opts, () => {
      if (playing) playing.value = false
    })
  })

  onBeforeUnmount(() => cancel())

  return display
}

/*
 * Texto fijo que se puede "barajar" a demanda: play() desordena sus caracteres y los
 * vuelve a fijar. play(only) desordena solo las posiciones del Set `only`.
 * `playing` indica si la animación está en curso.
 */
export function useScrambleReplay(text, options = {}) {
  const opts = { ...DEFAULTS, ...options, keepUnchanged: false }
  const display = ref(text)
  const playing = ref(false)
  let cancel = () => {}

  function play(only = null) {
    if (prefersReducedMotion()) return
    cancel()
    playing.value = true
    cancel = animate(display, text, text, { ...opts, only }, () => (playing.value = false))
  }

  onBeforeUnmount(() => cancel())

  return { display, playing, play }
}

/*
 * Sílabas de un texto escrito con "·" entre sílabas (ej. 'So·bre mí'):
 * devuelve, para cada sílaba, las posiciones de sus letras en el texto sin "·".
 */
export function syllableRanges(pattern) {
  const ranges = []
  let current = []
  let index = 0
  for (const char of pattern) {
    if (char === '·' || char === ' ') {
      ranges.push(current)
      current = []
      if (char === ' ') index++
    } else {
      current.push(index++)
    }
  }
  ranges.push(current)
  return ranges.filter((range) => range.length)
}

/*
 * Elige una sílaba al azar y, la mitad de las veces, suma la letra que está justo
 * antes o después de ella (dentro de la misma palabra), para que queden letras seguidas.
 */
export function pickSyllable(ranges) {
  const random = (list) => list[Math.floor(Math.random() * list.length)]
  const syllable = random(ranges)
  const picked = new Set(syllable)
  const letters = new Set(ranges.flat())
  const neighbors = [syllable[0] - 1, syllable[syllable.length - 1] + 1].filter((i) => letters.has(i))
  if (neighbors.length && Math.random() < 0.5) picked.add(random(neighbors))
  return picked
}
