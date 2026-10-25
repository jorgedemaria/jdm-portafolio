<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import CardPhoto from './CardPhoto.vue'
import { preloadPhoto, whenPhotoReady } from '../composables/useScrollReveal'
import { useReducedMotion } from '../composables/useReducedMotion'
import { menuOpen, navContentBottom } from '../composables/useMenu'
import { useScrambleText, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'
import { usePagingStops } from '../composables/usePaging'

/*
 * "últimos registros": los 3 más recientes en una fila.
 * Cada uno entra como en Registros: la foto se descubre como persiana que baja y el nombre se
 * escribe con letras al azar. Desde 1024 px la sección mide una pantalla y, al terminar de llegar,
 * entran de izquierda a derecha; en pantallas más chicas van uno debajo del otro y cada uno entra
 * al asomar. Al salir de pantalla se reinician para repetirse.
 */
const props = defineProps({
  projects: { type: Array, required: true },
})

const root = ref(null)
const reducedMotion = useReducedMotion()

const wide = ref(false)
let wideQuery
const updateWide = () => (wide.value = wideQuery.matches)
onMounted(() => {
  wideQuery = window.matchMedia('(width >= 64rem)')
  updateWide()
  wideQuery.addEventListener('change', updateWide)
})

onBeforeUnmount(() => wideQuery?.removeEventListener('change', updateWide))

const animated = computed(() => wide.value && !reducedMotion.value)

/*
 * entered: el proyecto entró (su nombre se escribe y su foto se abre en cuanto carga). En
 * escritorio, cuando la fila de proyectos está a la vista (60 %, venga del stack o desde contacto),
 * uno tras otro con ENTER_STAGGER; en pantallas chicas, cada tarjeta al asomar
 */
const ENTER_STAGGER = 250
const itemEls = []
const entered = ref(props.projects.map(() => reducedMotion.value))
const photoShown = ref(props.projects.map(() => reducedMotion.value))
let enterTimers = []
function setAllEntered(on) {
  enterTimers.forEach(clearTimeout)
  enterTimers = props.projects.map((_, i) =>
    setTimeout(() => (entered.value[i] = on), on ? i * ENTER_STAGGER : 0),
  )
}
watch(
  entered,
  (list) =>
    list.forEach((on, i) => {
      if (!on) photoShown.value[i] = false
      else if (!photoShown.value[i]) whenPhotoReady(itemEls[i], () => entered.value[i] && (photoShown.value[i] = true))
    }),
  { deep: true },
)
let sectionObserver
let cardObserver
onMounted(() => {
  if (reducedMotion.value) return
  sectionObserver = new IntersectionObserver(([entry]) => {
    if (!wide.value) return
    if (entry.intersectionRatio >= 0.6) !entered.value[0] && setAllEntered(true)
    else if (!entry.isIntersecting) setAllEntered(false)
  }, { threshold: [0, 0.6] })
  sectionObserver.observe(listRef.value.firstElementChild)
  cardObserver = new IntersectionObserver((entries) => {
    if (wide.value) return
    entries.forEach((entry) => {
      const i = itemEls.indexOf(entry.target)
      if (entry.intersectionRatio >= 0.3) entered.value[i] = true
      else if (!entry.isIntersecting) entered.value[i] = false
    })
  }, { threshold: [0, 0.3] })
  itemEls.forEach((el) => el && cardObserver.observe(el))
})
onBeforeUnmount(() => {
  sectionObserver?.disconnect()
  cardObserver?.disconnect()
  enterTimers.forEach(clearTimeout)
})

/*
 * Paso por gestos (ver usePaging): desde la última foto del stack, un gesto trae la sección; desde
 * ahí el scroll sigue libre. En escritorio, la sección arriba; en tablet y teléfono, la primera
 * tarjeta arriba, bajo el navbar (MENU_GAP)
 */
usePagingStops(() => {
  if (!root.value || reducedMotion.value) return null
  const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cabecera-chica')) || 0
  const target = animated.value ? root.value : itemEls[0]
  if (!target) return null
  const y = target.getBoundingClientRect().top + window.scrollY - (animated.value ? 0 : nav + MENU_GAP)
  return { stops: [y], end: y }
})


/*
 * Los proyectos nunca quedan debajo del navbar (logo, menú abierto o título de sección):
 * si hace falta bajan lo justo para quedar MENU_GAP px debajo, con la misma curva que la persiana.
 */
const MENU_GAP = 24
const menuPush = ref(0)
const listRef = ref(null)
function updatePush() {
  const el = listRef.value
  if (!el) return
  // Posición de los proyectos sin el corrimiento que tienen en este momento (puede estar
  // a mitad de la transición, por eso se lee el valor real y no el de destino)
  const current = new DOMMatrix(getComputedStyle(el.parentElement).transform).m42 || 0
  const naturalTop = el.getBoundingClientRect().top - current
  // Solo cuando los proyectos están en pantalla, debajo del navbar. Si la sección está
  // saliendo o entrando por arriba no se corre nada (evita empujarlos fuera de lugar).
  const inView = naturalTop >= 0 && naturalTop < window.innerHeight
  menuPush.value = inView ? Math.max(0, navContentBottom.value + MENU_GAP - naturalTop) : 0
}
watch(navContentBottom, updatePush)
let pushFrame = 0
const schedulePush = () => {
  if (!pushFrame) pushFrame = requestAnimationFrame(() => ((pushFrame = 0), updatePush()))
}
onMounted(() => window.addEventListener('scroll', schedulePush, { passive: true }))
// Las fotos parten tapadas por la persiana: se cargan antes de llegar (ver preloadPhoto)
onMounted(() => preloadPhoto(listRef.value))
onBeforeUnmount(() => {
  window.removeEventListener('scroll', schedulePush)
  cancelAnimationFrame(pushFrame)
})

// Nombres de los proyectos: se escriben desde vacío con letras al azar al entrar (ver entered)
const cardTitleItems = props.projects.map((project, i) =>
  useScrambleText(
    computed(() => (entered.value[i] ? project.titulo : ' '.repeat(project.titulo.length))),
    { stagger: 35, scramble: 400, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER },
  ),
)
const cardTitles = computed(() => cardTitleItems.map((t) => t.value))

// "ver todo": bloque verde como "Desliza"; cada 5 s guiña (se vuelve carita feliz y regresa).
// Con el cursor encima (o el foco del teclado) no guiña y el bloque crece para mostrar la flecha ↗
const SEE_ALL = 'ver todo'
const seeAllHover = ref(false)
const SMILEY = ':)'
const WINK_EVERY = 7000
const WINK_HOLD = 1400
const seeAllWink = ref(false)
const seeAllTarget = computed(() => (seeAllWink.value ? SMILEY : SEE_ALL))
const seeAllText = useScrambleText(seeAllTarget, {
  stagger: 30,
  scramble: 240,
  tick: 45,
  charset: SCRAMBLE_CHARSET_LOWER,
})
watch(seeAllHover, (hover) => {
  if (!hover) return
  clearTimeout(winkBack)
  seeAllWink.value = false
})
let winkTimer
let winkBack
onMounted(() => {
  if (reducedMotion.value) return
  winkTimer = setInterval(() => {
    if (seeAllHover.value) return
    seeAllWink.value = true
    winkBack = setTimeout(() => (seeAllWink.value = false), WINK_HOLD)
  }, WINK_EVERY)
})
onBeforeUnmount(() => {
  clearInterval(winkTimer)
  clearTimeout(winkBack)
})

// Tarjeta con el cursor encima (su foto no cambia mientras tanto)
const hoveredCard = ref(null)

const projectLink = (project) => ({ name: 'project', params: { slug: project.slug } })
const categoryLink = (project) => ({ name: 'projects', query: { categoria: project.categoria.slug } })

</script>

<template>
  <section ref="root" aria-labelledby="ultimos-registros" class="relative text-primario">
    <!-- En escritorio mide una pantalla; el contenido empieza siempre debajo del navbar (no se centra, así no queda tapado en pantallas bajas) -->
    <div class="px-2 pt-28 pb-28 lg:flex lg:h-lvh lg:flex-col lg:pt-32 lg:pb-16">
      <div
        :class="[
          'page w-full transition-transform lg:flex lg:min-h-0 lg:flex-1 lg:flex-col',
          // Mismo ritmo que el título de sección del navbar, para no alcanzarlo
          menuOpen
            ? 'delay-0 duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]'
            : 'delay-300 duration-500 ease-(--ease-persiana)',
        ]"
        :style="menuPush ? { transform: `translateY(${menuPush}px)` } : null"
      >
        <!-- Título solo para lectores de pantalla -->
        <h2 id="ultimos-registros" class="sr-only">Últimos registros</h2>

        <!--
          Los 3 registros en una fila sobre la retícula de tercios (las mismas líneas del stack
          que se acaba de ver): cada uno empieza en una línea de tercio. Fotos verticales (3:4)
          del ancho del tercio menos el aire (2,5rem, como en Registros), sin pasar del alto
          disponible en la pantalla.
        -->
        <div ref="listRef" class="mt-10 lg:flex lg:flex-1 lg:items-center">
          <ul class="grid w-full gap-16 lg:grid-cols-3 lg:gap-0">
            <li
              v-for="(project, i) in projects"
              :key="project.slug"
              :ref="(el) => (itemEls[i] = el)"
              class="lg:w-[min(calc(100%-2.5rem),calc(56svh*0.75))]"
            >
              <!-- Como las tarjetas de Registros: foto, nombre y datos en una línea, sin cajas -->
              <article @pointerenter="hoveredCard = project.slug" @pointerleave="hoveredCard = null">
                <!-- La foto repite el enlace del nombre; se oculta a lectores de pantalla y al teclado -->
                <!-- La foto entra como persiana que baja, como en Registros (ver entered) -->
                <RouterLink
                  :to="projectLink(project)"
                  :class="[
                    'block transition-[clip-path] duration-1000 ease-(--ease-persiana)',
                    photoShown[i] ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]',
                  ]"
                  tabindex="-1"
                  aria-hidden="true"
                >
                  <!-- La foto cambia sola cada cierto tiempo, salvo con el cursor encima -->
                  <CardPhoto
                    :project="project"
                    :paused="hoveredCard === project.slug"
                    ratio="3 / 4"
                    sizes="(min-width: 1024px) 28vw, 100vw"
                  />
                </RouterLink>
                <h3
                  class="mt-3 font-display text-cuerpo leading-snug text-balance text-texto"
                >
                  <RouterLink
                    :to="projectLink(project)"
                    :aria-label="project.titulo"
                    class="py-0.5 whitespace-pre-wrap decoration-acento decoration-2 underline-offset-4 hover:underline"
                  >
                    <span aria-hidden="true">{{ cardTitles[i] }}</span>
                  </RouterLink>
                </h3>
                <p class="mt-1 text-cuerpo-sm text-primario">
                  <RouterLink
                    :to="categoryLink(project)"
                    class="pb-2.5 lowercase decoration-acento decoration-2 underline-offset-4 hover:underline"
                    >{{ project.categoria.nombre }}</RouterLink
                  >
                  · {{ project.año }} · {{ project.lugar }}
                </p>
              </article>
            </li>
          </ul>
        </div>

        <!-- Abajo a la derecha: lleva a todos los registros. Entra junto con el último -->
        <div class="mt-12 flex justify-end lg:mt-8">
          <RouterLink
            :to="{ name: 'projects' }"
            :class="[
              'group/all -my-[7px] flex items-center gap-1.5 py-[7px] text-boton whitespace-pre text-primario decoration-acento decoration-2 underline-offset-4 transition-[clip-path] duration-1000 ease-(--ease-persiana) hover:underline',
              entered[projects.length - 1] ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]',
            ]"
            aria-label="ver todos los registros"
            @pointerenter="seeAllHover = true"
            @pointerleave="seeAllHover = false"
            @focus="seeAllHover = true"
            @blur="seeAllHover = false"
          >
            <span aria-hidden="true">{{ seeAllText }}</span>
            <svg class="size-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M3 9 9 3M4 3h5v5" />
            </svg>
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

