/*
 * Procesa el contenido del portafolio.
 *
 *   npm run fotos
 *
 * Lee content/inicio y content/proyectos/<categoria>/<proyecto>, revisa cada info.json,
 * genera las fotos optimizadas en public/images (3 tamaños × AVIF, WebP y JPG) y escribe
 * src/data/content.generated.json, que es lo que lee la web.
 * Solo procesa las fotos nuevas o modificadas, y borra las versiones que ya no se usan.
 */
import { existsSync, readdirSync, readFileSync, statSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, parse, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CONTENT = join(ROOT, 'content')
const PUBLIC_IMAGES = join(ROOT, 'public', 'images')
const OUTPUT_JSON = join(ROOT, 'src', 'data', 'content.generated.json')

const WIDTHS = [800, 1600, 2400]
const FORMATS = {
  avif: (img) => img.avif({ quality: 52, effort: 4 }),
  webp: (img) => img.webp({ quality: 78 }),
  jpg: (img) => img.jpeg({ quality: 80, mozjpeg: true, progressive: true }),
}
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp']
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
// Fecha de publicación: DD-MM-AAAA (también se acepta AAAA-MM-DD)
const DATE_DMY = /^(\d{2})-(\d{2})-(\d{4})$/
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/
function toIsoDate(value) {
  if (typeof value !== 'string') return null
  const dmy = value.match(DATE_DMY)
  const iso = dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : DATE_ISO.test(value) ? value : null
  // Date.parse acepta 2026-02-31; se comprueba que la fecha exista de verdad
  if (!iso || isNaN(Date.parse(iso)) || new Date(iso).toISOString().slice(0, 10) !== iso) return null
  return iso
}

// Datos de la última ejecución: permiten reutilizar fotos ya procesadas cuyo original
// no está en este computador (los originales no se suben a GitHub)
const previous = new Map()
if (existsSync(OUTPUT_JSON)) {
  try {
    const data = JSON.parse(readFileSync(OUTPUT_JSON, 'utf8'))
    for (const photo of [...data.inicio, ...data.proyectos.flatMap((p) => p.fotos)]) previous.set(photo.src, photo)
  } catch {
    // Si el archivo está dañado se procesa todo desde los originales
  }
}
const outputsExist = (photo) =>
  photo.widths.every((w) => Object.keys(FORMATS).every((ext) => existsSync(join(ROOT, 'public', `${photo.src}-${w}.${ext}`))))

const errors = []
const warnings = []
let created = 0
let unchanged = 0

const rel = (path) => relative(ROOT, path)
const isDir = (path) => existsSync(path) && statSync(path).isDirectory()
const subdirs = (path) => readdirSync(path).filter((name) => !name.startsWith('.') && isDir(join(path, name)))
const label = (slug) => slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')

function readInfo(folder) {
  const file = join(folder, 'info.json')
  if (!existsSync(file)) {
    errors.push(`${rel(folder)}: falta el archivo info.json`)
    return null
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    errors.push(`${rel(file)}: no es un JSON válido (${error.message}). Revisa comas, comillas y llaves.`)
    return null
  }
}

// Revisa la lista de fotos de un info.json; devuelve solo las válidas
function checkPhotos(folder, photos, publicBase) {
  const where = rel(folder)
  if (!Array.isArray(photos) || photos.length === 0) {
    errors.push(`${where}: "fotos" debe ser una lista con al menos una foto`)
    return []
  }
  const valid = []
  photos.forEach((photo, i) => {
    const name = photo?.archivo
    if (typeof name !== 'string' || !name) {
      errors.push(`${where}: a la foto número ${i + 1} le falta "archivo"`)
      return
    }
    if (!existsSync(join(folder, name))) {
      // Sin original, pero ya procesada antes: se reutiliza tal cual
      const done = previous.get(`${publicBase}/${parse(name).name}`)
      if (done && outputsExist(done)) {
        valid.push({ ...photo, reuse: done })
        return
      }
      errors.push(`${where}: la foto ${name} está en info.json pero no en la carpeta`)
      return
    }
    if (typeof photo.alt !== 'string' || !photo.alt.trim()) {
      errors.push(`${where}: a la foto ${name} le falta "alt" (una descripción de lo que se ve)`)
      return
    }
    if (photo.zoom !== undefined && !(typeof photo.zoom === 'number' && photo.zoom >= 1 && photo.zoom <= 1.5)) {
      errors.push(`${where}: el "zoom" de la foto ${name} debe ser un número entre 1 y 1.5, sin comillas (ej: 1.1)`)
      return
    }
    valid.push(photo)
  })
  // Fotos en la carpeta que no aparecen en info.json: no es un error, pero conviene saberlo
  const listed = new Set(photos.map((p) => p?.archivo))
  readdirSync(folder)
    .filter((f) => IMAGE_EXTENSIONS.includes(parse(f).ext.toLowerCase()) && !listed.has(f))
    .forEach((f) => warnings.push(`${where}: la foto ${f} está en la carpeta pero no en info.json, no se publicará`))
  return valid
}

// Genera las versiones de una foto en outDir y devuelve sus datos para la web
async function processPhoto(folder, photo, outDir, publicBase, expected) {
  const source = join(folder, photo.archivo)
  const name = parse(photo.archivo).name
  if (photo.reuse) {
    photo.reuse.widths.forEach((w) => Object.keys(FORMATS).forEach((ext) => expected.add(`${name}-${w}.${ext}`)))
    unchanged++
    const { foco, focoMovil, focoTablet, zoom, ...data } = photo.reuse
    return {
      ...data,
      alt: photo.alt.trim(),
      ...(photo.foco ? { foco: photo.foco } : {}),
      ...(photo.focoMovil ? { focoMovil: photo.focoMovil } : {}),
      ...(photo.focoTablet ? { focoTablet: photo.focoTablet } : {}),
      ...(photo.zoom ? { zoom: photo.zoom } : {}),
    }
  }
  const image = sharp(source).rotate() // respeta la orientación de la cámara
  const { width, height } = await image.metadata().then((m) =>
    (m.orientation ?? 1) >= 5 ? { width: m.height, height: m.width } : m,
  )
  const widths = WIDTHS.filter((w) => w <= width)
  if (widths.length === 0) widths.push(width)
  if (width < 1600) warnings.push(`${rel(source)}: mide ${width} px de ancho; se recomiendan 3000 px`)

  // Huella del original (peso y fecha): si cambia en cualquier sentido, se rehace todo.
  // Comparar solo fechas fallaba con fotos reemplazadas por otras más antiguas.
  const { size, mtimeMs } = statSync(source)
  const origen = `${size}-${Math.round(mtimeMs)}`
  const same = previous.get(`${publicBase}/${name}`)?.origen === origen
  const jobs = []
  for (const w of widths) {
    for (const [ext, encode] of Object.entries(FORMATS)) {
      const file = `${name}-${w}.${ext}`
      expected.add(file)
      const target = join(outDir, file)
      if (same && existsSync(target)) continue
      jobs.push(encode(sharp(source).rotate().resize({ width: w })).toFile(target))
    }
  }
  if (jobs.length) {
    await Promise.all(jobs)
    created++
  } else {
    unchanged++
  }

  // Color promedio: se muestra de fondo mientras carga la foto
  const { dominant } = await sharp(source).resize(32).stats()
  const color = '#' + [dominant.r, dominant.g, dominant.b].map((c) => c.toString(16).padStart(2, '0')).join('')

  return {
    src: `${publicBase}/${name}`,
    origen,
    width,
    height: Math.round(height),
    widths,
    alt: photo.alt.trim(),
    ...(photo.foco ? { foco: photo.foco } : {}),
    ...(photo.focoMovil ? { focoMovil: photo.focoMovil } : {}),
    ...(photo.focoTablet ? { focoTablet: photo.focoTablet } : {}),
    ...(photo.zoom ? { zoom: photo.zoom } : {}),
    color,
  }
}

// Borra de outDir los archivos que ya no corresponden a ninguna foto
function cleanDir(outDir, expected) {
  for (const file of readdirSync(outDir)) {
    if (!expected.has(file)) rmSync(join(outDir, file))
  }
}

async function processFolder(folder, photos, outDir, publicBase) {
  mkdirSync(outDir, { recursive: true })
  const expected = new Set()
  const result = []
  for (const photo of photos) result.push(await processPhoto(folder, photo, outDir, publicBase, expected))
  cleanDir(outDir, expected)
  return result
}

async function processHome() {
  const folder = join(CONTENT, 'inicio')
  if (!isDir(folder)) {
    errors.push('falta la carpeta content/inicio')
    return []
  }
  const info = readInfo(folder)
  if (!info) return []
  const photos = checkPhotos(folder, info.fotos, '/images/inicio')
  if (errors.length) return []
  console.log(`· Inicio (${photos.length} fotos)`)
  return processFolder(folder, photos, join(PUBLIC_IMAGES, 'inicio'), '/images/inicio')
}

function checkProject(folder, slug, info) {
  const where = rel(folder)
  const before = errors.length
  if (!SLUG.test(slug)) {
    errors.push(`${where}: el nombre de la carpeta debe ir en minúsculas, sin tildes ni espacios, con guiones (ej: casa-los-robles)`)
  }
  for (const field of ['titulo', 'lugar', 'arquitecto']) {
    if (typeof info[field] !== 'string' || !info[field].trim()) errors.push(`${where}: falta "${field}"`)
  }
  if (!Number.isInteger(info['año']) || info['año'] < 1900 || info['año'] > 2100) {
    errors.push(`${where}: "año" debe ser un número, sin comillas (ej: 2025)`)
  }
  if (!toIsoDate(info.publicado)) {
    errors.push(`${where}: "publicado" debe ser una fecha con formato DD-MM-AAAA (ej: 15-03-2026)`)
  }
  if (info.ficha !== undefined && (typeof info.ficha !== 'object' || Array.isArray(info.ficha))) {
    errors.push(`${where}: "ficha" debe ser una lista de pares, ej: { "Superficie": "280 m²" }`)
  }
  const photos = checkPhotos(folder, info.fotos, `/images/proyectos/${slug}`)
  const cover = info.portada ?? photos[0]?.archivo
  if (photos.length && !photos.some((p) => p.archivo === cover)) {
    errors.push(`${where}: la portada ${cover} no está en la lista de fotos`)
  }
  return errors.length === before ? { photos, cover } : null
}

async function processProjects() {
  const root = join(CONTENT, 'proyectos')
  if (!isDir(root)) {
    errors.push('falta la carpeta content/proyectos')
    return { categories: [], projects: [] }
  }

  // Primero se revisa todo; las fotos se procesan solo si no hay errores
  const pending = []
  const seen = new Map()
  for (const category of subdirs(root)) {
    if (!SLUG.test(category)) {
      errors.push(`content/proyectos/${category}: el nombre de la categoría debe ir en minúsculas, sin tildes ni espacios`)
      continue
    }
    for (const slug of subdirs(join(root, category))) {
      const folder = join(root, category, slug)
      if (seen.has(slug)) {
        errors.push(`${rel(folder)}: ya existe otro proyecto llamado "${slug}" (en ${seen.get(slug)}); los nombres no se pueden repetir`)
        continue
      }
      seen.set(slug, category)
      const info = readInfo(folder)
      if (!info) continue
      const checked = checkProject(folder, slug, info)
      if (checked) pending.push({ category, slug, folder, info, ...checked })
    }
  }
  if (errors.length) return { categories: [], projects: [] }

  const projects = []
  for (const { category, slug, folder, info, photos, cover } of pending) {
    console.log(`· ${category}/${slug} (${photos.length} fotos)`)
    const images = await processFolder(folder, photos, join(PUBLIC_IMAGES, 'proyectos', slug), `/images/proyectos/${slug}`)
    projects.push({
      slug,
      categoria: { slug: category, nombre: label(category) },
      titulo: info.titulo.trim(),
      año: info['año'],
      lugar: info.lugar.trim(),
      arquitecto: info.arquitecto.trim(),
      publicado: toIsoDate(info.publicado),
      ficha: info.ficha ?? {},
      portada: images[photos.findIndex((p) => p.archivo === cover)],
      fotos: images,
    })
  }

  // Borra las carpetas de proyectos que ya no existen
  const projectsDir = join(PUBLIC_IMAGES, 'proyectos')
  if (isDir(projectsDir)) {
    for (const dir of subdirs(projectsDir)) if (!seen.has(dir)) rmSync(join(projectsDir, dir), { recursive: true })
  }

  // Del más reciente al más antiguo: el primero es el "último proyecto"
  projects.sort((a, b) => b.publicado.localeCompare(a.publicado))
  const categories = [...new Set(projects.map((p) => p.categoria.slug))]
    .sort()
    .map((slug) => ({ slug, nombre: label(slug) }))
  return { categories, projects }
}

const start = Date.now()
console.log('Procesando contenido…\n')
const inicio = await processHome()
const { categories, projects } = errors.length ? { categories: [], projects: [] } : await processProjects()

if (warnings.length) {
  console.log('\nAvisos:')
  warnings.forEach((w) => console.log(`  ! ${w}`))
}

if (errors.length) {
  console.error('\nHay errores; no se actualizó la web. Corrígelos y vuelve a ejecutar npm run fotos:')
  errors.forEach((e) => console.error(`  ✗ ${e}`))
  process.exit(1)
}

writeFileSync(OUTPUT_JSON, JSON.stringify({ inicio, categorias: categories, proyectos: projects }, null, 2) + '\n')
const seconds = ((Date.now() - start) / 1000).toFixed(1)
console.log(`\n✓ Listo en ${seconds} s: ${projects.length} proyectos, ${created} fotos nuevas o modificadas, ${unchanged} sin cambios.`)
