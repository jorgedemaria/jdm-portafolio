import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { scrollToElement, scrollToTopNow, jumpToSection } from '../composables/useSmoothScroll'

const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: null } },
  {
    path: '/registros',
    name: 'projects',
    component: () => import('../views/ProjectsView.vue'),
    meta: { title: 'Registros' },
  },
  {
    path: '/registros/:slug',
    name: 'project',
    component: () => import('../views/ProjectDetailView.vue'),
    props: true,
    // El título de la pestaña lo pone la vista con el nombre del proyecto
    meta: { title: 'Registro' },
  },
  {
    path: '/sobre-mi',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
    meta: { title: 'Sobre mí' },
  },
  // Direcciones antiguas: los links compartidos con /proyectos siguen funcionando
  { path: '/proyectos', redirect: (to) => ({ name: 'projects', query: to.query }) },
  { path: '/proyectos/:slug', redirect: (to) => ({ name: 'project', params: to.params }) },
  // Contacto es una sección de Inicio; la dirección antigua lleva hasta ella
  { path: '/contacto', redirect: { name: 'home', hash: '#contacto' } },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
    meta: { title: 'Página no encontrada' },
  },
]

// Guía de componentes, solo en desarrollo
if (import.meta.env.DEV) {
  routes.splice(routes.length - 1, 0, {
    path: '/guia',
    name: 'styleguide',
    component: () => import('../views/StyleGuideView.vue'),
    meta: { title: 'Guía de estilos' },
  })
}

// Espera (como mucho `timeout` ms) a que exista el elemento del hash, ej. '#contacto'
function waitForElement(hash, timeout = 2000) {
  const id = decodeURIComponent(hash.slice(1))
  const start = performance.now()
  return new Promise((resolve) => {
    const check = () => {
      const el = document.getElementById(id)
      if (el || performance.now() - start > timeout) resolve(el)
      else requestAnimationFrame(check)
    }
    check()
  })
}

/*
 * Espera a que se cambie la página: mientras la anterior se desvanece sigue en pantalla, y si se
 * moviera el scroll en ese momento se vería un salto (ej. el stack de Inicio mostrando su última
 * foto arriba). Detecta el cambio por el <main id="contenido"> nuevo (ver App.vue).
 */
function waitForPageSwap(timeout = 800) {
  const old = document.getElementById('contenido')
  const start = performance.now()
  return new Promise((resolve) => {
    const check = () => {
      const current = document.getElementById('contenido')
      if (!old || (current && current !== old) || performance.now() - start > timeout) resolve()
      else requestAnimationFrame(check)
    }
    check()
  })
}

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // Misma página (ej. solo cambia el filtro de categoría): no hay cambio de página que esperar
    const samePage = to.path === from.path
    if (savedPosition) return samePage ? savedPosition : waitForPageSwap().then(() => savedPosition)
    if (to.hash) {
      // Ir a una sección (ej. contacto): se salta directo, sin recorrer la página, apenas la
      // sección existe. Desde otra página, la nueva entra recién cuando termina el fundido de
      // salida de la anterior; en la misma página ya está y el salto es inmediato
      return waitForElement(to.hash).then((el) => {
        if (el) {
          jumpToSection(el)
          // Un cuadro después, por si al montarse algo cambió de alto
          requestAnimationFrame(() => scrollToElement(el, { immediate: true }))
        }
        return false
      })
    }
    if (samePage) scrollToTopNow()
    else return waitForPageSwap().then(() => (scrollToTopNow(), false))
    return false
  },
})

router.afterEach((to) => {
  // Todo en minúsculas y con el "*" del logo entre partes (el detalle pone el suyo, ver ProjectDetailView)
  const base = 'jorge de maría * fotografía de arquitectura'
  document.title = to.meta.title ? `${to.meta.title} * jorge de maría`.toLowerCase() : base
})

export default router
