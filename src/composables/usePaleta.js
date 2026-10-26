/*
 * Paletas para probar colores en desarrollo: se eligen en /guia y cambian todo el sitio
 * (reemplazan los tokens --color-* de main.css). La paleta que se publica es la de @theme en
 * main.css; para publicar una de estas, copiar sus colores allí.
 *
 * Pensadas para el reparto publicado, "tinta y un acento" (ver --color-marca y siguientes en main.css): fondo neutro, texto
 * en tinta y un solo color vivo (primario) para el logo y los subrayados. El acento es un tono
 * apenas distinto del fondo, para superficies. Todas cumplen AA: primario y texto sobre el fondo
 */
export const paletas = [
  { nombre: 'publicada', colores: null },

  // Oscuras: las fotos resaltan sobre un fondo casi negro, como grafito y lima
  { nombre: 'grafito y lima', colores: { fondo: '#1d1e1b', primario: '#d6f264', acento: '#4a4b45', texto: '#ecebe6' } },
  { nombre: 'hollín y menta', colores: { fondo: '#121313', primario: '#a1ffcb', acento: '#242525', texto: '#ecebe6' } },
  { nombre: 'carbón y naranja', colores: { fondo: '#18191b', primario: '#ff5a1f', acento: '#2a2b2d', texto: '#eff0f1' } },
  { nombre: 'noche y celeste', colores: { fondo: '#0e1116', primario: '#7cc4ff', acento: '#202328', texto: '#e9edf3' } },
  { nombre: 'tinta y chicle', colores: { fondo: '#141214', primario: '#ff8fc7', acento: '#262426', texto: '#efecee' } },
  { nombre: 'grafito y amarillo', colores: { fondo: '#1c1c1a', primario: '#f6e016', acento: '#2e2e2c', texto: '#ecebe6' } },
  { nombre: 'bosque y lima', colores: { fondo: '#0f1f10', primario: '#c6f19d', acento: '#213122', texto: '#eef2ea' } },
  { nombre: 'negro y rojo señal', colores: { fondo: '#0b0b0b', primario: '#ff4433', acento: '#1d1d1d', texto: '#efefef' } },

  // Claras: fondos de galería, blancos, papel o piedra, con un color vivo
  { nombre: 'papel y cobalto', colores: { fondo: '#f4f4f1', primario: '#1f2de6', acento: '#e4e4e1', texto: '#111111' } },
  { nombre: 'blanco y rojo señal', colores: { fondo: '#ffffff', primario: '#d92b21', acento: '#efefef', texto: '#0a0a0a' } },
  { nombre: 'hueso y verde botella', colores: { fondo: '#efeee9', primario: '#0d5c3a', acento: '#dfded9', texto: '#141414' } },
  { nombre: 'gris frío y ultramar', colores: { fondo: '#e9ebee', primario: '#1423b8', acento: '#d9dbde', texto: '#0b0c0e' } },
  { nombre: 'hormigón y petróleo', colores: { fondo: '#dcdbd6', primario: '#0b5d73', acento: '#cccbc6', texto: '#151515' } },
  { nombre: 'papel y fucsia', colores: { fondo: '#f6f5f2', primario: '#c2186b', acento: '#e6e5e2', texto: '#111111' } },
  { nombre: 'blanco y verde bosque', colores: { fondo: '#fafaf8', primario: '#1f6b3a', acento: '#eaeae8', texto: '#111111' } },
  { nombre: 'piedra y plano', colores: { fondo: '#ebeae7', primario: '#2456d6', acento: '#dbdad7', texto: '#26251e' } },

  // La anterior publicada, para comparar
  { nombre: 'verde, crema y rosado', colores: { fondo: '#f1f0e2', primario: '#207349', acento: '#f2b8c6', texto: '#101010' } },
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
