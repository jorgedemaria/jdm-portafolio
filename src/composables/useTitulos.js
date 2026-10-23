/*
 * Tipografías para probar en los títulos (font-display) en desarrollo: se eligen en /guia y cambian
 * todo el sitio, como las paletas (ver usePaleta). El logo, el navbar y los textos siguen en
 * JetBrains Mono. La que se publica es la de @theme en main.css (Instrument Serif); para publicar
 * otra, instalarla con @fontsource y ponerla allí.
 */
export const titulos = [
  {
    nombre: 'Instrument Serif (publicada)',
    familia: null,
    muestra: "'Instrument Serif', serif",
    peso: 400,
    nota: 'Editorial y angosta, de revista de arquitectura',
  },
  { nombre: 'Sora', familia: "'Sora', sans-serif", peso: 600, nota: 'Sans geométrica, la anterior' },
  { nombre: 'Fraunces', familia: "'Fraunces', serif", peso: 400, nota: 'Blanda y con carácter, algo retro' },
  { nombre: 'Newsreader', familia: "'Newsreader', serif", peso: 500, nota: 'Sobria, de libro; muy legible' },
  {
    nombre: 'Cormorant Garamond',
    familia: "'Cormorant Garamond', serif",
    peso: 600,
    nota: 'Clásica y fina, de alto contraste',
  },
  { nombre: 'EB Garamond', familia: "'EB Garamond', serif", peso: 500, nota: 'Garamond tradicional, cálida' },
  { nombre: 'DM Serif Display', familia: "'DM Serif Display', serif", peso: 400, nota: 'Contrastada y pesada, de cartel' },
]

// Todas las de prueba en una sola hoja de Google Fonts (solo en desarrollo)
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Sora:wght@600&family=Fraunces:opsz,wght@9..144,400&family=Newsreader:opsz,wght@6..72,500&family=Cormorant+Garamond:wght@600&family=EB+Garamond:wght@500&family=DM+Serif+Display&display=swap'

export function cargarFuentes() {
  if (document.getElementById('fuentes-prueba')) return
  const link = document.createElement('link')
  link.id = 'fuentes-prueba'
  link.rel = 'stylesheet'
  link.href = FONTS_URL
  document.head.appendChild(link)
}

const KEY = 'jdm:titulos'
// Pesos de los títulos (text-h1 a text-h4), según la fuente elegida
const PESOS = ['h1', 'h2', 'h3', 'h4']

export function aplicarTitulos(nombre) {
  const opcion = titulos.find((t) => t.nombre === nombre) ?? titulos[0]
  const root = document.documentElement
  if (opcion.familia) {
    cargarFuentes()
    root.style.setProperty('--font-display', opcion.familia)
    PESOS.forEach((t) => root.style.setProperty(`--text-${t}--font-weight`, String(opcion.peso)))
  } else {
    root.style.removeProperty('--font-display')
    PESOS.forEach((t) => root.style.removeProperty(`--text-${t}--font-weight`))
  }
  try {
    localStorage.setItem(KEY, opcion.nombre)
  } catch {
    // Sin almacenamiento: la elección dura hasta recargar
  }
  return opcion.nombre
}

/*
 * Logo en Instrument Serif (prueba): cambia --font-logo y su peso (400, el único que tiene) en todo
 * el sitio. Si no, vuelve al mono extrabold.
 */
const LOGO_KEY = 'jdm:logo-serif'
export function aplicarLogoSerif(activo) {
  const root = document.documentElement
  if (activo) {
    cargarFuentes()
    root.style.setProperty('--font-logo', "'Instrument Serif', serif")
    root.style.setProperty('--logo-peso', '400')
    root.style.setProperty('--text-logo--font-weight', '400')
  } else {
    root.style.removeProperty('--font-logo')
    root.style.removeProperty('--logo-peso')
    root.style.removeProperty('--text-logo--font-weight')
  }
  try {
    localStorage.setItem(LOGO_KEY, activo ? '1' : '0')
  } catch {
    // Sin almacenamiento: dura hasta recargar
  }
  return activo
}
export function logoSerifGuardado() {
  try {
    return localStorage.getItem(LOGO_KEY) === '1'
  } catch {
    return false
  }
}

export function tituloGuardado() {
  try {
    return localStorage.getItem(KEY) ?? titulos[0].nombre
  } catch {
    return titulos[0].nombre
  }
}
