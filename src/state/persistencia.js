// src/state/persistencia.js — Persistencia de sesión (T-040). Sin DOM: el
// almacén se inyecta (localStorage por defecto) para poder testear sin
// navegador.
//
// UNA sola clave versionada: enp-save-v1. Si el JSON está roto, la versión no
// coincide o la forma del estado no valida, cargar() devuelve null y borra el
// guardado: el shell arranca partida nueva. Nunca lanza y nunca deja al
// jugador atrapado en un guardado corrupto.
//
// API: almacenLocal(), guardar(sesion, almacen), cargar(almacen),
//      borrar(almacen), hayGuardado(almacen), esSesionValida(datos),
//      esEstadoValido(estado).

import { EJES } from './stats.js'
import { ITEMS } from './inventory.js'

export const CLAVE_GUARDADO = 'enp-save-v1'
export const VERSION_GUARDADO = 1

// Clave aparte, y a propósito: «ya viste el cierre una vez» no es parte de la
// partida. Sobrevive a empezar de nuevo, porque es lo que habilita saltar el
// cierre (entregable H §7) y nadie debería tener que verlo dos veces enteras
// para recuperar ese permiso.
export const CLAVE_CIERRE = 'enp-cierre-visto-v1'

// Conteo de partidas, para medir el juego una vez desplegado. Es local a este
// navegador, discreto, y no participa del guardado de sesión: sobrevive a
// borrar el save. Guarda { iniciadas, completadas } como JSON.
export const CLAVE_CONTEO = 'enp-conteo-v1'

const ACTOS_VALIDOS = [1, 2, 3]

/**
 * localStorage utilizable, o null. No basta con que exista: Safari en modo
 * privado y los iframes sin permiso lanzan al escribir, no al leer, así que
 * se prueba con una sonda que se borra en el acto.
 */
export function almacenLocal() {
  try {
    const almacen = globalThis.localStorage
    if (!almacen) return null
    const sonda = `${CLAVE_GUARDADO}--sonda`
    almacen.setItem(sonda, '1')
    almacen.removeItem(sonda)
    return almacen
  } catch {
    return null
  }
}

function tieneNumeros(obj, claves) {
  if (!obj || typeof obj !== 'object') return false
  return claves.every((k) => Number.isFinite(obj[k]))
}

/** Forma mínima del estado de sesión de game-state.js (GS-010..GS-017). */
export function esEstadoValido(estado) {
  if (!estado || typeof estado !== 'object') return false
  if (!tieneNumeros(estado.stats, EJES)) return false
  if (!tieneNumeros(estado.inventario, ITEMS)) return false
  if (!estado.flags || typeof estado.flags !== 'object') return false
  if (!Array.isArray(estado.historial)) return false
  if (!Number.isFinite(estado.ppBajaSostenida)) return false
  return true
}

/** Forma mínima de la sesión guardada (la que reanuda el shell). */
export function esSesionValida(datos) {
  if (!datos || typeof datos !== 'object') return false
  if (datos.version !== VERSION_GUARDADO) return false
  if (typeof datos.pantalla !== 'string' || datos.pantalla.trim() === '') return false
  if (datos.acto != null && !ACTOS_VALIDOS.includes(datos.acto)) return false
  if (datos.escenaId != null && typeof datos.escenaId !== 'string') return false
  if (!Array.isArray(datos.finales)) return false
  if (!Array.isArray(datos.jugados)) return false
  if (datos.materiales != null && !Array.isArray(datos.materiales)) return false
  if (!Number.isFinite(datos.grupoIdx)) return false
  if (datos.revelados != null && !Number.isFinite(datos.revelados)) return false
  if (datos.consecuencias != null && !Array.isArray(datos.consecuencias)) return false
  if (datos.estado != null && !esEstadoValido(datos.estado)) return false
  return true
}

/**
 * Guarda la sesión. Devuelve true si quedó escrita; false si no hay almacén o
 * si la cuota está llena (el juego sigue, solo se pierde el resume).
 */
export function guardar(sesion, almacen = almacenLocal()) {
  if (!almacen || !sesion || typeof sesion !== 'object') return false
  const carga = {
    ...sesion,
    version: VERSION_GUARDADO,
    actualizado: new Date().toISOString(),
  }
  try {
    almacen.setItem(CLAVE_GUARDADO, JSON.stringify(carga))
    return true
  } catch {
    return false
  }
}

/** Sesión guardada válida, o null. Un guardado inválido se borra al leerlo. */
export function cargar(almacen = almacenLocal()) {
  if (!almacen) return null
  let crudo
  try {
    crudo = almacen.getItem(CLAVE_GUARDADO)
  } catch {
    return null
  }
  if (!crudo) return null

  let datos
  try {
    datos = JSON.parse(crudo)
  } catch {
    borrar(almacen)
    return null
  }
  if (!esSesionValida(datos)) {
    borrar(almacen)
    return null
  }
  return datos
}

/** Borra el guardado. Devuelve true si el almacén aceptó la operación. */
export function borrar(almacen = almacenLocal()) {
  if (!almacen) return false
  try {
    almacen.removeItem(CLAVE_GUARDADO)
    return true
  } catch {
    return false
  }
}

/** true si hay una partida reanudable (guardado presente y válido). */
export function hayGuardado(almacen = almacenLocal()) {
  return cargar(almacen) !== null
}

/** Deja constancia de que el cierre ya se vio entero al menos una vez. */
export function marcarCierreVisto(almacen = almacenLocal()) {
  if (!almacen) return false
  try {
    almacen.setItem(CLAVE_CIERRE, '1')
    return true
  } catch {
    return false
  }
}

/** true si el jugador ya vio el cierre completo alguna vez (habilita saltarlo). */
export function cierreVisto(almacen = almacenLocal()) {
  if (!almacen) return false
  try {
    return almacen.getItem(CLAVE_CIERRE) === '1'
  } catch {
    return false
  }
}

function leerConteoCrudo(almacen) {
  if (!almacen) return { iniciadas: 0, completadas: 0 }
  try {
    const crudo = almacen.getItem(CLAVE_CONTEO)
    const datos = crudo ? JSON.parse(crudo) : {}
    return {
      iniciadas: Number.isFinite(datos.iniciadas) ? datos.iniciadas : 0,
      completadas: Number.isFinite(datos.completadas) ? datos.completadas : 0,
    }
  } catch {
    return { iniciadas: 0, completadas: 0 }
  }
}

/**
 * Cuántas veces se empezó y se completó el juego en este navegador.
 * Devuelve { iniciadas, completadas }. Nunca lanza.
 */
export function leerConteo(almacen = almacenLocal()) {
  return leerConteoCrudo(almacen)
}

function escribirConteo(almacen, datos) {
  if (!almacen) return false
  try {
    almacen.setItem(CLAVE_CONTEO, JSON.stringify(datos))
    return true
  } catch {
    return false
  }
}

/** Registra una partida iniciada (empezar de nuevo). */
export function contarPartidaIniciada(almacen = almacenLocal()) {
  const c = leerConteoCrudo(almacen)
  return escribirConteo(almacen, { ...c, iniciadas: c.iniciadas + 1 })
}

/** Registra una partida completada (llegar a los créditos). */
export function contarPartidaCompletada(almacen = almacenLocal()) {
  const c = leerConteoCrudo(almacen)
  return escribirConteo(almacen, { ...c, completadas: c.completadas + 1 })
}
