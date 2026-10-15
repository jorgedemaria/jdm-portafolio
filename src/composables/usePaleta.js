/*
 * Paletas para probar colores en desarrollo: se eligen en /guia y cambian todo el sitio
 * (reemplazan los tokens --color-* de main.css). La paleta que se publica es la de @theme en
 * main.css; para publicar una de estas, copiar sus colores allí.
 */
// El primario sobre el fondo cumple AA (4,5:1) en todas. Sobre el acento, solo en "bosque y
// rosa empolvado", "botella y chicle", "rosa de fondo" y "tinta y papel"; en las demás el
// acento sirve para rellenos o texto grande, no para texto chico encima
export const paletas = [
  { nombre: 'publicada', colores: null },
  { nombre: 'verde y crema', colores: { fondo: '#f1f0e2', primario: '#207349', texto: '#101010' } },

  // Crema, verde y rosado
  {
    nombre: 'verde, crema y rosado',
    colores: { fondo: '#f1f0e2', primario: '#207349', acento: '#f2b8c6', texto: '#101010' },
  },
  {
    nombre: 'bosque y rosa empolvado',
    colores: { fondo: '#f3efe4', primario: '#1f5e3b', acento: '#f2c4cf', texto: '#141414' },
  },
  {
    nombre: 'salvia y rosa',
    colores: { fondo: '#f5f1e8', primario: '#3d6b4f', acento: '#f4b6c2', texto: '#1a1a1a' },
  },
  {
    nombre: 'botella y chicle',
    colores: { fondo: '#efeadb', primario: '#14532d', acento: '#ffc7d6', texto: '#101010' },
  },
  {
    nombre: 'crema rosada y verde',
    colores: { fondo: '#f7ece6', primario: '#1f6b45', acento: '#e9a6b5', texto: '#141414' },
  },
  {
    nombre: 'rosa de fondo',
    colores: { fondo: '#f6dfe2', primario: '#1f5e3b', acento: '#fbf3e4', texto: '#141414' },
  },

  // Otras direcciones
  {
    nombre: 'xp clásico',
    colores: { fondo: '#ece9d8', primario: '#0054e3', acento: '#f2b8c6', texto: '#101010' },
  },
  {
    nombre: 'tinta y papel',
    colores: { fondo: '#f4f1ea', primario: '#1b1b1b', acento: '#e8b4bc', texto: '#1b1b1b' },
  },
  {
    nombre: 'terracota',
    colores: { fondo: '#f3ede2', primario: '#a84a24', acento: '#f2c4cf', texto: '#141414' },
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
