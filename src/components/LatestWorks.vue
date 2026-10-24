<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import CardPhoto from './CardPhoto.vue'
import { preloadPhoto } from '../composables/useScrollReveal'
import { useScrollProgress } from '../composables/useScrollProgress'
import { useReducedMotion } from '../composables/useReducedMotion'
import { menuOpen, navContentBottom } from '../composables/useMenu'
import { useScrambleText, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'

/*
 * "últimos registros": los 3 más recientes en una fila.
 * Desde 1024 px la sección se queda fija mientras se hace scroll (hijack) y los proyectos
 * aparecen uno tras otro de izquierda a derecha; al terminar hay una pausa y la página sigue.
 * En pantallas más chicas van uno debajo del otro, con scroll normal.
 */
const props = defineProps({
  projects: { type: Array, required: true },
})

// Parte del recorrido en la que aparecen los proyectos; el resto es pausa con los tres visibles
const REVEAL_SPAN = 0.75

const root = ref(null)
const progress = useScrollProgress(root)
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

const easeOut = (x) => 1 - Math.pow(1 - x, 3)
const clamp = (x) => Math.min(Math.max(x, 0), 1)

/*
 * 0 = oculto, 1 = visible. En escritorio cada proyecto ocupa un tramo del recorrido fijo de la
 * sección, en orden. En tablet y teléfono (sin sección fija) cada tarjeta se descubre según
 * su propia posición: empieza al asomar por abajo y termina al recorrer NARROW_TRAVEL de pantalla.
 */
const NARROW_TRAVEL = 0.45
const itemEls = []
const narrowReveal = ref(props.projects.map(() => 1))
function measureNarrow() {
  narrowFrame = 0
  if (wide.value || reducedMotion.value) return
  const vh = window.innerHeight
  narrowReveal.value = itemEls.map((el) =>
    el ? easeOut(clamp((vh - el.getBoundingClientRect().top) / (vh * NARROW_TRAVEL))) : 1,
  )
}
let narrowFrame = 0
const scheduleNarrow = () => {
  if (!narrowFrame) narrowFrame = requestAnimationFrame(measureNarrow)
}
onMounted(() => {
  window.addEventListener('scroll', scheduleNarrow, { passive: true })
  window.addEventListener('resize', scheduleNarrow)
  scheduleNarrow()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleNarrow)
  window.removeEventListener('resize', scheduleNarrow)
  cancelAnimationFrame(narrowFrame)
})
watch(wide, scheduleNarrow)

function reveal(index) {
  if (reducedMotion.value) return 1
  if (!wide.value) return narrowReveal.value[index] ?? 1
  const span = REVEAL_SPAN / props.projects.length
  return easeOut(clamp((progress.value - index * span) / span))
}

// Se descubre como persiana que baja, con un leve desplazamiento hacia abajo
function revealStyle(index) {
  const r = reveal(index)
  if (r === 1) return null
  return {
    clipPath: `inset(0 0 ${(1 - r) * 100}% 0)`,
    transform: `translateY(${(1 - r) * -32}px)`,
  }
}

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

/*
 * Títulos de los proyectos: se arman desde vacío con letras al azar (como el nombre de la
 * intro). En escritorio, cuando su proyecto aparece en el recorrido; en pantallas más chicas,
 * cuando el título entra en pantalla. Al ocultarse se reinician para repetirse.
 */
const cardTitleEls = []
const cardTitleVisible = ref(props.projects.map(() => false))
const cardTitleItems = props.projects.map((project, i) =>
  useScrambleText(
    computed(() => {
      const shown = animated.value ? reveal(i) > 0.5 : cardTitleVisible.value[i]
      return shown ? project.titulo : ' '.repeat(project.titulo.length)
    }),
    { stagger: 35, scramble: 400, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER },
  ),
)
const cardTitles = computed(() => cardTitleItems.map((t) => t.value))
let cardObserver
onMounted(() => {
  cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const i = cardTitleEls.indexOf(entry.target)
      if (i === -1) return
      if (entry.intersectionRatio >= 0.8) cardTitleVisible.value[i] = true
      else if (!entry.isIntersecting) cardTitleVisible.value[i] = false
    })
  }, { threshold: [0, 0.8] })
  cardTitleEls.forEach((el) => el && cardObserver.observe(el))
})
onBeforeUnmount(() => cardObserver?.disconnect())

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
  <section ref="root" aria-labelledby="ultimos-registros" class="relative text-primario lg:h-[260lvh]">
    <!-- Fija en escritorio; el contenido empieza siempre debajo del navbar (no se centra, así no queda tapado en pantallas bajas) -->
    <div class="px-2 pt-28 pb-28 lg:sticky lg:top-0 lg:flex lg:h-lvh lg:flex-col lg:pt-32 lg:pb-16">
      <div
        :class="[
          'page w-full transition-transform lg:flex lg:min-h-0 lg:flex-1 lg:flex-col',
          // Mismo ritmo que el título de sección del navbar, para no alcanzarlo
          menuOpen
            ? 'delay-0 duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]'
            : 'delay-300 duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]',
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
              class="will-change-[clip-path,transform] lg:w-[min(calc(100%-2.5rem),calc(56svh*0.75))]"
              :style="revealStyle(i)"
            >
              <!-- Como las tarjetas de Registros: foto, nombre y datos en una línea, sin cajas -->
              <article @pointerenter="hoveredCard = project.slug" @pointerleave="hoveredCard = null">
                <!-- La foto repite el enlace del nombre; se oculta a lectores de pantalla y al teclado -->
                <RouterLink :to="projectLink(project)" class="block" tabindex="-1" aria-hidden="true">
                  <!-- La foto cambia sola cada cierto tiempo, salvo con el cursor encima -->
                  <CardPhoto
                    :project="project"
                    :paused="hoveredCard === project.slug"
                    ratio="3 / 4"
                    sizes="(min-width: 1024px) 28vw, 100vw"
                  />
                </RouterLink>
                <h3
                  :ref="(el) => (cardTitleEls[i] = el)"
                  class="mt-3 font-display text-cuerpo leading-snug text-balance text-texto"
                >
                  <RouterLink
                    :to="projectLink(project)"
                    :aria-label="project.titulo"
                    class="whitespace-pre-wrap decoration-acento decoration-2 underline-offset-4 hover:underline"
                  >
                    <span aria-hidden="true">{{ cardTitles[i] }}</span>
                  </RouterLink>
                </h3>
                <p class="mt-1 text-cuerpo-sm text-primario">
                  <RouterLink
                    :to="categoryLink(project)"
                    class="lowercase decoration-acento decoration-2 underline-offset-4 hover:underline"
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
            class="group/all flex items-center gap-1.5 text-boton whitespace-pre text-primario decoration-acento decoration-2 underline-offset-4 hover:underline"
            :style="revealStyle(projects.length - 1)"
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

