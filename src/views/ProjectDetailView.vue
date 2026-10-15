<script setup>
import { ref, computed, watch, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import ResponsiveImage from '../components/ResponsiveImage.vue'
import NotFoundView from './NotFoundView.vue'
import { findProject } from '../data/content'
import { useNavSectionTitle } from '../composables/useNavSectionTitle'
import { navTitleAction, menuOpen, menuBottom } from '../composables/useMenu'
import { useScrollReveal } from '../composables/useScrollReveal'
import { useScrollProgress } from '../composables/useScrollProgress'
import { introLeaving, NAV_DURATION } from '../composables/useIntro'
import { useScrambleText, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'
import { useRouter } from 'vue-router'

const props = defineProps({
  slug: { type: String, required: true },
})

const project = computed(() => findProject(props.slug))

// Desde 768 px el nombre del proyecto se muestra debajo del logo, con su animación
const root = ref(null)
useNavSectionTitle(root, () => project.value?.titulo ?? '')

// En móvil el título está fijo a 80 px (pt-20); con el menú abierto baja hasta MENU_GAP px
// debajo del menú, el mismo espacio que hay entre el logo y el menú
const TITLE_TOP = 80
const MENU_GAP = 24
const titlePush = computed(() =>
  menuOpen.value && menuBottom.value ? Math.max(0, menuBottom.value + MENU_GAP - TITLE_TOP) : 0,
)

watchEffect(() => {
  document.title = project.value
    ? `${project.value.titulo} — Jorge de María`
    : 'Página no encontrada — Jorge de María'
})

// Datos del proyecto, como la grilla de las tarjetas (filas separadas por líneas)
const facts = computed(() => [
  ['año', String(project.value.año)],
  ['lugar', project.value.lugar],
  ['arquitectura', project.value.arquitecto],
  ...Object.entries(project.value.ficha ?? {}).map(([label, value]) => [label.toLowerCase(), value]),
])

const firstPhoto = computed(() => project.value?.fotos[0])

/*
 * Primera foto: empieza ocupando toda la pantalla. Si así queda recortada por los costados
 * (foto más horizontal que la pantalla, ej. en teléfono o tablet), la sección se fija y, al
 * hacer scroll, el marco se achica (anclado arriba, el borde de abajo sube) hasta la proporción
 * real de la foto, que termina completa a todo el ancho. La galería empieza justo donde termina
 * la foto, sin un hueco. En computador casi nunca hace falta.
 */
// El achique dura lo mismo que la diferencia entre la pantalla y la foto: así el borde de abajo
// de la foto sube junto con el scroll y la galería lo sigue pegada, sin taparlo ni separarse
const heroRoot = ref(null)
const heroProgress = useScrollProgress(heroRoot)
const viewport = ref({ width: 0, height: 0 })
const reducedMotion = ref(false)
const measureViewport = () =>
  (viewport.value = { width: window.innerWidth, height: window.innerHeight })
onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  measureViewport()
  window.addEventListener('resize', measureViewport)
})
onBeforeUnmount(() => window.removeEventListener('resize', measureViewport))

// Alto con el que la foto se ve completa a todo el ancho
const fullPhotoHeight = computed(() => {
  const photo = firstPhoto.value
  return photo ? (viewport.value.width * photo.height) / photo.width : 0
})
const heroShrinks = computed(
  () => !!viewport.value.height && fullPhotoHeight.value < viewport.value.height * 0.97,
)
// Marco anclado arriba: de pantalla completa al alto real de la foto
const heroFrame = computed(() => {
  if (!heroShrinks.value) return null
  const full = viewport.value.height
  const t = reducedMotion.value ? 1 : heroProgress.value
  return { height: `${full + (fullPhotoHeight.value - full) * t}px` }
})
// Alto de la sección: pantalla + recorrido del achique. La parte fija mide una pantalla, pero
// la foto termina antes (en su alto real): un margen negativo sube la galería esa
// diferencia, para que empiece justo donde termina la foto
const heroStyle = computed(() => {
  if (!heroShrinks.value) return { height: '100svh' }
  const vh = viewport.value.height
  const end = fullPhotoHeight.value
  return {
    height: `${reducedMotion.value ? vh : vh + (vh - end)}px`,
    marginBottom: `${end - vh}px`,
  }
})

// Título en móvil (sobre la foto): se arma con letras al azar al aparecer, como en el navbar
const titleShown = ref(false)
const mobileTitle = useScrambleText(
  computed(() => {
    const title = project.value?.titulo ?? ''
    return titleShown.value ? title : ' '.repeat(title.length)
  }),
  { stagger: 35, scramble: 380, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER },
)

/*
 * Botón para volver a donde se llegó: últimos trabajos (Inicio), todos los proyectos o una
 * categoría. Vue Router guarda la página anterior en history.state.back; si se entró directo
 * a la dirección del proyecto, lleva a la lista de proyectos.
 */
const router = useRouter()
const backPath = ref(null)
const backLabel = computed(() => {
  const back = backPath.value
  if (!back) return 'ver proyectos'
  if (back === '/' || back.startsWith('/#')) return 'volver a últimos trabajos'
  const categoria = new URLSearchParams(back.split('?')[1] ?? '').get('categoria')
  if (back.startsWith('/proyectos?') && categoria) return `volver a ${categoria.replace(/-/g, ' ')}`
  if (back.startsWith('/proyectos')) return 'volver a proyectos'
  return 'volver'
})
function goBack() {
  if (backPath.value) router.back()
  else router.push({ name: 'projects' })
}

/*
 * Los datos suben como persiana desde abajo al llegar a la página (si está la intro, cuando
 * ya se armó el navbar) y se recogen hacia abajo apenas se hace scroll; vuelven arriba del todo.
 */
const FACTS_DELAY = 400
const SCROLL_HIDE = 24
const factsReady = ref(false)
const atTop = ref(true)
const factsShown = computed(() => factsReady.value && atTop.value)
let factsTimer = 0
const onFactsScroll = () => (atTop.value = window.scrollY < SCROLL_HIDE)
function revealFacts(delay) {
  factsTimer = setTimeout(() => {
    factsReady.value = true
    titleShown.value = true
  }, delay)
}
onMounted(() => {
  backPath.value = window.history.state?.back ?? null
  // El título del navbar ("← título") lleva de vuelta
  navTitleAction.value = { label: backLabel.value, run: goBack }
  onFactsScroll()
  window.addEventListener('scroll', onFactsScroll, { passive: true })
  if (introLeaving.value) revealFacts(FACTS_DELAY)
  else {
    const stop = watch(introLeaving, (leaving) => {
      if (!leaving) return
      stop()
      revealFacts(NAV_DURATION)
    })
  }
})
onBeforeUnmount(() => {
  navTitleAction.value = null
  clearTimeout(factsTimer)
  window.removeEventListener('scroll', onFactsScroll)
})

/*
 * Resto de la galería: las verticales seguidas se agrupan de a dos, lado a lado.
 * Cada foto se ve completa, sin recortes, y nunca más alta que la pantalla.
 */
const rows = computed(() => {
  if (!project.value) return []
  const result = []
  const photos = project.value.fotos.slice(1)
  const isPortrait = (p) => p && p.height > p.width
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const next = photos[i + 1]
    if (isPortrait(photo) && isPortrait(next)) {
      result.push({ type: 'pair', photos: [photo, next] })
      i++
    } else {
      result.push({ type: 'single', photos: [photo] })
    }
  }
  return result
})

// Las fotos de la galería se desenrollan con el scroll a medida que aparecen
const reveal = useScrollReveal()

// Ancho para que la foto quepa entera en la pantalla (deja aire para el navbar)
const fitWidth = (photo) => ({
  width: `min(100%, calc((100svh - 8rem) * ${photo.width / photo.height}))`,
})
</script>

<template>
  <NotFoundView v-if="!project" />

  <article v-else ref="root" class="pb-10">
    <!--
      Primera foto: ocupa toda la pantalla, desde arriba. Mientras se ve, el navbar va sin
      fondo encima de ella (data-nav-overlay, como el stack de Inicio).
    -->
    <div ref="heroRoot" class="relative w-full" :style="heroStyle" data-nav-overlay>
      <!-- Lo transparente de la parte fija deja pasar los clics a la galería que sube debajo -->
      <div class="pointer-events-none sticky top-0 h-svh w-full overflow-hidden">
        <!-- Marco de la foto: pantalla completa, o achicándose anclado arriba (ver heroFrame) -->
        <div class="absolute inset-x-0 top-0 h-full" :style="heroFrame">
          <ResponsiveImage v-bind="firstPhoto" fill loading="eager" sizes="100vw" />
        </div>

        <!-- Datos en la esquina inferior izquierda de la foto, alineados con el título -->
        <div class="absolute inset-x-0 bottom-0 px-2 pb-6">
          <div class="page">
            <!-- Persiana: sube desde abajo y se recoge al hacer scroll (oculta, no se puede enfocar) -->
            <dl
              :inert="!factsShown"
              :class="[
                'pointer-events-auto divide-y divide-primario border border-primario bg-fondo text-cuerpo-sm transition-[clip-path] duration-500 ease-[cubic-bezier(0.6,0,0.3,1)] motion-reduce:transition-none md:w-2/5',
                factsShown ? '[clip-path:inset(0)]' : '[clip-path:inset(100%_0_0_0)]',
              ]"
            >
              <div class="flex items-baseline justify-between gap-4 px-3 py-2.5">
                <dt class="text-texto/65">categoría</dt>
                <dd class="text-right">
                  <RouterLink
                    :to="{ name: 'projects', query: { categoria: project.categoria.slug } }"
                    class="lowercase text-texto decoration-1 underline-offset-4 hover:underline"
                  >
                    {{ project.categoria.nombre }}
                  </RouterLink>
                </dd>
              </div>
              <div
                v-for="[label, value] in facts"
                :key="label"
                class="flex items-baseline justify-between gap-4 px-3 py-2.5"
              >
                <dt class="text-texto/65">{{ label }}</dt>
                <dd class="text-right text-texto">{{ value }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>

    <h1 class="sr-only max-md:hidden">{{ project.titulo }}</h1>

    <div class="px-2">
      <div class="page">
        <div class="mt-6 flex flex-col gap-6 lg:mt-10 lg:gap-10">
          <template v-for="row in rows" :key="row.photos[0].src">
            <div v-if="row.type === 'pair'" class="grid gap-6 md:grid-cols-2 lg:gap-10">
              <div
                v-for="photo in row.photos"
                :key="photo.src"
                :ref="reveal"
                class="mx-auto overflow-hidden"
                :style="fitWidth(photo)"
              >
                <ResponsiveImage v-bind="photo" sizes="(min-width: 768px) 50vw, 100vw" />
              </div>
            </div>
            <div v-else :ref="reveal" class="mx-auto overflow-hidden" :style="fitWidth(row.photos[0])">
              <ResponsiveImage v-bind="row.photos[0]" sizes="(min-width: 1440px) 1320px, 100vw" />
            </div>
          </template>
        </div>
      </div>
    </div>

    <!--
      Título del proyecto con una flecha "←" antes que lleva de vuelta (solo la flecha es el
      botón). En móvil queda fijo debajo del logo; desde 768 px está en el navbar.
      Con el menú abierto baja hasta quedar debajo de él, con la misma curva que la persiana.
    -->
    <div class="pointer-events-none fixed inset-x-0 top-0 z-40 px-2 pt-20 md:hidden">
      <div
        class="page flex items-center gap-[0.25em] font-display text-h1 transition-transform duration-500 ease-[cubic-bezier(0.6,0,0.3,1)]"
        :style="titlePush ? { transform: `translateY(${titlePush}px)` } : null"
      >
        <!-- Solo la flecha es el botón para volver -->
        <button
          type="button"
          class="group/back pointer-events-auto -my-[0.15em] -ml-[0.15em] cursor-pointer p-[0.15em]"
          :aria-label="backLabel"
          @click="goBack"
        >
          <svg
            class="block size-[0.6em] transition-transform duration-300 ease-[cubic-bezier(0.6,0,0.3,1)] group-hover/back:-translate-x-1"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path d="M10.5 6H1.5M5 2.5 1.5 6 5 9.5" />
          </svg>
        </button>
        <h1 class="whitespace-pre-wrap text-balance">
          <span class="sr-only">{{ project.titulo }}</span><span aria-hidden="true">{{ mobileTitle }}</span>
        </h1>
      </div>
    </div>
  </article>
</template>
