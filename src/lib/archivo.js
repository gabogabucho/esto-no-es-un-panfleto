// src/lib/archivo.js — Resolución de las fotos de archivo (R3 / GS-050).
//
// Las fotos viven en src/assets/archive/ y Vite las empaqueta con hash. Este
// módulo traduce el `foto.src` de una escena a la URL final del build. Nunca
// resuelve una URL remota: el hotlink está prohibido y el gate
// scripts/check-attribution.mjs ya lo verifica en CI, pero el runtime tampoco
// lo permite.
//
// Con el directorio vacío el mapa queda vacío y urlDeArchivo() devuelve null:
// las escenas sin foto verificada se pintan con tokens visuales, que es
// exactamente la prioridad (c) de R3.

const MODULOS = import.meta.glob('../assets/archive/**/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const POR_NOMBRE = new Map()
for (const [ruta, url] of Object.entries(MODULOS)) {
  POR_NOMBRE.set(ruta.replace(/^.*\/assets\/archive\//, ''), url)
}

/** Nombres de archivo disponibles, relativos a src/assets/archive/. */
export function archivosDisponibles() {
  return [...POR_NOMBRE.keys()].sort()
}

/** URL empaquetada de una foto de archivo, o null si no existe o es remota. */
export function urlDeArchivo(src) {
  if (typeof src !== 'string' || src.trim() === '') return null
  if (/^[a-z]+:\/\//i.test(src) || src.startsWith('//')) return null // nunca hotlink
  const limpio = src
    .replace(/^\.?\/+/, '')
    .replace(/^src\/assets\/archive\//, '')
    .replace(/^assets\/archive\//, '')
  return POR_NOMBRE.get(limpio) ?? null
}

// ---------------------------------------------------------------------------
// Ilustración propia (src/assets/ilustracion/)
//
// Mismo mecanismo, directorio distinto y regla distinta: la ilustración es obra
// del proyecto, no material de terceros, así que no pasa por el gate de
// atribución de prensa. Su ficha vive en ILUSTRACION.md y declara el prompt.
//
// Los archivos se guardan en ESCALA DE GRISES a propósito: el color lo pone el
// CSS con los tokens del acto, así las 29 escenas comparten paleta exacta y un
// cambio de paleta no obliga a regenerar una sola imagen.
// ---------------------------------------------------------------------------

const ILUSTRACIONES = import.meta.glob('../assets/ilustracion/**/*.{webp,avif,png}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const ILUSTRACION_POR_NOMBRE = new Map()
for (const [ruta, url] of Object.entries(ILUSTRACIONES)) {
  ILUSTRACION_POR_NOMBRE.set(ruta.replace(/^.*\/assets\/ilustracion\//, ''), url)
}

/** Nombres disponibles, relativos a src/assets/ilustracion/. */
export function ilustracionesDisponibles() {
  return [...ILUSTRACION_POR_NOMBRE.keys()].sort()
}

/** URL empaquetada de una capa de ilustración, o null si no existe. */
export function urlDeIlustracion(src) {
  if (typeof src !== 'string' || src.trim() === '') return null
  if (/^[a-z]+:\/\//i.test(src) || src.startsWith('//')) return null
  const limpio = src
    .replace(/^\.?\/+/, '')
    .replace(/^src\/assets\/ilustracion\//, '')
    .replace(/^assets\/ilustracion\//, '')
  return ILUSTRACION_POR_NOMBRE.get(limpio) ?? null
}
