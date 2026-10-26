<script setup>
import { ref, onMounted } from 'vue'
import { paletas, aplicarPaleta, paletaGuardada } from '../composables/usePaleta'
import { tipografias, aplicarTipografia, tipografiaGuardada, cargarTipografias } from '../composables/useTipografia'
import ResponsiveImage from '../components/ResponsiveImage.vue'
import ProjectCard from '../components/ProjectCard.vue'
import { heroPhotos, projects, categories } from '../data/content'
import { site } from '../data/site'

const colors = [
  { name: 'fondo', class: 'bg-fondo border border-texto' },
  { name: 'primario', class: 'bg-primario' },
  { name: 'acento', class: 'bg-acento' },
  { name: 'texto', class: 'bg-texto' },
]

// Paleta en prueba: cambia todo el sitio y se recuerda al recorrerlo (ver usePaleta)
const activa = ref(paletaGuardada())
// Colores de una muestra; la publicada usa los de su par en la lista (grafito y lima)
const muestra = (p) => (p.colores ?? paletas.find((q) => q.nombre === 'grafito y lima').colores)
const hex = ref({})
function readColors() {
  const style = getComputedStyle(document.documentElement)
  hex.value = Object.fromEntries(colors.map((c) => [c.name, style.getPropertyValue(`--color-${c.name}`).trim()]))
}
function choose(nombre) {
  activa.value = aplicarPaleta(nombre)
  readColors()
}
onMounted(readColors)

// Propuestas de tipografía: cada muestra con sus propias fuentes; «usar en el sitio» la aplica a todo
const tipografiaActiva = ref(tipografiaGuardada())
onMounted(() => cargarTipografias())

const type = [
  { token: 'h1', class: 'font-display text-h1', sample: 'Nave de producción, planta norte' },
  { token: 'h3', class: 'font-display text-h3', sample: 'Nave de producción, planta norte' },
  { token: 'cuerpo', class: 'text-cuerpo', sample: 'Hormigón, acero y luz de la tarde.' },
  { token: 'cuerpo-sm', class: 'text-cuerpo-sm', sample: 'Hormigón, acero y luz de la tarde.' },
  { token: 'etiqueta', class: 'text-etiqueta', sample: 'Planta norte, 2025' },
  { token: 'logo', class: 'text-logo text-primario', sample: 'jorge de maría' },
]

// Propuestas para el detalle, con un registro real: misma retícula y mismas piezas que Registros
const muestraDetalle = projects.reduce((a, b) => (b.fotos.length > a.fotos.length ? b : a))
const datosDetalle = [muestraDetalle.categoria.nombre.toLowerCase(), String(muestraDetalle.año), muestraDetalle.lugar, muestraDetalle.arquitecto].filter(Boolean)
const fotosDetalle = muestraDetalle.fotos
const vertical = (foto) => foto.width <= foto.height
const nro = (i) => String(i + 1).padStart(2, '0')
const propuestasDetalle = [
  {
    id: 'lista',
    nombre: '1 · como Registros',
    nota: 'Sin foto a pantalla completa. El nombre en las columnas 1–2 y los datos debajo, en la 2ª (donde están las categorías); las fotos una bajo otra en las columnas 3–6, del ancho de la lista de Registros, cada una completa.',
  },
  {
    id: 'tarjeta',
    nombre: '2 · la tarjeta abierta',
    nota: 'Cada foto es una fila como una tarjeta de Registros: la foto en las columnas 3–4, su número en la 5ª (donde va el nombre del registro) y los datos en la 6ª, en la fila de la primera. La página sigue la tarjeta que se tocó.',
  },
  {
    id: 'entrada',
    nombre: '3 · foto de entrada en la retícula',
    nota: 'La primera foto sigue siendo grande, pero dentro de la caja: columnas 3–6 en 16:9, como la foto de una tarjeta pero más grande. Debajo, las horizontales en las 4 columnas y las verticales de a pares (3–4 y 5–6).',
  },
  {
    id: 'contactos',
    nombre: '4 · hoja de contactos',
    nota: 'Todas las fotos chicas, una por columna en las columnas 3–6, en cajas cuadradas con su número; al tocar una se abre el lightbox. Se ve el registro entero de una vez, como una hoja de contactos.',
  },
]

</script>

<template>
  <div class="px-2 pt-6 pb-24">
    <div class="page">
    <h1 class="font-display text-h1">Guía de estilos</h1>
    <p class="mt-4 text-cuerpo-sm">Solo visible en desarrollo.</p>

    <!--
      Propuestas para el detalle de un registro, con la retícula real de la página (6 columnas desde
      768 px): el nombre en las columnas 1–2, como «Registros», y las fotos en las 3–6, como la lista
    -->
    <section class="mt-16" aria-labelledby="g-detalle">
      <h2 id="g-detalle" class="font-display text-h3">Propuestas de detalle</h2>
      <p class="mt-2 max-w-prose text-cuerpo-sm">
        Que el detalle se lea como la continuación de Registros: el mismo reparto de columnas, el mismo
        título y los datos como las categorías. Con {{ muestraDetalle.titulo }}.
      </p>

      <div v-for="prop in propuestasDetalle" :key="prop.id" class="mt-16 border-t border-texto/15 pt-6">
        <h3 class="text-boton text-ui">{{ prop.nombre }}</h3>
        <p class="max-w-prose text-cuerpo-sm text-dato">{{ prop.nota }}</p>

        <div class="mt-8 md:grid md:grid-cols-6 md:items-start md:gap-x-6 lg:gap-x-10">
          <!-- Columnas 1–2: el nombre y, salvo en la tarjeta abierta, los datos en la 2ª -->
          <div class="md:col-span-2">
            <p class="font-display text-h1 text-balance text-titulo">{{ muestraDetalle.titulo }}</p>
            <ul
              v-if="prop.id !== 'tarjeta'"
              class="mt-4 text-boton text-dato md:mt-6 md:pl-[calc(50%+0.75rem)] lg:pl-[calc(50%+1.25rem)]"
            >
              <li v-for="(dato, i) in datosDetalle" :key="dato" :class="i === 0 && 'underline decoration-linea decoration-2 underline-offset-4'">{{ dato }}</li>
            </ul>
          </div>

          <div class="mt-8 md:col-span-4 md:mt-0">
            <!-- 1: una columna, cada foto completa -->
            <ul v-if="prop.id === 'lista'" class="grid gap-y-16">
              <li v-for="foto in fotosDetalle.slice(0, 3)" :key="foto.src" :class="vertical(foto) && 'md:w-1/2'">
                <ResponsiveImage v-bind="foto" sizes="(min-width: 768px) 66vw, 100vw" />
              </li>
            </ul>

            <!-- 2: filas como tarjetas (subgrilla de 4 con el mismo gutter) -->
            <ul v-else-if="prop.id === 'tarjeta'" class="grid gap-y-16">
              <li
                v-for="(foto, i) in fotosDetalle.slice(0, 4)"
                :key="foto.src"
                class="md:grid md:grid-cols-4 md:items-start md:gap-x-6 lg:gap-x-10"
              >
                <ResponsiveImage v-bind="foto" class="md:col-span-2" sizes="(min-width: 768px) 33vw, 100vw" />
                <div class="mt-4 md:col-span-2 md:mt-0 md:grid md:grid-cols-2 md:items-baseline md:gap-x-6 lg:gap-x-10">
                  <p class="text-cuerpo text-titulo tabular-nums">{{ nro(i) }}</p>
                  <ul v-if="i === 0" class="mt-2 text-boton text-dato md:mt-0">
                    <li v-for="(dato, j) in datosDetalle" :key="dato" :class="j === 0 && 'underline decoration-linea decoration-2 underline-offset-4'">{{ dato }}</li>
                  </ul>
                </div>
              </li>
            </ul>

            <!-- 3: la primera grande en 16:9; después horizontales en 4 columnas y verticales de a pares -->
            <div v-else-if="prop.id === 'entrada'">
              <ResponsiveImage v-bind="fotosDetalle[0]" ratio="16 / 9" sizes="(min-width: 768px) 66vw, 100vw" />
              <ul class="mt-16 grid grid-cols-2 items-start gap-x-6 gap-y-16 lg:gap-x-10">
                <li v-for="foto in fotosDetalle.slice(1, 6)" :key="foto.src" :class="vertical(foto) ? 'col-span-1' : 'col-span-2'">
                  <ResponsiveImage v-bind="foto" sizes="(min-width: 768px) 66vw, 100vw" />
                </li>
              </ul>
            </div>

            <!-- 4: una foto por columna, cuadradas, con su número -->
            <ul v-else class="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-4 lg:gap-x-10">
              <li v-for="(foto, i) in fotosDetalle.slice(0, 12)" :key="foto.src">
                <ResponsiveImage v-bind="foto" ratio="1 / 1" sizes="(min-width: 768px) 17vw, 50vw" />
                <p class="mt-2 text-boton text-dato tabular-nums">{{ nro(i) }}</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="mt-16" aria-labelledby="g-tipo">
      <h2 id="g-tipo" class="font-display text-h3">Tipografía</h2>
      <dl class="mt-6 divide-y divide-texto/15">
        <div v-for="t in type" :key="t.token" class="grid gap-2 py-4 sm:grid-cols-[8rem_1fr] sm:items-baseline">
          <dt class="text-etiqueta">{{ t.token }}</dt>
          <dd :class="t.class">{{ t.sample }}</dd>
        </div>
      </dl>
    </section>

    <section class="mt-16" aria-labelledby="g-tipografias">
      <h2 id="g-tipografias" class="font-display text-h3">Propuestas de tipografía</h2>
      <p class="mt-2 max-w-prose text-cuerpo-sm">
        De la biblioteca de la skill design-taste-frontend: una sola familia en distintos pesos, o
        una pareja. Cada muestra lleva sus propias fuentes; «usar en el sitio» la aplica a todas las
        páginas (y a la vista previa de abajo). Se recuerda en este navegador.
      </p>
      <div class="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10">
        <div v-for="t in tipografias" :key="t.nombre">
          <div class="bg-fondo p-4 outline outline-1 outline-texto/15" :style="{ fontFamily: t.texto.familia }">
            <p class="text-[2rem] leading-[0.9] text-marca" :style="{ fontFamily: t.logo.familia, fontWeight: t.logo.peso, letterSpacing: t.logo.tracking }">
              {{ site.wordmark }}
            </p>
            <p class="mt-6 text-[2.25rem] leading-none text-titulo" :style="{ fontFamily: t.titulos.familia, fontWeight: t.titulos.peso, letterSpacing: t.titulos.tracking }">
              Librería 780
            </p>
            <p class="mt-2 text-cuerpo-sm text-dato">comercial · 2025 · Valdivia, Chile</p>
            <p class="mt-4 text-cuerpo-sm leading-[1.5] text-texto">
              Fotografía de arquitectura e instalaciones industriales en el sur de Chile.
            </p>
            <p class="mt-4 text-boton text-ui">inicio · <span class="underline decoration-linea decoration-2 underline-offset-4">registros</span> · sobre mí · contacto</p>
          </div>
          <h3 class="mt-3 text-cuerpo">{{ t.nombre }} <span class="text-etiqueta opacity-60">{{ t.tipo }}</span></h3>
          <p class="mt-1 text-cuerpo-sm text-dato">{{ t.nota }}</p>
          <button
            type="button"
            :class="[
              'mt-2 cursor-pointer text-boton text-ui decoration-linea decoration-2 underline-offset-4',
              tipografiaActiva === t.nombre ? 'underline' : 'hover:underline',
            ]"
            @click="tipografiaActiva = aplicarTipografia(t.nombre)"
          >
            {{ tipografiaActiva === t.nombre ? 'en uso en el sitio' : 'usar en el sitio' }}
          </button>
        </div>
      </div>
    </section>

    <section class="mt-16" aria-labelledby="g-colores">
      <h2 id="g-colores" class="font-display text-h3">Colores</h2>
      <p class="mt-4 max-w-[60ch] text-cuerpo-sm">
        Paleta en prueba: cambia todo el sitio (solo aquí, en desarrollo). La publicada es la de main.css.
      </p>
      <!--
        Cada paleta como una muestra con el reparto publicado (tinta y un acento): fondo, logo y
        subrayado en el primario, texto en tinta. La publicada muestra sus colores de main.css
      -->
      <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <button
          v-for="p in paletas"
          :key="p.nombre"
          type="button"
          :aria-pressed="activa === p.nombre"
          :class="[
            'cursor-pointer p-4 text-left outline-offset-2',
            activa === p.nombre ? 'outline-2 outline-primario' : 'outline-1 outline-texto/15 hover:outline-texto/40',
          ]"
          :style="{ background: muestra(p).fondo, color: muestra(p).texto }"
          @click="choose(p.nombre)"
        >
          <span class="block text-cuerpo leading-none font-extrabold tracking-[-0.04em]" :style="{ color: muestra(p).primario }">
            jorge de maría *
          </span>
          <span class="mt-3 block font-display text-cuerpo">Librería 780</span>
          <span class="mt-1 block text-boton">
            comercial · 2025 ·
            <span class="underline decoration-2 underline-offset-4" :style="{ textDecorationColor: muestra(p).primario }">ver</span>
          </span>
          <span class="mt-3 block text-etiqueta opacity-70">{{ p.nombre }}</span>
        </button>
      </div>
      <ul class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <li v-for="c in colors" :key="c.name">
          <div :class="['aspect-square', c.class]" />
          <p class="mt-2 text-cuerpo-sm">{{ c.name }} <span class="opacity-70">{{ hex[c.name] }}</span></p>
        </li>
      </ul>
    </section>


    <!--
      Pedazos reales del sitio (componentes o sus mismas clases): cambian con la paleta y la letra de
      títulos elegidas arriba. El navbar y el pie de esta página también
    -->
    <section class="mt-16" aria-labelledby="g-vista">
      <h2 id="g-vista" class="font-display text-h3">Vista previa</h2>

      <!--
        Navbar de Inicio, con el logo en su tamaño grande: los dos primeros tercios (menos el aire);
        el logo con su * mide 6.66em (ver --logo-chico en main.css). Los enlaces en el 3º
      -->
      <h3 class="mt-8 text-boton text-ui">navbar</h3>
      <div class="@container mt-4 grid grid-cols-3 items-start bg-fondo py-4">
        <span
          class="col-span-2 font-logo leading-[0.85] font-bold tracking-[-0.04em] whitespace-nowrap text-marca [font-size:calc((100cqi*2/3-2.5rem)/6.66)]"
          >{{ site.wordmark }}</span
        >
        <ul class="text-boton text-ui">
          <li v-for="(item, i) in site.nav" :key="item.label" class="py-0.5">
            <span :class="['decoration-linea decoration-2 underline-offset-4', i === 1 && 'underline']">{{ item.label }}</span>
          </li>
        </ul>
      </div>

      <!-- Stack de Inicio: la primera foto con la franja de "Desliza" y el contador -->
      <h3 class="mt-16 text-boton text-ui">stack</h3>
      <div class="mt-4">
        <ResponsiveImage v-bind="heroPhotos[0]" ratio="16 / 9" sizes="100vw" />
        <div class="flex justify-between bg-fondo py-3 text-boton text-ui">
          <span>Desliza</span><span class="tabular-nums">1 / {{ heroPhotos.length }}</span>
        </div>
      </div>

      <!-- Registros: título y categorías en el 1º tercio, la tarjeta real en los otros dos -->
      <h3 class="mt-16 text-boton text-ui">registros</h3>
      <div class="mt-4 md:grid md:grid-cols-3 md:items-start">
        <div class="md:pr-6 lg:pr-10">
          <p class="font-display text-h1 text-titulo">Registros</p>
          <ul class="mt-4 flex flex-wrap gap-x-6 text-boton text-ui lowercase md:mt-6 md:flex-col">
            <li v-for="(c, i) in [{ nombre: 'Todos' }, ...categories]" :key="c.nombre">
              <span :class="['block w-fit py-1.5 decoration-linea decoration-2 underline-offset-4', i === 0 && 'underline']">{{ c.nombre }}</span>
            </li>
          </ul>
        </div>
        <div class="mt-8 md:col-span-2 md:mt-0"><ProjectCard :project="projects[0]" /></div>
      </div>

      <!-- Detalle: la foto de entrada con el nombre encima y la ficha -->
      <h3 class="mt-16 text-boton text-ui">detalle</h3>
      <div class="mt-4 md:grid md:grid-cols-3 md:items-start">
        <div class="relative md:col-span-2 md:mr-6 lg:mr-10">
          <ResponsiveImage v-bind="projects[0].fotos[0]" ratio="16 / 9" sizes="66vw" />
          <div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-[rgb(0_0_0/0.45)] from-35% to-transparent px-4 pt-16 pb-4">
            <p class="font-display text-[clamp(2rem,4vw,3.5rem)] leading-[0.9] tracking-[-0.03em] text-sobre-foto">{{ projects[0].titulo }}</p>
          </div>
        </div>
        <div class="mt-6 md:mt-0">
          <p class="font-display text-h1 text-titulo">{{ projects[0].titulo }}</p>
          <ul class="mt-4 text-boton text-dato">
            <li class="py-1.5"><span class="underline decoration-linea decoration-2 underline-offset-4">{{ projects[0].categoria.nombre.toLowerCase() }}</span></li>
            <li class="py-1.5">{{ projects[0].año }}</li>
            <li class="py-1.5">{{ projects[0].lugar }}</li>
            <li class="py-1.5">{{ projects[0].arquitecto }}</li>
          </ul>
        </div>
      </div>

      <!-- Contacto: la frase y el correo -->
      <h3 class="mt-16 text-boton text-ui">contacto</h3>
      <p class="mt-4 font-display text-h1 text-titulo">¿necesitas fotos? escríbeme:</p>
      <p class="mt-4 text-[clamp(1.75rem,4.5vw,4rem)] leading-none font-bold text-marca">
        <span class="underline decoration-linea decoration-[0.08em] underline-offset-[0.12em]">{{ site.email }}</span> :)
      </p>
    </section>

    </div>
  </div>
</template>
