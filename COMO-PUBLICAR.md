# Cómo publicar en el portafolio

Guía rápida para agregar proyectos, cambiar las fotos de Inicio y publicar la web.

## Resumen

```
1. Exportar fotos (JPG, 3000 px)  →  2. Carpeta + info.json  →  3. npm run fotos
→  4. Revisar con npm run dev    →  5. git add / commit / push  →  6. Netlify publica solo
```

---

## Agregar un proyecto nuevo

### 1. Exporta las fotos

Desde Lightroom (o el programa que uses):

- **Formato:** JPG
- **Tamaño:** 3000 px en el lado largo
- **Calidad:** 85–90
- **Nombres:** `01.jpg`, `02.jpg`, `03.jpg`… en el orden en que quieres que aparezcan

Tus originales de cámara no se suben a la web: tu archivo de fotos de siempre sigue siendo el respaldo.

### 2. Crea la carpeta del proyecto

Dentro de `content/proyectos/`, en la carpeta de su categoría:

```
content/proyectos/
├── casas/
│   └── casa-los-robles/      ← carpeta nueva
│       ├── info.json
│       ├── 01.jpg
│       └── 02.jpg
├── edificios/
└── urbanos/
```

- El **nombre de la carpeta** es la dirección del proyecto: `casa-los-robles` → `tusitio.com/proyectos/casa-los-robles`.
  Usa minúsculas, sin tildes ni espacios, con guiones.
- La **categoría** es la carpeta donde lo pones. Para una categoría nueva (por ejemplo `industrial`), crea esa carpeta: aparece sola en el filtro de Proyectos.

### 3. Escribe el `info.json`

Lo más fácil es copiar el `info.json` de otro proyecto y cambiar los datos:

```json
{
  "titulo": "Casa Los Robles",
  "año": 2026,
  "lugar": "Santiago, Chile",
  "arquitecto": "Estudio Ejemplo",
  "publicado": "15-03-2026",
  "portada": "01.jpg",
  "fotos": [
    { "archivo": "01.jpg", "alt": "Fachada norte de hormigón al atardecer" },
    { "archivo": "02.jpg", "alt": "Escalera interior con luz cenital" }
  ]
}
```

| Campo | Qué es |
|---|---|
| `titulo`, `lugar`, `arquitecto` | Texto, entre comillas |
| `año` | Número, **sin comillas** |
| `publicado` | Fecha en formato `DD-MM-AAAA` (día-mes-año). **Los 3 proyectos con la fecha más reciente salen en "últimos trabajos" de Inicio** |
| `portada` | La foto que se ve en el listado de proyectos |
| `fotos` | El orden de la galería. Cada foto lleva `alt`: una descripción de lo que se ve (para lectores de pantalla y Google) |

En la galería, las fotos horizontales van a todo el ancho y las verticales seguidas se ponen de a dos.

### 4. Procesa las fotos y revisa

En la terminal de VS Code (menú **Terminal → New Terminal**):

```bash
npm run fotos
npm run dev
```

- `npm run fotos` genera las versiones optimizadas. Si algo está mal te dice exactamente qué y en qué proyecto; corrígelo y vuelve a ejecutarlo.
- `npm run dev` abre la web en tu computador (normalmente en `http://localhost:5173`). Revisa que todo se vea bien. Para detenerlo: `Ctrl + C`.

### 5. Publica

```bash
git add .
git commit -m "Nuevo proyecto: Casa Los Robles"
git push
```

En un minuto aproximadamente Netlify publica la web. Si algo falla, Netlify mantiene la versión anterior: la web nunca queda rota.

> También puedes hacerlo con botones: en VS Code, panel **Source Control** (el ícono de ramas), escribe el mensaje, **Commit** y luego **Sync Changes**.

---

## Cambiar las fotos de Inicio (el stack)

Están en `content/inicio/`. Reemplaza las fotos y edita `content/inicio/info.json`:

```json
{
  "fotos": [
    { "archivo": "01.jpg", "alt": "Descripción de la foto" },
    { "archivo": "02.jpg", "alt": "…", "foco": "50% 30%" }
  ]
}
```

- Se muestran a pantalla completa, así que se recortan. **`foco`** (opcional) indica qué punto de la foto no se debe recortar: `"50% 30%"` = centrada en horizontal, a un 30 % desde arriba.
- Después: `npm run fotos`, revisar y publicar igual que un proyecto.

## Editar o quitar un proyecto

- **Editar textos:** cambia el `info.json`, `npm run fotos`, publica.
- **Reemplazar una foto:** pon la nueva con el mismo nombre, `npm run fotos`, publica.
- **Quitar un proyecto:** borra su carpeta, `npm run fotos` (borra también sus fotos optimizadas), publica.

---

## Configuración inicial (una sola vez)

### Subir el proyecto a GitHub

1. Crea una cuenta en [github.com](https://github.com) si no tienes.
2. En VS Code, abre el panel **Source Control** y pulsa **Publish Branch** (o **Publish to GitHub**).
3. Inicia sesión con GitHub cuando lo pida y elige **repositorio privado**.

### Conectar Netlify

1. Crea una cuenta en [netlify.com](https://www.netlify.com) entrando con tu cuenta de GitHub.
2. **Add new site → Import an existing project → GitHub** y elige el repositorio `jdm-portfolio`.
3. Netlify lee la configuración del archivo `netlify.toml`: no hay que cambiar nada. Pulsa **Deploy**.
4. Te da una dirección tipo `nombre-al-azar.netlify.app`. En **Domain management** puedes cambiarla o conectar tu propio dominio.

Desde ahí, cada `git push` publica la web automáticamente.

---

## Si algo sale mal

| Mensaje | Qué hacer |
|---|---|
| `no es un JSON válido` | Falta o sobra una coma, comilla o llave en `info.json`. La última línea de cada lista va **sin** coma |
| `"año" debe ser un número` | Quita las comillas: `2026`, no `"2026"` |
| `la foto 04.jpg está en info.json pero no en la carpeta` | El nombre no coincide (ojo con `.jpg` / `.JPG`) o falta copiar la foto |
| `la foto 05.jpg está en la carpeta pero no en info.json` | Es solo un aviso: esa foto no se publicará hasta que la agregues a la lista |
| `npm: command not found` | Falta instalar Node.js desde [nodejs.org](https://nodejs.org) |
| Proyecto nuevo en otro computador | `npm install` una vez. Los proyectos antiguos funcionan sin sus originales; solo necesitas los de los proyectos nuevos |
