/*
 * Contenido del portafolio. No edites content.generated.json a mano:
 * se genera con `npm run fotos` a partir de la carpeta content/.
 */
import content from './content.generated.json'

// Fotos del stack de Inicio
export const heroPhotos = content.inicio

// Categorías (una por carpeta en content/proyectos)
export const categories = content.categorias

// Proyectos, del más reciente al más antiguo según su fecha "publicado"
export const projects = content.proyectos

export const latestProject = projects[0] ?? null

export const findProject = (slug) => projects.find((p) => p.slug === slug) ?? null

// Proyecto anterior (más reciente) y siguiente (más antiguo); la lista da la vuelta
export function neighbors(slug) {
  const i = projects.findIndex((p) => p.slug === slug)
  if (i === -1 || projects.length < 2) return { previous: null, next: null }
  const at = (n) => projects[(n + projects.length) % projects.length]
  return { previous: at(i - 1), next: at(i + 1) }
}
