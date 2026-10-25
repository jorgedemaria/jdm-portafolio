<script setup>
import { ref, computed, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import ResponsiveImage from '../components/ResponsiveImage.vue'
import PhotoLightbox from '../components/PhotoLightbox.vue'
import NotFoundView from './NotFoundView.vue'
import { findProject } from '../data/content'
import { useScrollReveal, whenPhotoReady } from '../composables/useScrollReveal'
import { useScrambleText, SCRAMBLE_CHARSET_LOWER } from '../composables/useScrambleText'
import { usePagingStops } from '../composables/usePaging'
import { useScrollProgress, stableViewportHeight } from '../composables/useScrollProgress'

const props = defineProps({
  slug: { type: String, required: true },
})

const project = computed(() => findProject(props.slug))

watchEffect(() => {
  document.title = (project.value ? `${project.value.titulo} * jorge de maría` : 'página no encontrada * jorge de maría').toLowerCase()
})

// Ficha bajo la primera foto: los datos, sin etiquetas, después de la categoría
const facts = computed(() => [
  String(project.value.año),
  project.value.lugar,
  project.value.arquitecto,
  ...Object.values(project.value.ficha ?? {}),
])

const firstPhoto = computed(() => project.value?.fotos[0])

// Entrada: la primera foto se abre como persiana que baja apenas carga (como la galería) y el
// nombre se escribe con letras al azar
const heroEl = ref(null)
const heroShown = ref(false)
// El nombre espera a que la persiana termine de abrir la foto (duration-1000 del marco)
const heroTitleShown = ref(false)
let heroTitleTimer = 0
onMounted(() => {
  if (!heroEl.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return (heroShown.value = heroTitleShown.value = true)
  whenPhotoReady(heroEl.value, () => {
    heroShown.value = true
    heroTitleTimer = setTimeout(() => (heroTitleShown.value = true), 1000)
  })
})
onBeforeUnmount(() => clearTimeout(heroTitleTimer))
/*
 * Paso por gestos (ver usePaging), como el stack: un gesto lleva de la foto de entrada al comienzo
 * de la galería (bajo el navbar, con el mismo aire que la ficha) y otro la trae de vuelta; desde la
 * galería hacia abajo el scroll es libre
 */
const galleryEl = ref(null)
usePagingStops(() => {
  if (!galleryEl.value) return null
  const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cabecera')) || 0
  const y = Math.max(0, galleryEl.value.getBoundingClientRect().top + window.scrollY - nav - 24)
  return { stops: [0, y], end: y }
})

/*
 * Cuando el nombre grande de la foto de entrada sale de pantalla (queda bajo el navbar), el nombre
 * se escribe arriba de la ficha (desde 768 px, fija al bajar); al volver a la foto se borra
 */
const heroTitleEl = ref(null)
const heroGone = ref(false)
let heroObserver
onMounted(() => {
  if (!heroTitleEl.value) return
  const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cabecera')) || 0
  heroObserver = new IntersectionObserver(
    ([entry]) => (heroGone.value = !entry.isIntersecting && entry.boundingClientRect.top < nav),
    { rootMargin: `-${nav}px 0px 0px 0px` },
  )
  heroObserver.observe(heroTitleEl.value)
})
onBeforeUnmount(() => heroObserver?.disconnect())
const fichaTitle = useScrambleText(
  computed(() => {
    const titulo = project.value?.titulo ?? ''
    return heroGone.value ? titulo : ' '.repeat(titulo.length)
  }),
  { stagger: 35, scramble: 400, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER },
)
const heroTitle = useScrambleText(
  computed(() => {
    const titulo = project.value?.titulo ?? ''
    return heroTitleShown.value ? titulo : ' '.repeat(titulo.length)
  }),
  { stagger: 35, scramble: 400, tick: 50, keepUnchanged: false, charset: SCRAMBLE_CHARSET_LOWER },
)

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
  (viewport.value = { width: window.innerWidth, height: stableViewportHeight() })
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
// Título sobre el borde visible: el marco puede seguir bajo la barra del navegador (alto estable)
const titleStyle = computed(() => {
  const frame = heroFrame.value?.height ?? `${viewport.value.height}px`
  return viewport.value.height ? { bottom: `max(0px, calc(${frame} - 100dvh))` } : null
})
// Alto de la sección: pantalla + recorrido del achique. La parte fija mide una pantalla, pero
// la foto termina antes (en su alto real): un margen negativo sube la galería esa
// diferencia, para que empiece justo donde termina la foto
const heroStyle = computed(() => {
  if (!heroShrinks.value) return { height: '100lvh' }
  const vh = viewport.value.height
  const end = fullPhotoHeight.value
  return {
    height: `${reducedMotion.value ? vh : vh + (vh - end)}px`,
    marginBottom: `${end - vh}px`,
  }
})

// Resto de la galería: una columna en los 2 tercios de la derecha, cada foto completa en su proporción real
const gallery = computed(() => project.value?.fotos.slice(1) ?? [])
// Foto abierta a pantalla completa (índice en la galería) o null
const lightbox = ref(null)

// Las fotos de la galería se descubren como persiana que baja al aparecer, como en Registros
const reveal = useScrollReveal()
</script>

<template>
  <NotFoundView v-if="!project" />

  <article v-else class="pb-10">
    <!--
      Primera foto: ocupa toda la pantalla, desde arriba. Mientras se ve, el navbar va sin
      fondo encima de ella (data-nav-overlay, como el stack de Inicio).
    -->
    <div ref="heroRoot" class="relative w-full" :style="heroStyle" data-nav-overlay>
      <!-- Lo transparente de la parte fija deja pasar los clics a la galería que sube debajo -->
      <!-- Si se achica, del alto estable en px (ver stableViewportHeight) -->
      <div
        class="pointer-events-none sticky top-0 h-lvh w-full overflow-hidden"
        :style="heroShrinks ? { height: `${viewport.height}px` } : null"
      >
        <!-- Marco de la foto: pantalla completa, o achicándose anclado arriba (ver heroFrame) -->
        <!-- data-exit-shutter: al salir de la página se recoge entero, con el degradado del título -->
        <div
          ref="heroEl"
          :class="[
            'absolute inset-x-0 top-0 h-full transition-[clip-path] duration-1000 ease-(--ease-persiana)',
            heroShown ? '[clip-path:inset(0)]' : '[clip-path:inset(0_0_100%_0)]',
          ]"
          :style="heroFrame"
          data-exit-shutter
        >
          <ResponsiveImage v-bind="firstPhoto" fill loading="eager" sizes="100vw" />

          <!--
            El nombre del registro abajo sobre la foto, como título de película. Sube junto con el
            borde de la foto al achicarse
          -->
          <!-- Sobre el borde visible de la pantalla si el marco pasa por debajo de la barra del navegador -->
          <!-- Degradado oscuro suave detrás: el título crema se lee también sobre fotos claras -->
          <div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-[rgb(0_0_0/0.45)] from-35% to-transparent px-2 pt-24 pb-6" :style="titleStyle">
            <div
              class="page font-display text-[clamp(2.25rem,6vw,5rem)] leading-[0.9] tracking-[-0.03em] text-fondo md:grid md:grid-cols-3"
            >
              <!-- -ml: corrección óptica, el margen propio de la letra grande la corría a la derecha de la ficha -->
              <!-- Desde 768 px en el 3º tercio, sobre la ficha (ver abajo) -->
              <h1 ref="heroTitleEl" class="-ml-[0.035em] text-balance whitespace-pre-wrap md:col-start-3">
                <!--
                  El nombre real, invisible, fija el tamaño; encima se escribe con letras al azar (más
                  anchas en esta serif: así no salta a otra línea mientras se escribe)
                -->
                <span class="sr-only">{{ project.titulo }}</span
                ><span aria-hidden="true" class="relative block"
                  ><span class="invisible">{{ project.titulo }}</span
                  ><span class="absolute inset-0 overflow-hidden">{{ heroTitle }}</span></span
                >
              </h1>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!--
      Desde 768 px, la ficha en el 3º tercio (alineada con los enlaces del navbar), fija bajo el
      navbar al bajar, con la estética de las categorías; la galería en los dos primeros
    -->
    <div class="px-2">
      <div class="page mt-6 md:grid md:grid-cols-3 md:items-start lg:mt-10">
        <div class="md:sticky md:top-[calc(var(--cabecera,0px)+1.5rem)] md:col-start-3 md:row-start-1">
        <!-- El nombre, cuando la foto de entrada ya pasó (ver heroGone); reserva su lugar aunque esté vacío -->
        <p class="relative mb-4 hidden font-display text-h1 text-balance whitespace-pre-wrap text-texto md:block" aria-hidden="true">
          <span class="invisible">{{ project.titulo }}</span><span class="absolute inset-0 overflow-hidden">{{ fichaTitle }}</span>
        </p>
        <ul class="flex flex-wrap gap-x-6 text-boton text-primario md:flex-col">
          <li>
            <RouterLink
              :to="{ name: 'projects', query: { categoria: project.categoria.slug } }"
              class="block w-fit py-2.5 lowercase decoration-acento decoration-2 underline-offset-4 hover:underline md:py-1.5"
              >{{ project.categoria.nombre }}</RouterLink
            >
          </li>
          <li v-for="fact in facts" :key="fact" class="py-2.5 md:py-1.5">{{ fact }}</li>
        </ul>
        </div>
        <ul ref="galleryEl" class="mt-6 grid gap-y-16 md:col-span-2 md:col-start-1 md:row-start-1 md:mt-0 md:pr-6 lg:pr-10">
          <li v-for="(photo, i) in gallery" :key="photo.src">
            <!--
              En tablet todas ocupan los dos tercios; desde 1024 px las horizontales siguen en dos tercios
              y las verticales y cuadradas pasan a un solo tercio (el 1º, menos el aire de la columna). Verticales y cuadradas nunca más altas que lo que cabe bajo el fondo del
              navbar (--cabecera, con 1,5 rem arriba y abajo): se ven completas sin recorrerlas
            -->
            <div
              :ref="reveal"
              :class="['overflow-hidden', photo.width <= photo.height && 'lg:w-[calc(50%-2.5rem)]']"
              :style="
                photo.width <= photo.height
                  ? { maxWidth: `calc((100svh - var(--cabecera, 0px) - 3rem) * ${photo.width / photo.height})` }
                  : null
              "
            >
              <button
                type="button"
                class="block w-full cursor-zoom-in"
                :aria-label="`Ver foto ${i + 1} de ${gallery.length} a pantalla completa`"
                @click="lightbox = i"
              >
                <ResponsiveImage v-bind="photo" sizes="(min-width: 1440px) 900px, (min-width: 768px) 66vw, 100vw" />
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>


    <Transition
      enter-active-class="transition-[clip-path] duration-500 ease-(--ease-persiana)"
      leave-active-class="transition-[clip-path] duration-500 ease-(--ease-persiana)"
      enter-from-class="[clip-path:inset(100%_0_0_0)]"
      leave-to-class="[clip-path:inset(100%_0_0_0)]"
    >
      <PhotoLightbox v-if="lightbox !== null" :photos="gallery" :start="lightbox" @close="lightbox = null" />
    </Transition>
  </article>
</template>
