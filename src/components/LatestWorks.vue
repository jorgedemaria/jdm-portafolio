<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import CardPhoto from './CardPhoto.vue'
import { useScrollProgress } from '../composables/useScrollProgress'
import { useReducedMotion } from '../composables/useReducedMotion'
import { menuOpen, navContentBottom } from '../composables/useMenu'
import { useNavSectionTitle } from '../composables/useNavSectionTitle'
import { useScrambleText, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'

/*
 * "últimos trabajos": los 3 proyectos más recientes en una fila.
 * Desde 1024 px la sección se queda fija mientras se hace scroll (hijack) y los proyectos
 * aparecen uno tras otro de izquierda a derecha; al terminar hay una pausa y la página sigue.
 * En pantallas más chicas van uno debajo del otro, con scroll normal.
 */
const props = defineProps({
  projects: { type: Array, required: true },
})

// Parte del recorrido en la que aparecen los proyectos; el resto es pausa con los tres visibles
const REVEAL_SPAN = 0.75
// Inercia: tiempo (ms) que tarda la animación en alcanzar la posición del scroll
const SMOOTHING = 140

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

// El avance sigue al scroll con inercia, igual que el stack de fotos
const smooth = ref(0)
let frame = 0
let lastTime = 0
function follow(now) {
  const diff = progress.value - smooth.value
  if (Math.abs(diff) < 0.0002) {
    smooth.value = progress.value
    frame = 0
    return
  }
  smooth.value += diff * (1 - Math.exp(-(now - lastTime) / SMOOTHING))
  lastTime = now
  frame = requestAnimationFrame(follow)
}
watch(progress, () => {
  if (reducedMotion.value) {
    smooth.value = progress.value
    return
  }
  if (!frame) {
    lastTime = performance.now()
    frame = requestAnimationFrame(follow)
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  wideQuery?.removeEventListener('change', updateWide)
})

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
  return easeOut(clamp((smooth.value - index * span) / span))
}

// Se descubre con un barrido de izquierda a derecha y un leve desplazamiento
function revealStyle(index) {
  const r = reveal(index)
  if (r === 1) return null
  return {
    clipPath: `inset(0 ${(1 - r) * 100}% 0 0)`,
    transform: `translateX(${(1 - r) * -32}px)`,
  }
}

/*
 * Los proyectos nunca quedan debajo del navbar (logo, menú abierto o título de sección):
 * si hace falta bajan lo justo para quedar MENU_GAP px debajo, con la misma curva que la persiana.
 */
const MENU_GAP = 24
const titleRef = ref(null)
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
onBeforeUnmount(() => {
  window.removeEventListener('scroll', schedulePush)
  cancelAnimationFrame(pushFrame)
})

/*
 * Título: se arma desde vacío con letras al azar, de izquierda a derecha (como el nombre
 * de la intro), cada vez que la sección entra en pantalla.
 */
const TITLE = 'últimos trabajos'
const titleShown = ref(false)
const titleText = useScrambleText(
  computed(() => (titleShown.value ? TITLE : ' '.repeat(TITLE.length))),
  { stagger: 45, scramble: 450, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER },
)
let titleObserver
onMounted(() => {
  titleObserver = new IntersectionObserver(([entry]) => {
    // Entra cuando se ve casi completo; se reinicia al salir del todo, para repetirse
    if (entry.intersectionRatio >= 0.8) titleShown.value = true
    else if (!entry.isIntersecting) titleShown.value = false
  }, { threshold: [0, 0.8] })
  if (titleRef.value) titleObserver.observe(titleRef.value)
})
onBeforeUnmount(() => titleObserver?.disconnect())

// Mientras la sección está bajo el navbar, su título se muestra debajo del logo
useNavSectionTitle(root, TITLE)

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
// El bloque se achica o agranda suave al ancho del texto final (medido en una copia invisible)
const seeAllMeasure = ref(null)
const seeAllWidth = ref(null)
const measureSeeAll = () => (seeAllWidth.value = seeAllMeasure.value?.offsetWidth ?? null)
watch([seeAllTarget, seeAllHover], () => nextTick(measureSeeAll))
watch(seeAllHover, (hover) => {
  if (!hover) return
  clearTimeout(winkBack)
  seeAllWink.value = false
})
let winkTimer
let winkBack
onMounted(() => {
  document.fonts?.ready.then(measureSeeAll)
  window.addEventListener('resize', measureSeeAll)
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
  window.removeEventListener('resize', measureSeeAll)
})

// Tarjeta con el cursor encima (su foto no cambia mientras tanto)
const hoveredCard = ref(null)

const projectLink = (project) => ({ name: 'project', params: { slug: project.slug } })
const categoryLink = (project) => ({ name: 'projects', query: { categoria: project.categoria.slug } })

// Datos de la grilla de cada proyecto (misma estructura que el menú: filas separadas por líneas)
const facts = (project) => [
  ['año', String(project.año)],
  ['lugar', project.lugar],
  ['arquitectura', project.arquitecto],
]
</script>

<template>
  <section ref="root" aria-labelledby="ultimos-trabajos" class="relative text-primario lg:h-[260svh]">
    <!-- Fija en escritorio; el contenido empieza siempre debajo del navbar (no se centra, así no queda tapado en pantallas bajas) -->
    <div class="px-2 pt-28 pb-28 lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:pt-32 lg:pb-16">
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
        <!-- El texto animado se oculta a lectores de pantalla; leen el título completo -->
        <h2
          id="ultimos-trabajos"
          ref="titleRef"
          :aria-label="TITLE"
          class="font-display text-h2 whitespace-pre text-texto md:sr-only"
        >
          <span aria-hidden="true">{{ titleText }}</span>
        </h2>

        <!--
          Los 3 proyectos en una fila, centrada en el espacio bajo el título. Fotos verticales
          (3:4) cuyo ancho se ajusta a la altura de la pantalla; el primero alineado con el
          logo, el último con el botón del menú y separación mínima de 4rem entre ellos.
        -->
        <div ref="listRef" class="mt-10 lg:flex lg:flex-1 lg:items-center">
          <ul class="grid w-full gap-16 lg:flex lg:justify-between lg:gap-16">
            <li
              v-for="(project, i) in projects"
              :key="project.slug"
              :ref="(el) => (itemEls[i] = el)"
              class="will-change-[clip-path,transform] lg:w-[min(calc((100%_-_8rem)/3),calc(56svh*0.75))] lg:shrink-0"
              :style="revealStyle(i)"
            >
              <article>
                <!-- Etiqueta de categoría, del ancho de la tarjeta y pegada a la foto: lleva a Proyectos filtrado por esa categoría (no abre la grilla) -->
                <RouterLink
                  :to="categoryLink(project)"
                  class="flex h-7 items-center border border-b-0 border-primario px-3 text-cuerpo-sm lowercase transition-colors duration-200 hover:bg-primario hover:text-fondo"
                >
                  {{ project.categoria.nombre }}
                </RouterLink>
                <!-- Foto, título y grilla: pasar el cursor por aquí abre la grilla -->
                <div
                  class="group/card relative"
                  @pointerenter="hoveredCard = project.slug"
                  @pointerleave="hoveredCard = null"
                >
                <!-- Tarjeta con borde (foto y grilla), unida a la etiqueta de arriba; el título va afuera -->
                <div class="relative border border-primario">
                <!-- La foto repite el enlace de "ver proyecto"; se oculta a lectores de pantalla y al teclado -->
                <RouterLink :to="projectLink(project)" class="block" tabindex="-1" aria-hidden="true">
                  <!-- La foto cambia sola cada cierto tiempo, salvo con el cursor encima -->
                  <CardPhoto
                    :project="project"
                    :paused="hoveredCard === project.slug"
                    ratio="3 / 4"
                    sizes="(min-width: 1024px) 28vw, 100vw"
                  />
                </RouterLink>
                <!--
                  Grilla tipo menú, del alto de su contenido. En pantallas con cursor se apoya en el borde
                  inferior de la foto y sube como persiana desde abajo al pasar el cursor por el
                  proyecto (o al llegar con el teclado). En pantallas táctiles va debajo de la foto,
                  dentro del borde, y se ve siempre.
                -->
                <div
                  class="[@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:absolute [@media(hover:hover)]:inset-0 [@media(hover:hover)]:flex [@media(hover:hover)]:flex-col [@media(hover:hover)]:justify-end"
                >
                <div
                  class="pointer-events-auto flex flex-col border-t border-primario bg-fondo text-cuerpo-sm transition-[clip-path] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)] group-focus-within/card:[clip-path:inset(0)] group-hover/card:[clip-path:inset(0)] [@media(hover:hover)]:[clip-path:inset(100%_0_0_0)]"
                >
                  <dl class="divide-y divide-primario">
                    <div
                      v-for="[label, value] in facts(project)"
                      :key="label"
                      class="flex items-baseline justify-between gap-4 px-3 py-2.5"
                    >
                      <dt class="text-texto/65">{{ label }}</dt>
                      <dd class="text-right text-texto">{{ value }}</dd>
                    </div>
                  </dl>
                  <RouterLink
                    :to="projectLink(project)"
                    class="group/link flex items-center justify-end border-t border-primario bg-primario px-3 py-2.5 text-fondo focus-visible:-outline-offset-4 focus-visible:outline-fondo"
                  >
                    ver proyecto
                    <span class="sr-only">: {{ project.titulo }}</span>
                    <!-- Al pasar el cursor (o con el foco) aparece la flecha ↗, como en "ver todo" -->
                    <span
                      class="grid w-0 overflow-hidden transition-[width,margin] duration-300 ease-[cubic-bezier(0.6,0,0.3,1)] group-hover/link:ml-1.5 group-hover/link:w-3 group-focus-visible/link:ml-1.5 group-focus-visible/link:w-3"
                      aria-hidden="true"
                    >
                      <svg class="size-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M3 9 9 3M4 3h5v5" />
                      </svg>
                    </span>
                  </RouterLink>
                </div>
                </div>
                </div>
                <h3
                  :ref="(el) => (cardTitleEls[i] = el)"
                  class="mt-3 font-display text-cuerpo leading-snug font-semibold text-texto"
                >
                  <RouterLink
                    :to="projectLink(project)"
                    :aria-label="project.titulo"
                    class="whitespace-pre-wrap decoration-1 underline-offset-4 hover:underline"
                  >
                    <span aria-hidden="true">{{ cardTitles[i] }}</span>
                  </RouterLink>
                </h3>
                </div>
              </article>
            </li>
          </ul>
        </div>

        <!-- Abajo a la derecha: lleva a todos los proyectos. Entra junto con el último proyecto -->
        <div class="relative mt-12 flex justify-end lg:mt-8">
          <RouterLink
            :to="{ name: 'projects' }"
            class="see-all block overflow-hidden bg-primario px-1.5 py-0.5 text-cuerpo whitespace-pre text-fondo"
            :style="{ ...revealStyle(projects.length - 1), width: seeAllWidth ? `${seeAllWidth}px` : null }"
            aria-label="ver todos los proyectos"
            @pointerenter="seeAllHover = true"
            @pointerleave="seeAllHover = false"
            @focus="seeAllHover = true"
            @blur="seeAllHover = false"
          >
            <!-- La flecha está siempre a la derecha del texto; el ancho del bloque la deja fuera hasta el hover -->
            <span class="flex w-max items-center gap-1.5" aria-hidden="true">
              <span>{{ seeAllText }}</span>
              <svg class="size-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M3 9 9 3M4 3h5v5" />
              </svg>
            </span>
          </RouterLink>
          <!-- Copia invisible con el contenido final, para medir el ancho del bloque -->
          <span
            ref="seeAllMeasure"
            class="invisible absolute flex items-center gap-1.5 px-1.5 text-cuerpo whitespace-pre"
            aria-hidden="true"
          >
            <span>{{ seeAllTarget }}</span>
            <span v-if="seeAllHover" class="size-3 shrink-0" />
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.see-all {
  transition: width 350ms cubic-bezier(0.6, 0, 0.3, 1);
}
@media (prefers-reduced-motion: reduce) {
  .see-all {
    transition: none;
  }
}
</style>
