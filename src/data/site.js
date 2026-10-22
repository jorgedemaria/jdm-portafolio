// Datos generales del sitio. Edita aquí textos de navegación y contacto.
export const site = {
  name: 'Jorge de María',
  // Logo (en Inicio, al entrar, se escribe con una carita en vez del "*"; ver AppNav)
  wordmark: 'jorge de maría *',
  email: 'jorgedemaria@pm.me',
  // Completa estos datos para que aparezcan en el pie de página (vacíos = ocultos)
  instagram: 'jorgedemaria63', // sin @
  telefono: '+56 9 9081 5973', // se muestra tal cual
  ubicacion: 'Valdivia', // ej: 'Santiago, Chile'
  // Menú en minúsculas. silabas: el mismo texto con "·" entre sílabas, para la animación
  nav: [
    { label: 'inicio', silabas: 'i·ni·cio', to: { name: 'home' } },
    { label: 'registros', silabas: 're·gis·tros', to: { name: 'projects' } },
    { label: 'sobre mí', silabas: 'so·bre mí', to: { name: 'about' } },
    // Contacto es una sección de Inicio, no una página aparte
    { label: 'contacto', silabas: 'con·tac·to', to: { name: 'home', hash: '#contacto' } },
  ],
  cta: { label: 'escríbeme', silabas: 'es·crí·be·me', to: { name: 'home', hash: '#contacto' } },
}
