// src/state/endings.js — Matriz de finales por acto (GS-015). Puro, sin DOM.
// Resuelve en orden ESTRICTO de prioridad leyendo src/content/finales.json
// (umbrales configurables por acto). Sin final "correcto": tono honesto.

import finalesData from '../content/finales.json'
import { EJES } from './stats.js'

// Orden de prioridad 1..6 (design §5, spec GS-015).
export const FINALES = [
  'detencion-exilio', // 1 RI alto + CF bajo
  'voz-internacional', // 2 RI alto + RE alta + PP alta
  'organizacion-perdura', // 3 CO+RE+CF altos, RI moderado
  'repliegue-silencioso', // 4 todo bajo
  'emigracion', // 5 PP baja sostenida + flag pasaporte
  'memoria-activa', // 6 fallback
]

export function configActo(acto, finales = finalesData) {
  return finales?.actos?.[String(acto)] || finales?.actos?.[acto] || finales || {}
}

function cumpleDetencion(stats, u) {
  return stats.RI >= u.RI && stats.CF <= u.CF
}

function cumpleVoz(stats, u) {
  return stats.RI >= u.RI && stats.RE >= u.RE && stats.PP >= u.PP
}

function cumpleOrganizacion(stats, u) {
  return (
    stats.CO >= u.CO &&
    stats.RE >= u.RE &&
    stats.CF >= u.CF &&
    stats.RI >= u.RImin &&
    stats.RI <= u.RImax
  )
}

function cumpleRepliegue(stats, u) {
  return EJES.every((eje) => stats[eje] <= u.todos)
}

function cumpleEmigracion(estado, u) {
  return estado.ppBajaSostenida >= u.ppBaja && estado.flags?.pasaporte === true
}

function cumpleMemoria(stats, u) {
  const min = Math.min(...EJES.map((eje) => stats[eje]))
  const ningunBajo = EJES.every((eje) => stats[eje] > u.noMenor)
  return min >= u.min && ningunBajo
}

function cumpleFinal(id, f, estado) {
  const u = f.umbrales || {}
  const stats = estado.stats || {}
  switch (id) {
    case 'detencion-exilio':
      return cumpleDetencion(stats, u)
    case 'voz-internacional':
      return cumpleVoz(stats, u)
    case 'organizacion-perdura':
      return cumpleOrganizacion(stats, u)
    case 'repliegue-silencioso':
      return cumpleRepliegue(stats, u)
    case 'emigracion':
      return cumpleEmigracion(estado, u)
    case 'memoria-activa':
      return cumpleMemoria(stats, u)
    default:
      return false
  }
}

/**
 * Resuelve el final del acto para el estado dado.
 * estado = { stats, flags, ppBajaSostenida }.
 * Devuelve { id, prioridad, nombre, descripcion }. Siempre hay final:
 * si nada cumple, devuelve "Memoria activa" igualmente (fallback, design §5).
 */
export function resolveFinal(acto, estado, finales = finalesData) {
  const conf = configActo(acto, finales)
  const orden = Array.isArray(finales?.orden) ? finales.orden : FINALES
  for (const id of orden) {
    const f = conf[id]
    if (f && cumpleFinal(id, f, estado)) {
      return { id, prioridad: orden.indexOf(id) + 1, nombre: f.nombre, descripcion: f.descripcion }
    }
  }
  // Fallback incondicional: Memoria activa (tono honesto, sin copy de victoria/derrota).
  const fb = conf['memoria-activa'] || {}
  return {
    id: 'memoria-activa',
    prioridad: orden.indexOf('memoria-activa') + 1,
    nombre: fb.nombre || 'Memoria activa',
    descripcion: fb.descripcion || '',
  }
}
