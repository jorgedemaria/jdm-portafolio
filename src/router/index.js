import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: null } },
  {
    path: '/proyectos',
    name: 'projects',
    component: () => import('../views/ProjectsView.vue'),
    meta: { title: 'Proyectos' },
  },
  {
    path: '/proyectos/:slug',
    name: 'project',
    component: () => import('../views/ProjectDetailView.vue'),
    props: true,
    // El título de la pestaña lo pone la vista con el nombre del proyecto
    meta: { title: 'Proyecto' },
  },
  {
    path: '/sobre-mi',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
    meta: { title: 'Sobre mí' },
  },
  {
    path: '/contacto',
    name: 'contact',
    component: () => import('../views/ContactView.vue'),
    meta: { title: 'Contacto' },
  },
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

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash }
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const base = 'Jorge de María — Fotografía de arquitectura'
  document.title = to.meta.title ? `${to.meta.title} — Jorge de María` : base
})

export default router
