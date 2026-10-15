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

// Los 3 más recientes, para "últimos registros" en Inicio
export const latestProjects = projects.slice(0, 3)

export const findProject = (slug) => projects.find((p) => p.slug === slug) ?? null
