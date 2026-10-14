// Datos generales del sitio. Edita aquí textos de navegación y contacto.
export const site = {
  name: 'Jorge de María',
  // Texto de la animación de entrada, separado en palabras y sílabas
  nameSyllables: [['Jor', 'ge'], ['de'], ['Ma', 'rí', 'a'], [':)']],
  wordmark: 'JORGE DE MARÍA',
  email: 'jorgedemaria@pm.me',
  // Menú en minúsculas. silabas: el mismo texto con "·" entre sílabas, para la animación
  nav: [
    { label: 'inicio', silabas: 'i·ni·cio', to: { name: 'home' } },
    { label: 'proyectos', silabas: 'pro·yec·tos', to: { name: 'projects' } },
    { label: 'sobre mí', silabas: 'so·bre mí', to: { name: 'about' } },
    { label: 'contacto', silabas: 'con·tac·to', to: { name: 'contact' } },
  ],
  cta: { label: 'escríbeme', silabas: 'es·crí·be·me', to: { name: 'contact' } },
}
