/*
 * Propuestas de tipografía para probar en desarrollo (desde /guia): logo, títulos y texto. Salen de
 * la biblioteca de la skill design-taste-frontend (library/type.json), elegidas para un portafolio
 * de fotografía de arquitectura: una sola familia en varios pesos, o una pareja. La publicada es
 * la de main.css; para publicar otra, guardar sus archivos en /public/fonts y declararla allí.
 * shortcut: el logo chico mide con el ancho del logo en Switzer (6.66em, ver --logo-chico); con
 * otra letra queda algo más chico o grande. Ajustar al publicar
 */
const KEY = 'jdm:tipografia'
const google = (familias) => `https://fonts.googleapis.com/css2?${familias.map((f) => `family=${f}`).join('&')}&display=swap`
// Fontshare devuelve una sola familia por pedido: una hoja por familia
const fontshare = (familias) => `https://api.fontshare.com/v2/css?${familias.map((f) => `f[]=${f}`).join('&')}&display=swap`

const MONO = "'JetBrains Mono', ui-monospace, monospace"
const INSTRUMENT = "'Instrument Serif', ui-serif, Georgia, serif"

export const tipografias = [
  {
    nombre: 'publicada',
    tipo: 'una familia',
    nota: 'Switzer, un neo-grotesco suizo para todo: logo en negrita, títulos en seminegrita apretada, texto en regular.',
    logo: { familia: "'Switzer', sans-serif", peso: 700, tracking: '-0.04em' },
    titulos: { familia: "'Switzer', sans-serif", peso: 600, tracking: '-0.02em' },
    texto: { familia: "'Switzer', sans-serif" },
    fuentes: [],
  },
  {
    nombre: 'anterior',
    tipo: 'pareja',
    nota: 'JetBrains Mono para el logo y el texto, Instrument Serif para los títulos.',
    logo: { familia: MONO, peso: 800, tracking: '-0.04em' },
    titulos: { familia: INSTRUMENT, peso: 400, tracking: '0' },
    texto: { familia: MONO },
    fuentes: [google(['Instrument+Serif', 'JetBrains+Mono:wght@300;400;700;800'])],
  },
  // Una sola familia, distintos pesos
  {
    nombre: 'Hanken Grotesk',
    tipo: 'una familia',
    nota: 'Grotesco cálido: logo en negrita, títulos en medium a un solo tamaño grande, texto chico. Un sistema de dos tamaños.',
    logo: { familia: "'Hanken Grotesk', sans-serif", peso: 800, tracking: '-0.04em' },
    titulos: { familia: "'Hanken Grotesk', sans-serif", peso: 500, tracking: '-0.02em' },
    texto: { familia: "'Hanken Grotesk', sans-serif" },
    fuentes: [google(['Hanken+Grotesk:wght@400;500;800'])],
  },
  {
    nombre: 'Archivo',
    tipo: 'una familia',
    nota: 'Grotesco firme, de origen tipográfico de prensa: logo en extranegrita, títulos en regular aun grandes. Compuesto, nada gritado.',
    logo: { familia: "'Archivo', sans-serif", peso: 800, tracking: '-0.03em' },
    titulos: { familia: "'Archivo', sans-serif", peso: 400, tracking: '-0.02em' },
    texto: { familia: "'Archivo', sans-serif" },
    fuentes: [google(['Archivo:wght@400;600;800'])],
  },
  {
    nombre: 'Albert Sans',
    tipo: 'una familia',
    nota: 'Geométrico con mesura escandinava: letras redondas y color parejo, nada decorativo. Deja todo el protagonismo a las fotos.',
    logo: { familia: "'Albert Sans', sans-serif", peso: 700, tracking: '-0.03em' },
    titulos: { familia: "'Albert Sans', sans-serif", peso: 600, tracking: '-0.02em' },
    texto: { familia: "'Albert Sans', sans-serif" },
    fuentes: [google(['Albert+Sans:wght@400;600;700'])],
  },
  {
    nombre: 'Newsreader',
    tipo: 'una familia',
    nota: 'Una serif de periódico con tamaños ópticos: títulos livianos y apretados, logo en seminegrita, texto de libro. Editorial.',
    logo: { familia: "'Newsreader', serif", peso: 600, tracking: '-0.03em' },
    titulos: { familia: "'Newsreader', serif", peso: 300, tracking: '-0.02em' },
    texto: { familia: "'Newsreader', serif" },
    fuentes: [google(['Newsreader:opsz,wght@6..72,300;6..72,400;6..72,600'])],
  },
  {
    nombre: 'JetBrains Mono',
    tipo: 'una familia',
    nota: 'Todo en el mono del logo: títulos en liviano, logo en extranegrita. Técnico, de ficha, coherente de punta a punta.',
    logo: { familia: MONO, peso: 800, tracking: '-0.04em' },
    titulos: { familia: MONO, peso: 300, tracking: '-0.04em' },
    texto: { familia: MONO },
    fuentes: [google(['JetBrains+Mono:wght@300;400;800'])],
  },
  // Parejas
  {
    nombre: 'Gambarino + General Sans',
    tipo: 'pareja',
    nota: 'Serif de títulos angosta y filosa sobre un sans chico y neutro; el logo en el sans. Salto de tamaños marcado, de revista.',
    logo: { familia: "'General Sans', sans-serif", peso: 600, tracking: '-0.04em' },
    titulos: { familia: "'Gambarino', serif", peso: 400, tracking: '-0.01em' },
    texto: { familia: "'General Sans', sans-serif" },
    fuentes: [fontshare(['gambarino@400']), fontshare(['general-sans@400,600'])],
  },
  {
    nombre: 'Bodoni Moda + Jost',
    tipo: 'pareja',
    nota: 'Didona de trazos finísimos para el logo y los títulos, sobre un geométrico liviano. La pareja clásica de moda y arquitectura.',
    logo: { familia: "'Bodoni Moda', serif", peso: 600, tracking: '-0.02em' },
    titulos: { familia: "'Bodoni Moda', serif", peso: 500, tracking: '-0.01em' },
    texto: { familia: "'Jost', sans-serif" },
    fuentes: [google(['Bodoni+Moda:opsz,wght@6..96,500;6..96,600', 'Jost:wght@400;500'])],
  },
  {
    nombre: 'Zodiak + Hanken Grotesk',
    tipo: 'pareja',
    nota: 'Serif de trazo muy fino a tamaño grande, que se lee como dibujo, con un grotesco chico; el logo en el grotesco, negrita.',
    logo: { familia: "'Hanken Grotesk', sans-serif", peso: 800, tracking: '-0.04em' },
    titulos: { familia: "'Zodiak', serif", peso: 300, tracking: '-0.01em' },
    texto: { familia: "'Hanken Grotesk', sans-serif" },
    fuentes: [fontshare(['zodiak@300']), google(['Hanken+Grotesk:wght@400;500;800'])],
  },
  {
    nombre: 'Instrument Serif + Switzer',
    tipo: 'pareja',
    nota: 'Los títulos de hoy, con un neo-grotesco en lugar del mono para el logo y el texto: más suave y contemporáneo.',
    logo: { familia: "'Switzer', sans-serif", peso: 700, tracking: '-0.04em' },
    titulos: { familia: INSTRUMENT, peso: 400, tracking: '0' },
    texto: { familia: "'Switzer', sans-serif" },
    fuentes: [google(['Instrument+Serif'])],
  },
  {
    nombre: 'Libre Franklin + Source Serif',
    tipo: 'pareja',
    nota: 'Gótico americano en negrita para el logo y los títulos, sobre una serif sobria para el texto. Voz de periódico.',
    logo: { familia: "'Libre Franklin', sans-serif", peso: 800, tracking: '-0.04em' },
    titulos: { familia: "'Libre Franklin', sans-serif", peso: 700, tracking: '-0.03em' },
    texto: { familia: "'Source Serif 4', serif" },
    fuentes: [google(['Libre+Franklin:wght@700;800', 'Source+Serif+4:wght@400;600'])],
  },
]

// Carga las fuentes de todas las propuestas (o de una), una sola vez cada hoja
export function cargarTipografias(lista = tipografias) {
  lista.flatMap((t) => t.fuentes).forEach((href) => {
    if (document.querySelector(`link[href="${CSS.escape(href)}"]`)) return
    const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href })
    document.head.appendChild(link)
  })
}

// Aplica una propuesta a todo el sitio: familias (variables de main.css) y pesos e interletra (estilo propio)
export function aplicarTipografia(nombre) {
  const t = tipografias.find((x) => x.nombre === nombre) ?? tipografias[0]
  const root = document.documentElement
  let style = document.getElementById('tipografia-prueba')
  if (t === tipografias[0]) {
    ;['--font-logo', '--font-display', '--font-mono'].forEach((v) => root.style.removeProperty(v))
    style?.remove()
  } else {
    cargarTipografias([t])
    root.style.setProperty('--font-logo', t.logo.familia)
    root.style.setProperty('--font-display', t.titulos.familia)
    root.style.setProperty('--font-mono', t.texto.familia)
    style ??= Object.assign(document.createElement('style'), { id: 'tipografia-prueba' })
    style.textContent = `.font-logo{font-weight:${t.logo.peso}!important;letter-spacing:${t.logo.tracking}!important}.font-display{font-weight:${t.titulos.peso};letter-spacing:${t.titulos.tracking}}`
    document.head.appendChild(style)
  }
  try {
    localStorage.setItem(KEY, t.nombre)
  } catch {
    // Dura hasta recargar
  }
  return t.nombre
}

export function tipografiaGuardada() {
  try {
    return localStorage.getItem(KEY) ?? tipografias[0].nombre
  } catch {
    return tipografias[0].nombre
  }
}
