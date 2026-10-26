/*
 * Curva de las persianas del sitio (--ease-persiana en main.css), para las animaciones hechas en
 * JavaScript (Web Animations)
 */
export const easePersiana = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--ease-persiana').trim() || 'cubic-bezier(0.83,0,0.17,1)'
