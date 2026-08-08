// src/content/escenas.js — Índice de escenas jugables.
//
// El motor no conoce archivos: pide escenas por acto y por id. El árbol jugable
// es el banco de escenas del entregable C — 29 escenas: Táchira (T-01..T-09),
// Caracas (C-01..C-11) y Zulia (Z-01..Z-09).
//
// Los fixtures de src/content/fixtures/ NO entran aquí: son datos de prueba de
// los renderers y del motor, y siguen validándose por los mismos gates.
//
// Orden dentro de un acto: fechaIso ascendente y, a igualdad, id. Así la
// cronología del acto no depende del orden de los imports.

import tachira from './actos/acto-1-tachira.json'
import caracas from './actos/acto-2-caracas.json'
import zulia from './actos/acto-3-zulia.json'

export const ACTOS = [1, 2, 3]

function porCronologia(a, b) {
  const fa = a.fechaIso || ''
  const fb = b.fechaIso || ''
  if (fa !== fb) return fa < fb ? -1 : 1
  return String(a.id).localeCompare(String(b.id))
}

export const ESCENAS = [...tachira, ...caracas, ...zulia].sort(porCronologia)

/** Escenas de un acto, en orden cronológico. Array vacío si el acto no tiene. */
export function escenasDeActo(acto) {
  return ESCENAS.filter((e) => e.acto === acto).sort(porCronologia)
}

/** Escena por id, o null. */
export function escenaPorId(id) {
  return ESCENAS.find((e) => e.id === id) ?? null
}

/** Primera escena del acto, o null si el acto está vacío. */
export function primeraEscena(acto) {
  return escenasDeActo(acto)[0] ?? null
}

/**
 * Escena siguiente dentro del MISMO acto, o null si era la última (el shell
 * cierra el acto y resuelve el final). Un id desconocido devuelve null.
 */
export function siguienteEscena(acto, escenaId) {
  const lista = escenasDeActo(acto)
  const i = lista.findIndex((e) => e.id === escenaId)
  if (i < 0) return null
  return lista[i + 1] ?? null
}

/** Actos con al menos una escena jugable (el cambio #1 los tiene los tres). */
export function actosJugables() {
  return ACTOS.filter((a) => escenasDeActo(a).length > 0)
}

/** Acto jugable siguiente, o null si el acto recibido era el último. */
export function siguienteActo(acto) {
  const lista = actosJugables()
  const i = lista.indexOf(acto)
  if (i < 0) return null
  return lista[i + 1] ?? null
}
