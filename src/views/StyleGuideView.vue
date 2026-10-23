<script setup>
import { ref, onMounted } from 'vue'
import { paletas, aplicarPaleta, paletaGuardada } from '../composables/usePaleta'
import {
  titulos,
  aplicarTitulos,
  tituloGuardado,
  cargarFuentes,
  aplicarLogoSerif,
  logoSerifGuardado,
} from '../composables/useTitulos'
import ProjectCard from '../components/ProjectCard.vue'
import ProjectFacts from '../components/ProjectFacts.vue'
import SystemMock from '../components/SystemMock.vue'
import ResponsiveImage from '../components/ResponsiveImage.vue'
import { projects, heroPhotos } from '../data/content'
import { site } from '../data/site'

/*
 * Propuestas de sistema para navbar + ficha + pie, coherentes con la retícula de tercios. Las
 * tres primeras son las opciones conversadas; las tres últimas, direcciones de tasteskill
 * (design-taste-frontend, sector arquitectura), adaptadas a la paleta y la letra del sitio.
 */
const systemVariants = [
  {
    id: 'ficha',
    nombre: 'Ficha técnica',
    origen: 'industrial-brutalist-ui',
    texto: 'El navbar es una regla de tres tercios, igual que la ficha y el pie: logo, título del registro y enlaces como texto. Arriba y abajo de la galería, las mismas tres líneas.',
  },
  {
    id: 'minimo',
    nombre: 'Mínimo',
    origen: 'minimalist-ui',
    texto: 'Los mismos tercios, sin bloques ni líneas: todo texto chico, como un pie de imprenta. Las fotos dominan; el subrayado rosado marca la página actual.',
  },
  {
    id: 'cajas',
    nombre: 'Menú en cajas, en tercios',
    origen: 'opción conversada',
    texto: 'El menú actual en bloques, ajustado a los tercios: cuatro enlaces en el segundo tercio y "escríbeme" ocupando el tercero. Ficha en lista bajo el segundo tercio y pie en celdas.',
  },
  {
    id: 'lugar',
    nombre: 'La foto manda',
    origen: 'tasteskill · place-carries-it',
    texto: 'La foto principal es el argumento: el menú encima, chico en las esquinas, y el nombre del registro abajo como título de película. La ficha se reduce a una línea y el pie devuelve el nombre a todo el ancho.',
  },
  {
    id: 'monumento',
    nombre: 'El nombre como monumento',
    origen: 'tasteskill · name-as-monument',
    texto: 'El nombre del sitio a todo el ancho, como arquitectura, arriba y otra vez al cerrar. El menú en una esquina; la ficha y el pie en tercios.',
  },
  {
    id: 'oscuro',
    nombre: 'Cuarto oscuro',
    origen: 'tasteskill · dark-room',
    texto: 'Un solo fondo oscuro de arriba a abajo y las fotos como lo único iluminado, como en una sala de exposición. Misma estructura de tercios que la ficha técnica, con letra clara y rosado.',
  },
  {
    id: 'mezcla',
    nombre: 'Monumento + la foto manda',
    origen: 'S5 + S4',
    texto: 'El nombre a todo el ancho con el menú en una esquina (de S5), y todo lo demás de S4: el nombre del registro sobre la foto como título de película, la ficha en una línea y el pie con el nombre grande.',
  },
]

// Las maquetas de sistema usan el registro con más fotos, para ver la galería en varias filas
const mockProject = projects.reduce((most, p) => (p.fotos.length > (most?.fotos.length ?? 0) ? p : most), null)

// Vista previa: partes reales del sitio (o réplicas fieles) con la paleta elegida
const sample = projects[0]
const sampleFacts = sample
  ? [
      ['año', String(sample.año)],
      ['lugar', sample.lugar],
      ['arquitectura', sample.arquitecto],
    ]
  : []
const samplePhoto = heroPhotos[0]
const menuItems = site.nav.map((item) => item.label)

// Propuestas de color para el logo: cada una es una lista de partes { texto, clases }
const wordmarkFirst = site.wordmark.split(' ').slice(0, -1).join(' ') + ' '
const wordmarkLast = site.wordmark.split(' ').at(-1)
const logoVariants = [
  { nombre: 'anterior', partes: [{ t: site.wordmark, c: 'bg-primario text-fondo' }] },
  { nombre: 'bloque rosado (en uso)', partes: [{ t: site.wordmark, c: 'bg-acento text-primario' }] },
  { nombre: 'letra rosada', partes: [{ t: site.wordmark, c: 'bg-primario text-acento' }] },
  {
    nombre: 'dos tonos',
    partes: [
      { t: wordmarkFirst, c: 'bg-primario text-fondo' },
      { t: wordmarkLast, c: 'bg-acento text-primario' },
    ],
  },
  { nombre: 'contorno', partes: [{ t: site.wordmark, c: 'border-2 border-primario bg-fondo text-primario' }] },
  { nombre: 'sombra rosada', partes: [{ t: site.wordmark, c: 'bg-primario text-fondo shadow-[0.25rem_0.25rem_0_var(--color-acento)]' }] },
  { nombre: 'tinta', partes: [{ t: site.wordmark, c: 'bg-texto text-fondo' }] },
  { nombre: 'rosado y tinta', partes: [{ t: site.wordmark, c: 'bg-acento text-texto' }] },
]

/*
 * Propuestas de forma para el logo, sobre el bloque actual (rosado, letra en primario, mismo
 * aire): cambia el texto (lineas: una o varias líneas) o el espaciado entre letras (extra).
 */
const logoForms = [
  { nombre: 'en uso', lineas: [site.wordmark] },
  { nombre: 'anterior', lineas: ['JORGE DE MARÍA'] },
  { nombre: 'minúsculas', lineas: ['jorge de maría'] },
  { nombre: 'como se escribe', lineas: ['Jorge de María'] },
  { nombre: 'minúsculas y carita', lineas: ['jorge de maría :)'] },
  { nombre: 'sílabas', lineas: ['jor·ge de ma·rí·a'] },
  { nombre: 'guiones bajos', lineas: ['jorge_de_maría'] },
  { nombre: 'entre corchetes', lineas: ['[jorge de maría]'] },
  { nombre: 'con cursor', lineas: ['jorge de maría_'] },
  { nombre: 'en dos líneas', lineas: ['jorge', 'de maría'] },
  { nombre: 'apretado', lineas: ['jorgedemaría'], extra: 'tracking-[-0.06em]' },
  { nombre: 'iniciales', lineas: ['jdm'] },
  { nombre: 'iniciales y carita', lineas: ['j.d.m :)'] },
]

// Propuestas para contacto: fondo de la sección, frase, correo y carita
const contactVariants = [
  { nombre: 'anterior', seccion: '', frase: 'bg-primario text-fondo', correo: 'text-primario', carita: 'text-primario' },
  { nombre: 'frase rosada', seccion: '', frase: 'bg-acento text-primario', correo: 'text-primario', carita: 'text-primario' },
  {
    nombre: 'carita rosada',
    seccion: '',
    frase: 'bg-primario text-fondo',
    correo: 'text-primario',
    carita: 'bg-acento px-[0.1em] text-primario',
  },
  {
    nombre: 'correo marcado (en uso)',
    seccion: '',
    frase: 'bg-primario text-fondo',
    correo: 'bg-acento px-[0.1em] text-primario',
    carita: 'text-primario',
  },
  {
    nombre: 'subrayado rosado',
    seccion: '',
    frase: 'text-primario',
    correo: 'text-primario underline decoration-acento decoration-[0.18em] underline-offset-[0.14em]',
    carita: 'text-primario',
  },
  {
    nombre: 'sección rosada',
    seccion: 'bg-acento',
    frase: 'bg-primario text-fondo',
    correo: 'text-primario',
    carita: 'text-primario',
  },
  {
    nombre: 'sección en primario',
    seccion: 'bg-primario',
    frase: 'bg-acento text-primario',
    correo: 'text-fondo',
    carita: 'text-acento',
  },
]

/*
 * Propuestas para el pie: los datos reales del sitio con distintos tratamientos.
 * tipo: 'grilla' (como el actual), 'grande' (nombre gigante arriba de la grilla) o 'linea'
 * (todo en una línea). En la grilla: lineas = borde y color de las divisiones, celda = fondo de
 * cada celda, etiqueta y dato = texto, correo = estilo extra de la celda del correo.
 */
const footerData = [
  { label: 'fotografía de arquitectura', value: site.name.toLowerCase() },
  { label: 'correo', value: site.email },
  ...(site.instagram ? [{ label: 'instagram', value: `@${site.instagram}` }] : []),
  ...(site.telefono ? [{ label: 'teléfono', value: site.telefono }] : []),
  ...(site.ubicacion ? [{ label: 'ubicación', value: site.ubicacion }] : []),
  { label: '©', value: String(new Date().getFullYear()) },
]
const gridFooter = { lineas: 'border border-primario bg-primario', celda: 'bg-fondo', etiqueta: 'text-primario', dato: 'text-primario' }
const footerVariants = [
  { nombre: 'anterior', tipo: 'grilla', ...gridFooter },
  { nombre: 'como las fichas', tipo: 'grilla', ...gridFooter, etiqueta: 'font-light text-primario', dato: 'text-texto' },
  { nombre: 'correo destacado', tipo: 'grilla', ...gridFooter, correo: '[&_dd]:w-fit [&_dd]:bg-acento [&_dd]:px-1' },
  { nombre: 'celdas rosadas', tipo: 'grilla', ...gridFooter, celda: 'bg-acento', etiqueta: 'font-light text-primario' },
  {
    nombre: 'en primario',
    tipo: 'grilla',
    lineas: 'border border-primario bg-fondo',
    celda: 'bg-primario',
    etiqueta: 'text-acento',
    dato: 'text-fondo',
  },
  { nombre: 'solo líneas horizontales', tipo: 'grilla', ...gridFooter, lineas: 'border-y border-primario bg-fondo', etiqueta: 'font-light text-primario', dato: 'text-texto' },
  { nombre: 'nombre gigante', tipo: 'grande', ...gridFooter },
  { nombre: 'una línea (en uso)', tipo: 'linea' },
]

/*
 * Propuestas para el hover de los enlaces tipo menú (menú, filtro de categorías, "ver proyecto").
 * Son reales: pasa el cursor por cada lista para probarlas.
 */
const hoverVariants = [
  { nombre: 'relleno primario (en uso)', c: 'hover:bg-primario hover:text-fondo' },
  { nombre: 'relleno rosado', c: 'hover:bg-acento' },
  { nombre: 'rosado y letra texto', c: 'hover:bg-acento hover:text-texto' },
  { nombre: 'subrayado rosado', c: 'hover:underline hover:decoration-acento hover:decoration-[0.2em] hover:underline-offset-[0.25em]' },
  { nombre: 'barra rosada a la izquierda', c: 'hover:shadow-[inset_0.375rem_0_0_var(--color-acento)]' },
  { nombre: 'relleno primario y letra rosada', c: 'hover:bg-primario hover:text-acento' },
  { nombre: 'contorno rosado', c: 'hover:shadow-[inset_0_0_0_0.1875rem_var(--color-acento)]' },
  { nombre: 'relleno tinta', c: 'hover:bg-texto hover:text-fondo' },
]

/*
 * Propuestas para las fichas (todas iguales: últimos trabajos, proyectos y detalle).
 * caja: el borde y el fondo; lineas: las divisiones; etiqueta y dato: el texto de cada fila;
 * primera: estilo extra de la primera fila (opcional).
 */
const fichaVariants = [
  { nombre: 'en uso', caja: 'border border-primario bg-fondo', lineas: 'divide-primario', etiqueta: 'font-light text-primario', dato: 'text-texto' },
  { nombre: 'fondo rosado', caja: 'border border-primario bg-acento', lineas: 'divide-primario', etiqueta: 'font-light text-primario', dato: 'text-texto' },
  {
    nombre: 'primera fila rosada',
    caja: 'border border-primario bg-fondo',
    lineas: 'divide-primario',
    etiqueta: 'font-light text-primario',
    dato: 'text-texto',
    primera: 'bg-acento',
  },
  { nombre: 'solo líneas, sin caja', caja: 'border-y border-primario', lineas: 'divide-primario', etiqueta: 'font-light text-primario', dato: 'text-texto' },
  { nombre: 'líneas punteadas', caja: 'border border-primario bg-fondo', lineas: 'divide-primario divide-dashed', etiqueta: 'font-light text-primario', dato: 'text-texto' },
  { nombre: 'borde rosado', caja: 'border-2 border-acento bg-fondo', lineas: 'divide-acento', etiqueta: 'font-light text-primario', dato: 'text-texto' },
  { nombre: 'invertida en primario', caja: 'border border-primario bg-primario', lineas: 'divide-fondo/30', etiqueta: 'font-light text-acento', dato: 'text-fondo' },
  { nombre: 'etiquetas en bloque rosado', caja: 'border border-primario bg-fondo', lineas: 'divide-primario', etiqueta: 'w-fit bg-acento px-1 text-primario', dato: 'text-texto' },
]

const colors = [
  { name: 'fondo', class: 'bg-fondo border border-texto' },
  { name: 'primario', class: 'bg-primario' },
  { name: 'acento', class: 'bg-acento' },
  { name: 'texto', class: 'bg-texto' },
]

// Paleta en prueba: cambia todo el sitio y se recuerda al recorrerlo (ver usePaleta)
const activa = ref(paletaGuardada())
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

// Tipografía de títulos en prueba: cambia todos los títulos del sitio (ver useTitulos). Las
// tarjetas muestran cada una con su propia fuente, así se comparan aunque no esté elegida
const tituloActivo = ref(tituloGuardado())
const logoSerif = ref(logoSerifGuardado())
onMounted(cargarFuentes)
const muestraTitulos = { nombre: 'Casa Punucapa', ficha: 'casas · 2023 · Valdivia, Chile', otro: 'Librería 780' }

const type = [
  { token: 'h1', class: 'font-display text-h1', sample: 'Nave de producción, planta norte' },
  { token: 'h2', class: 'font-display text-h2', sample: 'Nave de producción, planta norte' },
  { token: 'h3', class: 'font-display text-h3', sample: 'Nave de producción, planta norte' },
  { token: 'h4', class: 'font-display text-h4', sample: 'Nave de producción, planta norte' },
  { token: 'cuerpo', class: 'text-cuerpo', sample: 'Hormigón, acero y luz de la tarde.' },
  { token: 'cuerpo-sm', class: 'text-cuerpo-sm', sample: 'Hormigón, acero y luz de la tarde.' },
  { token: 'etiqueta', class: 'text-etiqueta', sample: 'Planta norte, 2025' },
  { token: 'logo', class: 'text-logo text-primario', sample: 'jorge de maría' },
]
</script>

<template>
  <div class="px-2 pt-6 pb-24">
    <div class="page">
    <h1 class="font-display text-h1">Guía de estilos</h1>
    <p class="mt-4 text-cuerpo-sm">Solo visible en desarrollo.</p>

    <section class="mt-16" aria-labelledby="g-colores">
      <h2 id="g-colores" class="font-display text-h3">Colores</h2>
      <p class="mt-4 max-w-[60ch] text-cuerpo-sm">
        Paleta en prueba: cambia todo el sitio (solo aquí, en desarrollo). La publicada es la de main.css.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button
          v-for="p in paletas"
          :key="p.nombre"
          type="button"
          :aria-pressed="activa === p.nombre"
          :class="[
            'cursor-pointer border border-primario px-3 py-1.5 text-cuerpo-sm',
            activa === p.nombre ? 'bg-primario text-fondo' : 'text-primario hover:bg-primario hover:text-fondo',
          ]"
          @click="choose(p.nombre)"
        >
          {{ p.nombre }}
        </button>
      </div>
      <ul class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <li v-for="c in colors" :key="c.name">
          <div :class="['aspect-square', c.class]" />
          <p class="mt-2 text-cuerpo-sm">{{ c.name }} <span class="opacity-70">{{ hex[c.name] }}</span></p>
        </li>
      </ul>
    </section>

    <section class="mt-16" aria-labelledby="g-titulos">
      <h2 id="g-titulos" class="font-display text-h3">Tipografía de títulos</h2>
      <p class="mt-4 max-w-[60ch] text-cuerpo-sm">
        El logo, el navbar y los textos siguen en JetBrains Mono; cada tarjeta prueba una serif para los títulos.
        Al elegir una cambian todos los títulos del sitio (solo aquí, en desarrollo).
      </p>
      <button
        type="button"
        :aria-pressed="logoSerif"
        :class="[
          'mt-4 cursor-pointer border border-primario px-3 py-1.5 text-cuerpo-sm',
          logoSerif ? 'bg-primario text-fondo' : 'text-primario hover:bg-primario hover:text-fondo',
        ]"
        @click="logoSerif = aplicarLogoSerif(!logoSerif)"
      >
        logo en Instrument Serif: {{ logoSerif ? 'sí' : 'no' }}
      </button>
      <ul class="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <li v-for="t in titulos" :key="t.nombre">
          <button
            type="button"
            :aria-pressed="tituloActivo === t.nombre"
            :class="[
              'flex h-full w-full cursor-pointer flex-col border p-4 text-left',
              tituloActivo === t.nombre ? 'border-primario ring-2 ring-primario' : 'border-texto/15 hover:border-primario',
            ]"
            @click="tituloActivo = aplicarTitulos(t.nombre)"
          >
            <!-- Navbar en mono, como el sitio -->
            <span class="flex items-baseline justify-between gap-2">
              <span class="font-logo text-h4 leading-none [font-weight:var(--logo-peso,800)] tracking-[-0.04em] text-primario"
                >jorge de maría *</span
              >
              <span class="text-boton text-primario">registros · sobre mí</span>
            </span>
            <!-- Título con la fuente de cada opción -->
            <span
              class="mt-8 block text-[2.5rem] leading-[1.05] text-texto"
              :style="{ fontFamily: t.familia ?? t.muestra, fontWeight: t.peso }"
              >{{ muestraTitulos.nombre }}</span
            >
            <span class="mt-2 text-boton text-primario">{{ muestraTitulos.ficha }}</span>
            <span
              class="mt-6 block text-2xl leading-tight text-texto"
              :style="{ fontFamily: t.familia ?? t.muestra, fontWeight: t.peso }"
              >{{ muestraTitulos.otro }}</span
            >
            <span class="mt-1 text-boton text-primario">comercial · 2025 · Valdivia, Chile</span>
            <span class="mt-auto block border-t border-texto/15 pt-3 text-cuerpo-sm" style="margin-top: 2rem">
              <span class="font-extrabold">{{ t.nombre }}</span> — {{ t.nota }}
            </span>
          </button>
        </li>
      </ul>
    </section>

    <section class="mt-16" aria-labelledby="g-sistema">
      <h2 id="g-sistema" class="font-display text-h3">Propuestas de sistema: navbar, ficha y pie</h2>
      <p class="mt-4 max-w-[60ch] text-cuerpo-sm">
        Cómo se ve una página de registro completa en cada propuesta: navbar, foto principal, ficha, galería en
        tercios (con la misma regla del sitio) y pie. Usa la paleta elegida arriba.
      </p>
      <ul v-if="mockProject" class="mt-8 flex flex-col gap-16">
        <li v-for="(v, i) in systemVariants" :key="v.id">
          <p class="text-etiqueta text-texto/60">S{{ i + 1 }} · {{ v.origen }}</p>
          <h3 class="mt-2 font-display text-h4">{{ v.nombre }}</h3>
          <p class="mt-2 max-w-[70ch] text-cuerpo-sm">{{ v.texto }}</p>
          <SystemMock class="mt-4" :variant="v.id" :project="mockProject" />
        </li>
      </ul>
    </section>

    <section class="mt-16" aria-labelledby="g-vista">
      <h2 id="g-vista" class="font-display text-h3">Vista previa</h2>
      <p class="mt-4 max-w-[60ch] text-cuerpo-sm">
        Partes del sitio con la paleta elegida. Cambia de paleta arriba y mira cómo se ven.
      </p>

      <div class="mt-8 grid gap-10 lg:grid-cols-2">
        <!-- Navbar con el menú abierto: "proyectos" con el cursor encima, "escríbeme" al final -->
        <div>
          <h3 class="text-etiqueta text-texto/60">navbar y menú abierto</h3>
          <div class="mt-3 flex items-center justify-between">
            <span class="bg-acento px-1.5 pt-2 pb-1 text-h3 font-extrabold whitespace-pre text-primario">{{
              site.wordmark
            }}</span>
            <span class="grid size-9 place-items-center border border-primario bg-fondo text-primario">×</span>
          </div>
          <div class="mt-4 grid gap-px border border-primario bg-primario sm:grid-cols-5">
            <span
              v-for="(label, i) in menuItems"
              :key="label"
              :class="[
                'flex justify-between gap-2 px-3 py-2.5 text-boton',
                i === 1 ? 'bg-primario text-fondo' : 'bg-fondo text-primario',
              ]"
            >
              <span>{{ i === 0 ? '*' : '' }}</span>{{ label }}
            </span>
            <span class="bg-primario px-3 py-2.5 text-right text-boton text-fondo">{{ site.cta.label }}</span>
          </div>
        </div>

        <!-- Stack de Inicio: foto, retícula y los bloques de "Desliza" y el contador -->
        <div>
          <h3 class="text-etiqueta text-texto/60">stack de fotos de inicio</h3>
          <div v-if="samplePhoto" class="relative mt-3 aspect-video overflow-hidden">
            <ResponsiveImage v-bind="samplePhoto" fill sizes="(min-width: 1024px) 50vw, 100vw" />
            <div class="absolute inset-x-6 inset-y-4">
              <span
                v-for="n in 6"
                :key="n"
                class="absolute inset-y-0 w-px bg-primario"
                :style="{ left: `${((n - 1) / 5) * 100}%` }"
              />
            </div>
            <span class="absolute bottom-3 left-6 bg-primario px-1.5 py-0.5 text-cuerpo text-fondo">Desliza</span>
            <span class="absolute right-6 bottom-3 bg-primario px-1.5 py-0.5 text-cuerpo text-fondo tabular-nums"
              >1 / 5</span
            >
          </div>
        </div>

        <!-- Tarjeta de proyecto real (pasa el cursor para ver la ficha) y la ficha del detalle -->
        <div v-if="sample">
          <h3 class="text-etiqueta text-texto/60">tarjeta de proyecto (pasa el cursor)</h3>
          <div class="mt-3 max-w-sm">
            <ProjectCard :project="sample" />
          </div>
        </div>
        <div v-if="sample">
          <h3 class="text-etiqueta text-texto/60">ficha del detalle de proyecto</h3>
          <ProjectFacts :project="sample" :facts="sampleFacts" class="mt-3 max-w-sm" />
        </div>

        <!-- Contacto: frase en bloque y correo grande -->
        <div class="lg:col-span-2">
          <h3 class="text-etiqueta text-texto/60">contacto</h3>
          <p class="mt-3 w-fit bg-primario px-[0.17em] pt-[0.22em] pb-[0.11em] text-[1.5rem] leading-none font-extrabold text-fondo">
            ¿necesitas fotos? escríbeme:
          </p>
          <p class="mt-4 text-[clamp(1.5rem,5vw,3.5rem)] leading-none font-extrabold break-all text-primario">
            <span class="bg-acento px-[0.1em]">{{ site.email }}</span> :)
          </p>
        </div>
      </div>

      <!-- Propuestas de color para el logo (bloque del navbar) -->
      <h3 class="mt-16 font-display text-h4">Propuestas para el logo</h3>
      <ul class="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="(v, i) in logoVariants" :key="v.nombre">
          <p class="text-etiqueta text-texto/60">L{{ i + 1 }}. {{ v.nombre }}</p>
          <p class="mt-3 flex w-fit text-h3 font-extrabold whitespace-pre">
            <span v-for="parte in v.partes" :key="parte.t" :class="['px-1.5 pt-2 pb-1', parte.c]">{{ parte.t }}</span>
          </p>
        </li>
      </ul>

      <!-- Propuestas de forma para el logo: mismo bloque, distinto texto -->
      <h3 class="mt-16 font-display text-h4">Propuestas de forma para el logo</h3>
      <p class="mt-3 max-w-[60ch] text-cuerpo-sm">
        El mismo bloque del logo actual, con otras formas de escribir el nombre.
      </p>
      <ul class="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="(v, i) in logoForms" :key="v.nombre">
          <p class="text-etiqueta text-texto/60">LF{{ i + 1 }}. {{ v.nombre }}</p>
          <p
            :class="[
              'mt-3 w-fit bg-acento px-6 pt-2 pb-1 text-h3 leading-none font-extrabold whitespace-pre text-primario sm:text-logo',
              v.extra,
            ]"
          >
            <template v-for="(linea, j) in v.lineas" :key="linea"><br v-if="j" />{{ linea }}</template>
          </p>
        </li>
      </ul>

      <!-- Propuestas para contacto (cierre de Inicio) -->
      <h3 class="mt-16 font-display text-h4">Propuestas para contacto</h3>
      <ul class="mt-6 grid gap-8 lg:grid-cols-2">
        <li v-for="(v, i) in contactVariants" :key="v.nombre">
          <p class="text-etiqueta text-texto/60">C{{ i + 1 }}. {{ v.nombre }}</p>
          <div :class="['mt-3 p-5', v.seccion || 'border border-texto/10']">
            <p
              :class="[
                'w-fit px-[0.17em] pt-[0.22em] pb-[0.11em] text-[1.25rem] leading-none font-extrabold',
                v.frase,
              ]"
            >
              ¿necesitas fotos? escríbeme:
            </p>
            <p class="mt-4 text-[clamp(1.25rem,3vw,2.25rem)] leading-none font-extrabold break-all">
              <span :class="v.correo">{{ site.email }}</span> <span :class="v.carita">:)</span>
            </p>
          </div>
        </li>
      </ul>

      <!-- Propuestas para el pie (footer) -->
      <h3 class="mt-16 font-display text-h4">Propuestas para el pie</h3>
      <ul class="mt-6 flex flex-col gap-12">
        <li v-for="(v, i) in footerVariants" :key="v.nombre">
          <p class="text-etiqueta text-texto/60">P{{ i + 1 }}. {{ v.nombre }}</p>

          <!-- Nombre gigante en bloque rosado, como el logo, sobre la grilla -->
          <p
            v-if="v.tipo === 'grande'"
            class="mt-3 w-fit bg-acento px-[0.17em] pt-[0.22em] pb-[0.11em] text-[clamp(2rem,7vw,5.5rem)] leading-none font-extrabold whitespace-nowrap text-primario"
          >
            {{ site.wordmark }}
          </p>

          <!-- Todo en una línea, separado por puntos, sobre una línea fina -->
          <p
            v-if="v.tipo === 'linea'"
            class="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-primario pt-3 text-cuerpo-sm text-primario"
          >
            <template v-for="(d, j) in footerData" :key="d.label">
              <span v-if="j" aria-hidden="true">·</span>
              <span :class="j === 1 && 'bg-acento px-1'">{{ d.value }}</span>
            </template>
          </p>

          <!-- Grilla: las líneas son el fondo que asoma por 1 px entre celdas, como el pie real -->
          <dl v-else :class="['mt-3 grid gap-px sm:grid-cols-3 xl:grid-cols-6', v.lineas]">
            <div
              v-for="(d, j) in footerData"
              :key="d.label"
              :class="['flex flex-col gap-1 px-3 py-2', v.celda, j === 1 && v.correo]"
            >
              <dt :class="['text-etiqueta', v.etiqueta]">{{ d.label }}</dt>
              <dd :class="['text-cuerpo-sm whitespace-nowrap', v.dato]">{{ d.value }}</dd>
            </div>
          </dl>
        </li>
      </ul>

      <!-- Propuestas para el hover: listas tipo menú, pasa el cursor para probarlas -->
      <h3 class="mt-16 font-display text-h4">Propuestas para el hover</h3>
      <p class="mt-3 max-w-[60ch] text-cuerpo-sm">Pasa el cursor por cada lista para probarla.</p>
      <ul class="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="(v, i) in hoverVariants" :key="v.nombre">
          <p class="text-etiqueta text-texto/60">H{{ i + 1 }}. {{ v.nombre }}</p>
          <div class="mt-3 grid gap-px border border-primario bg-primario">
            <a
              v-for="label in menuItems.slice(0, 3)"
              :key="label"
              href="#g-vista"
              :class="[
                'bg-fondo px-3 py-2.5 text-right text-boton text-primario transition-colors duration-200 ease-out',
                v.c,
              ]"
              @click.prevent
              >{{ label }}</a
            >
          </div>
        </li>
      </ul>

      <!-- Propuestas para las fichas: una sola para últimos trabajos, proyectos y detalle -->
      <h3 class="mt-16 font-display text-h4">Propuestas para las fichas</h3>
      <p class="mt-3 max-w-[60ch] text-cuerpo-sm">
        La que elijas se aplica igual en últimos trabajos, proyectos y el detalle de cada proyecto.
      </p>
      <ul class="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="(v, i) in fichaVariants" :key="v.nombre">
          <p class="text-etiqueta text-texto/60">F{{ i + 1 }}. {{ v.nombre }}</p>
          <dl :class="['mt-3 divide-y text-cuerpo-sm', v.caja, v.lineas]">
            <div
              v-for="([label, value], row) in sampleFacts"
              :key="label"
              :class="['flex items-baseline justify-between gap-4 px-3 py-2.5', row === 0 && v.primera]"
            >
              <dt :class="v.etiqueta">{{ label }}</dt>
              <dd :class="['text-right', v.dato]">{{ value }}</dd>
            </div>
          </dl>
        </li>
      </ul>

      <!--
        Otros usos posibles del acento (rosado).
      -->
      <h3 class="mt-16 font-display text-h4">Otros usos del rosado</h3>
      <p class="mt-3 max-w-[60ch] text-cuerpo-sm">
        En uso: el logo, el correo de contacto, los bloques sobre las fotos, la carita y el "copiado!".
      </p>
      <ul class="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <li>
          <p class="text-etiqueta text-texto/60">1. bloques sobre las fotos (en uso)</p>
          <div v-if="samplePhoto" class="relative mt-3 aspect-[4/3] overflow-hidden">
            <ResponsiveImage v-bind="samplePhoto" fill sizes="25vw" />
            <span class="absolute bottom-3 left-3 bg-acento px-1.5 py-0.5 text-cuerpo text-primario">Desliza</span>
            <span class="absolute right-3 bottom-3 bg-acento px-1.5 py-0.5 text-cuerpo text-primario">1 / 5</span>
          </div>
        </li>
        <li>
          <p class="text-etiqueta text-texto/60">2. carita y "copiado!" (en uso)</p>
          <p class="mt-3 text-[2.5rem] leading-none font-extrabold text-primario">
            <span class="bg-acento px-[0.1em]">:)</span>
          </p>
          <p class="mt-4 w-fit bg-acento px-1.5 py-0.5 text-cuerpo-sm text-primario">copiado!</p>
        </li>
      </ul>
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
    </div>
  </div>
</template>
