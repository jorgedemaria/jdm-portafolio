/*
 * Paletas para probar colores en desarrollo: se eligen en /guia y cambian todo el sitio
 * (reemplazan los tokens --color-* de main.css). La paleta que se publica es la de @theme en
 * main.css; para publicar una de estas, copiar sus colores allí.
 */
export const paletas = [
  { nombre: 'publicada', colores: null },
  { nombre: 'verde y crema', colores: { fondo: '#f1f0e2', primario: '#207349', texto: '#101010' } },
  {
    nombre: 'verde, crema y rosado',
    colores: { fondo: '#f1f0e2', primario: '#207349', acento: '#f2b8c6', texto: '#101010' },
  },
]

const KEY = 'jdm:paleta'
const TOKENS = ['fondo', 'primario', 'acento', 'texto']

export function aplicarPaleta(nombre) {
  const paleta = paletas.find((p) => p.nombre === nombre) ?? paletas[0]
  const root = document.documentElement
  TOKENS.forEach((token) => {
    const valor = paleta.colores?.[token]
    if (valor) root.style.setProperty(`--color-${token}`, valor)
    else root.style.removeProperty(`--color-${token}`)
  })
  // La barra del navegador en el teléfono, del color del fondo
  const fondo = paleta.colores?.fondo ?? getComputedStyle(root).getPropertyValue('--color-fondo').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', fondo)
  try {
    localStorage.setItem(KEY, paleta.nombre)
  } catch {
    // Sin almacenamiento: la paleta dura hasta recargar
  }
  return paleta.nombre
}

export function paletaGuardada() {
  try {
    return localStorage.getItem(KEY) ?? paletas[0].nombre
  } catch {
    return paletas[0].nombre
  }
}
