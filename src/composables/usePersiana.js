/*
 * Curva de las persianas del sitio (--ease-persiana en main.css). En desarrollo se prueba otra
 * desde /guia y se recorre el sitio con ella; la que se publica es la de main.css: para publicar
 * una de estas, copiar su curva allí.
 */
const KEY = 'jdm:persiana'
export const persianas = [
  { nombre: 'in-out quint (publicada)', curva: 'cubic-bezier(0.83,0,0.17,1)', nota: 'Editorial, con mucho carácter.' },
  { nombre: 'anterior', curva: 'cubic-bezier(0.6,0,0.3,1)', nota: 'Arranca lento y frena largo (asimétrica).' },
  { nombre: 'in-out sine', curva: 'cubic-bezier(0.37,0,0.63,1)', nota: 'La más suave y pareja; casi sin aceleración.' },
  { nombre: 'in-out cubic', curva: 'cubic-bezier(0.65,0,0.35,1)', nota: 'Clásica: entra y sale suave, rápida al medio.' },
  { nombre: 'in-out quart', curva: 'cubic-bezier(0.76,0,0.24,1)', nota: 'Más marcada: pausa al inicio y al final.' },
  { nombre: 'in-out expo', curva: 'cubic-bezier(0.87,0,0.13,1)', nota: 'La más dramática: casi quieta en los extremos.' },
]

export function aplicarPersiana(nombre) {
  const persiana = persianas.find((p) => p.nombre === nombre) ?? persianas[0]
  const root = document.documentElement
  if (persiana === persianas[0]) root.style.removeProperty('--ease-persiana')
  else root.style.setProperty('--ease-persiana', persiana.curva)
  try {
    localStorage.setItem(KEY, persiana.nombre)
  } catch {
    // Dura hasta recargar
  }
}

export function persianaGuardada() {
  try {
    return localStorage.getItem(KEY) ?? persianas[0].nombre
  } catch {
    return persianas[0].nombre
  }
}

// La curva en uso, para las animaciones hechas en JavaScript (Web Animations)
export const easePersiana = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--ease-persiana').trim() || persianas[0].curva
