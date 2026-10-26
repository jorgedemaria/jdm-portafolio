# jorge de maría · portafolio

Portafolio de fotografía de arquitectura. Vue 3 + Vite + Tailwind v4, publicado en Vercel.

## Lógica de diseño: diseño suizo

Todo el sitio (navbar, Inicio, Registros, detalle, Sobre mí, contacto, pie, 404, lightbox) sigue
estas reglas. Cualquier elemento nuevo o cambio se resuelve dentro de ellas; si algo no calza, se
corrige la pieza, no la regla.

### Retícula de 6 columnas

- El contenido va en la caja `.page` (máx. 1440 px; margen 16 px, 48 px desde 1280 px).
- Desde 768 px la caja se divide en **6 columnas iguales con gutter** (`md:grid-cols-6
  md:gap-x-6 lg:gap-x-10`: 24 px, 40 px desde 1024 px). Los tercios son pares de columnas: 1–2, 3–4,
  5–6. Todas las columnas tienen el mismo ancho útil; el espacio va solo entre columnas, nunca dentro
  de ellas ni después de la última.
- Las subgrillas repiten el mismo gutter (ej. una tarjeta de 4 columnas en dos mitades: `grid-cols-2`
  con el mismo `gap-x`), así sus bordes caen en las líneas de columna.
- Todo bloque empieza en una línea de columna y abarca columnas enteras (`md:grid-cols-6`,
  `col-span-*`, `col-start-*`). Nada se centra "a ojo" ni se corre con márgenes sueltos.
- En el teléfono (menos de 768 px) hay una sola columna.
- Con la tecla **G** (solo en desarrollo) se ve la retícula: columnas, aire y filas.

### Grilla de líneas base (8 px)

- Todos los interlineados y espacios verticales son **múltiplos de 8 px** (en Tailwind, pasos pares:
  `2`, `4`, `6`, `8`, `10`, `12`, `16`…). Las únicas excepciones son las áreas para tocar que se
  compensan a sí mismas (`py-[7px] -my-[7px]`).
- Los textos de una misma fila **comparten línea base aunque estén en columnas distintas**: un
  título a la izquierda y el dato de la derecha caen en la misma línea. En grillas se usa
  `items-baseline`; entre bloques sueltos se mide (ver `alignNav` en `ProjectsView.vue`).

### Tipografía: una familia, pocos tamaños

- Una sola familia, **Switzer**; la jerarquía la dan el peso y el tamaño. Texto 400, títulos 600,
  logo y correo de contacto 700.
- Solo estos tamaños (tokens de `main.css`), nada intermedio:

  | Token | Tamaño / interlineado | Uso |
  | --- | --- | --- |
  | `text-boton` (`text-cuerpo-sm`, `text-etiqueta`) | 13 / 24 | menú, fichas, pie, categorías, contadores |
  | `text-cuerpo` | 16 / 24 | texto y nombres de registros |
  | `text-h3` | 24 / 32 | logo en el teléfono |
  | `text-h1` | 40 / 40 | títulos de página |
  | display (fluido) | según el ancho | logo grande, nombre sobre la foto del detalle, correo de contacto |

- Ningún texto bajo 13 px.

### Color

- Paleta publicada "grafito y lima"; reparto "tinta y un acento": todo en tinta, el color solo en el
  logo, el correo y los subrayados. Se usan los papeles (`text-marca`, `text-ui`, `text-dato`,
  `text-titulo`, `decoration-linea`), nunca colores sueltos.

### Movimiento

- Persianas siempre verticales (suben o bajan), con la curva `--ease-persiana` (in-out quint).
- Los textos entran y salen escribiéndose (letras al azar) o borrándose. Todos, sin excepción:
  números, contadores y datos también.

## Trabajo

- Respuestas en español; los términos técnicos quedan en inglés.
- Commit y push solo cuando se pide. Nunca subir `.agents/`, `.claude/` ni `skills-lock.json`.
