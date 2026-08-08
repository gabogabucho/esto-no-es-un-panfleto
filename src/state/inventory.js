// src/state/inventory.js — Inventario por acto (GS-011). Puro, sin DOM.
// Ítems: mascaras, agua, gasa, contactos. Los contactos son consumibles
// single-use por partida (un contacto gastado no se reutiliza, GS-011).
//
// API M1b: inventarioInicial(acto), aplicarInventario(inv, cambios),
// costoVisible(opcion).

import actosData from '../content/actos.json'
import { clamp } from './stats.js'

export const ITEMS = ['mascaras', 'agua', 'gasa', 'contactos']

// Etiquetas para costoVisible (UI, M2).
export const NOMBRE_ITEMS = {
  mascaras: 'máscara(s)',
  agua: 'agua',
  gasa: 'gasa',
  contactos: 'contacto(s)',
}

export function inventarioVacio() {
  return { mascaras: 0, agua: 0, gasa: 0, contactos: 0 }
}

/**
 * Línea base de inventario por acto desde src/content/actos.json
 * (acto 1 escaso; Zulia / acto 3 arranca con logística, design §3/§11).
 * Nunca devuelve valores negativos.
 */
export function inventarioInicial(acto) {
  const meta = (actosData.actos || []).find((a) => a.id === acto)
  const base = meta?.inventarioInicial || {}
  const out = inventarioVacio()
  for (const item of ITEMS) {
    const v = base[item]
    if (typeof v === 'number') out[item] = clamp(v)
  }
  return out
}

/**
 * true si el inventario puede cubrir TODOS los ítems del costo (GS-011).
 */
export function puedeCostear(inv, costo = {}) {
  const c = costo || {}
  return ITEMS.every((item) => {
    const n = c[item]
    return typeof n !== 'number' || n <= (inv[item] || 0)
  })
}

/**
 * Aplica cambios {costo, ganancia} al inventario y devuelve UN NUEVO objeto.
 * - Los costos nunca bajan de 0 (clamp).
 * - Un costo insatisfecho devuelve {ok:false, razon}:
 *   'sin contactos' si falta un contacto (consumible single-use), o
 *   'inventario insuficiente' en el caso general.
 * NUNCA muta el inventario de entrada.
 */
export function aplicarInventario(inv, cambios = {}) {
  const costo = cambios.costo || {}
  const ganancia = cambios.ganancia || {}
  if (!puedeCostear(inv, costo)) {
    const razon = (costo.contactos || 0) > (inv.contactos || 0) ? 'sin contactos' : 'inventario insuficiente'
    return { ok: false, razon }
  }
  const nuevo = { ...inv }
  for (const item of ITEMS) {
    const c = costo[item]
    const g = ganancia[item]
    if (typeof c === 'number') nuevo[item] = Math.max(0, (nuevo[item] || 0) - c)
    if (typeof g === 'number') nuevo[item] = (nuevo[item] || 0) + g
  }
  return { ok: true, inventario: nuevo }
}

/**
 * Resumen de costo legible de una opción para la UI (M2).
 * Devuelve null si la opción no tiene costo. Ej: "Cuesta 2 máscara(s), 1 contacto(s)".
 */
export function costoVisible(opcion) {
  const costo = opcion?.inventario?.costo
  if (!costo || typeof costo !== 'object') return null
  const partes = []
  for (const item of ITEMS) {
    const n = costo[item]
    if (typeof n === 'number' && n > 0) {
      partes.push(`${n} ${NOMBRE_ITEMS[item]}`)
    }
  }
  return partes.length > 0 ? `Cuesta ${partes.join(', ')}` : null
}
