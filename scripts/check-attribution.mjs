#!/usr/bin/env node
// scripts/check-attribution.mjs — Gate R3 (HARD): atribución de fotos de archivo.
// Node >= 18, cero dependencias.
//
// Para cada `foto.src` en src/content/**/*.json verifica (GS-050):
//   (a) el archivo existe en src/assets/archive/,
//   (b) ATTRIBUTION.md tiene una ficha con medio, fecha, autor y licencia,
//   (c) foto.opacidad <= 0.35 (no compite con la legibilidad),
//   (d) nunca hotlink (src no puede ser una URL).
//
// Flags: --json (salida para CI). Exit 1 ante cualquier falta, 0 si limpio.
//
// En M0 no hay contenido con fotos: el gate pasa de forma trivial. El árbol
// queda listo para que el cambio #2 cuelgue fotos y fichas sin tocar el motor.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, dirname, extname, basename, isAbsolute, normalize } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const RAIZ = resolve(__dirname, '..')
export const ARCHIVE_DIR = join(RAIZ, 'src', 'assets', 'archive')
export const ATTRIBUTION_PATH = join(ARCHIVE_DIR, 'ATTRIBUTION.md')
export const CONTENT_DIR = join(RAIZ, 'src', 'content')

export const CAMPOS_REQUERIDOS = ['medio', 'fecha', 'autor', 'licencia']
export const OPACIDAD_MAX = 0.35

// ---------------------------------------------------------------------------
// Lectura de contenido: recolecta todos los objetos { src, opacidad, ... }
// con clave "foto" en cualquier JSON de src/content.
// ---------------------------------------------------------------------------

function recorreFotos(obj, fotos) {
  if (obj === null || typeof obj !== 'object') return
  if (Array.isArray(obj)) {
    obj.forEach((v) => recorreFotos(v, fotos))
    return
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'foto' && v && typeof v === 'object' && typeof v.src === 'string') {
      fotos.push(v)
    } else {
      recorreFotos(v, fotos)
    }
  }
}

export function recolectarFotos() {
  const fotos = []
  const caminar = (dir) => {
    let entradas
    try {
      entradas = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entradas) {
      const ruta = join(dir, e.name)
      if (e.isDirectory()) caminar(ruta)
      else if (extname(e.name).toLowerCase() === '.json') {
        try {
          recorreFotos(JSON.parse(readFileSync(ruta, 'utf8').replace(/^\uFEFF/, '')), fotos)
        } catch {
          // JSON inválido lo reporta validate-content; aquí solo atribución.
        }
      }
    }
  }
  if (existsSync(CONTENT_DIR)) caminar(CONTENT_DIR)
  return fotos
}

// ---------------------------------------------------------------------------
// ATTRIBUTION.md: ficha por archivo en formato de tabla markdown.
//   | Archivo | Medio | Fecha | Autor | Licencia | Estado |
// ---------------------------------------------------------------------------

export function parsearFichas(md) {
  const fichas = new Map()
  for (const linea of md.split(/\r?\n/)) {
    const trim = linea.trim()
    if (!trim.startsWith('|')) continue
    const celdas = trim.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
    if (celdas.length < 5) continue
    const [archivo, medio, fecha, autor, licencia] = celdas
    // Salta la fila de encabezado y el separador.
    if (/archivo/i.test(archivo) && /medio/i.test(medio)) continue
    if (/^:?-{2,}:?$/.test(medio)) continue
    if (!archivo) continue
    fichas.set(archivo, { medio, fecha, autor, licencia, estado: celdas[5] || '' })
  }
  return fichas
}

export function leerFichas() {
  if (!existsSync(ATTRIBUTION_PATH)) return null
  return parsearFichas(readFileSync(ATTRIBUTION_PATH, 'utf8'))
}

// ---------------------------------------------------------------------------
// Verificación de una foto
// ---------------------------------------------------------------------------

export function verificarFoto(foto, { fichas, archivoExiste }) {
  const errores = []

  // (d) Nunca hotlink: el archivo debe vivir en src/assets/archive/.
  if (/^https?:\/\//i.test(foto.src) || foto.src.startsWith('//')) {
    errores.push(`foto.src "${foto.src}" es una URL (hotlink prohibido): el archivo debe vivir en src/assets/archive/`)
  } else if (foto.src.includes('..') || isAbsolute(foto.src)) {
    errores.push(`foto.src "${foto.src}" no es una ruta relativa segura dentro de src/assets/archive/`)
  } else {
    const ruta = normalize(join(ARCHIVE_DIR, foto.src))
    if (!ruta.startsWith(normalize(ARCHIVE_DIR))) {
      errores.push(`foto.src "${foto.src}" escapa de src/assets/archive/`)
    } else if (!archivoExiste(foto.src)) {
      errores.push(`archivo "${foto.src}" no existe en src/assets/archive/`)
    }
  }

  // (b) Ficha completa en ATTRIBUTION.md.
  if (!fichas) {
    errores.push('falta src/assets/archive/ATTRIBUTION.md')
  } else {
    const ficha = fichas.get(basename(foto.src))
    if (!ficha) {
      errores.push(`sin ficha en ATTRIBUTION.md para "${basename(foto.src)}"`)
    } else {
      for (const campo of CAMPOS_REQUERIDOS) {
        if (!ficha[campo] || !String(ficha[campo]).trim()) {
          errores.push(`ficha de "${basename(foto.src)}" incompleta: falta ${campo}`)
        }
      }
    }
  }

  // (c) Opacidad respetuosa de la legibilidad.
  if (typeof foto.opacidad === 'number' && foto.opacidad > OPACIDAD_MAX) {
    errores.push(`opacidad ${foto.opacidad} > ${OPACIDAD_MAX} (recomendado para legibilidad)`)
  }

  return errores
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

export function main(argv = process.argv.slice(2)) {
  const json = argv.includes('--json')
  const fotos = recolectarFotos()
  const fichas = leerFichas()
  const fallos = []

  for (const foto of fotos) {
    const errores = verificarFoto(foto, {
      fichas,
      archivoExiste: (src) => existsSync(join(ARCHIVE_DIR, src)),
    })
    for (const e of errores) {
      fallos.push({ src: foto.src, error: e })
    }
  }

  const exit = fallos.length > 0 ? 1 : 0
  const resultado = { exit, fotos: fotos.length, fallos }

  if (json) {
    console.log(JSON.stringify(resultado, null, 2))
  } else if (fallos.length > 0) {
    console.error(`check-attribution: ${fallos.length} fallo(s) de atribución.`)
    for (const f of fallos) console.error(`  FALLO  ${f.src} — ${f.error}`)
  } else {
    console.log(`check-attribution OK: ${fotos.length} foto(s) revisada(s), todas con ficha completa.`)
  }
  return resultado
}

// CLI
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main().exit)
}
