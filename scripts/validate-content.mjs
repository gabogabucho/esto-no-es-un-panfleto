#!/usr/bin/env node
// scripts/validate-content.mjs — Gate de validación de contenido (GS-060).
// Node >= 18. Valida TODO JSON bajo src/content/ contra
// src/content/schema/scene.schema.json con Ajv (JSON Schema draft-07).
//
// Además del schema añade checks extra (GS-060):
//   - id de escena único por acto
//   - id de grupo único dentro de cada escena
// (2-4 opciones por grupo, deltas solo sobre ejes válidos, tipos de bloque y
// campos permitidos quedan garantizados por el propio schema.)
//
// Flags: --json (salida para CI). Exit 1 ante cualquier error, 0 si limpio.

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, resolve, dirname, extname, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import Ajv from 'ajv'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const RAIZ = resolve(__dirname, '..')
export const CONTENT_DIR = join(RAIZ, 'src', 'content')
export const SCHEMA_PATH = join(CONTENT_DIR, 'schema', 'scene.schema.json')

// Contrato raíz de una escena (espejo de "required" en el schema).
export const CAMPOS_OBLIGATORIOS = ['id', 'acto', 'modo', 'fecha', 'lugar', 'bloques', 'grupos']

let _validar = null

// Compila el schema UNA vez (módulo importable para tests).
export function crearValidador() {
  if (_validar) return _validar
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8').replace(/^\uFEFF/, ''))
  const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false })
  _validar = ajv.compile(schema)
  return _validar
}

export function cargarArchivos() {
  const archivos = []
  const caminar = (dir) => {
    let entradas
    try {
      entradas = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entradas) {
      // El propio schema no es contenido: se excluye de la validación.
      if (e.isDirectory() && e.name === 'schema') continue
      const ruta = join(dir, e.name)
      if (e.isDirectory()) caminar(ruta)
      else if (extname(e.name).toLowerCase() === '.json') archivos.push(ruta)
    }
  }
  if (existsSync(CONTENT_DIR)) caminar(CONTENT_DIR)
  return archivos.sort()
}

// Mensaje humano a partir de un error de Ajv.
export function formatoError(e) {
  const ruta = e.instancePath ? e.instancePath.split('/').filter(Boolean).join('.') : '(raíz)'
  const p = e.params || {}
  let msg = e.message || 'inválido'
  if (p.allowedValues) msg += ` — valores permitidos: ${p.allowedValues.join(', ')}`
  if (p.additionalProperty) msg += ` — propiedad no permitida: "${p.additionalProperty}"`
  if (p.missingProperty) msg += ` — falta la propiedad requerida "${p.missingProperty}"`
  if (p.pattern) msg += ` — patrón requerido: ${p.pattern}`
  if (p.minItems !== undefined) msg += ` — mínimo ${p.minItems} ítem(s)`
  if (p.maxItems !== undefined) msg += ` — máximo ${p.maxItems} ítem(s)`
  if (p.limit !== undefined) msg += ` — límite ${p.limit}`
  return `${ruta} ${msg}`
}

function campoDe(e) {
  let campo = e.instancePath ? e.instancePath.split('/').filter(Boolean).join('.') : '(raíz)'
  if (e.params && e.params.missingProperty) {
    campo = campo === '(raíz)' ? e.params.missingProperty : `${campo}.${e.params.missingProperty}`
  }
  return campo
}

// M1: validación completa con Ajv contra scene.schema.json + checks extra.
// JSON que no es escena (actos.json, roles.json, ...) no se valida contra el
// schema: solo las escenas (objetos con "bloques") son contrato GS-001.
export function validarDatos(datos, rel) {
  const errores = []
  const lista = Array.isArray(datos) ? datos : [datos]
  for (const item of lista) {
    if (!item || typeof item !== 'object') continue
    if (!Array.isArray(item.bloques)) continue // no es escena
    const validar = crearValidador()
    if (!validar(item)) {
      for (const e of validar.errors) {
        errores.push({
          archivo: rel,
          campo: campoDe(e),
          error: `escena "${item.id || '?'}" » ${formatoError(e)}`,
        })
      }
    }
    // Check extra: id de grupo único dentro de la escena (GS-002).
    if (Array.isArray(item.grupos)) {
      const vistos = new Set()
      for (const g of item.grupos) {
        if (g && typeof g.id === 'string') {
          if (vistos.has(g.id)) {
            errores.push({ archivo: rel, campo: 'grupos', error: `escena "${item.id}" con id de grupo duplicado: "${g.id}"` })
          }
          vistos.add(g.id)
        }
      }
    }
  }
  return errores
}

// Check extra: id de escena único por acto (GS-060). Recorre todos los
// archivos para tener el mapa completo antes de reportar.
export function idsUnicosPorActo(archivos) {
  const porActo = new Map() // acto -> Map(id -> primer archivo)
  const errores = []
  for (const ruta of archivos) {
    const rel = relative(RAIZ, ruta).split('\\').join('/')
    let datos
    try {
      // Se tolera BOM (UTF-8) por robustez en Windows.
      datos = JSON.parse(readFileSync(ruta, 'utf8').replace(/^\uFEFF/, ''))
    } catch {
      continue // JSON inválido lo reporta validarArchivo
    }
    const lista = Array.isArray(datos) ? datos : [datos]
    for (const item of lista) {
      if (!item || typeof item !== 'object' || !Array.isArray(item.bloques)) continue
      if (typeof item.id !== 'string' || item.id === '') continue
      const acto = item.acto
      if (!porActo.has(acto)) porActo.set(acto, new Map())
      const mapa = porActo.get(acto)
      if (mapa.has(item.id)) {
        errores.push({
          archivo: rel,
          campo: 'id',
          error: `escena "${item.id}" duplicada en el acto ${acto}: también está en ${mapa.get(item.id)}`,
        })
      } else {
        mapa.set(item.id, rel)
      }
    }
  }
  return errores
}

export function validarArchivo(ruta) {
  const rel = relative(RAIZ, ruta).split('\\').join('/')
  let datos
  try {
    // Se tolera BOM (UTF-8) por robustez en Windows.
    datos = JSON.parse(readFileSync(ruta, 'utf8').replace(/^\uFEFF/, ''))
  } catch (e) {
    return [{ archivo: rel, campo: '(archivo)', error: `JSON inválido: ${e.message}` }]
  }
  return validarDatos(datos, rel)
}

export function main(argv = process.argv.slice(2)) {
  const json = argv.includes('--json')
  const archivos = cargarArchivos()
  const errores = []
  for (const ruta of archivos) {
    errores.push(...validarArchivo(ruta))
  }
  errores.push(...idsUnicosPorActo(archivos))
  const exit = errores.length > 0 ? 1 : 0
  const resultado = { exit, archivos: archivos.length, errores }

  if (json) {
    console.log(JSON.stringify(resultado, null, 2))
  } else if (errores.length > 0) {
    console.error(`validate-content: ${errores.length} error(es) en ${archivos.length} archivo(s).`)
    for (const e of errores) {
      console.error(`  FALLO  ${e.archivo} > ${e.campo} > ${e.error}`)
    }
  } else {
    console.log(`validate-content OK: ${archivos.length} archivo(s) JSON válido(s) contra scene.schema.json.`)
  }
  return resultado
}

// CLI
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main().exit)
}
