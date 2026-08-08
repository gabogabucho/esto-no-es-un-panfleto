// src/state/stats.js — Stats de 5 ejes (GS-010). Puro, sin DOM.
// Ejes: CO (Coraje), RI (Riesgo), RE (Red), CF (Confianza), PP (Percepción pública).
// API M1b: NOMBRE_STATS, inicialStats(rolId), aplicarDeltas(stats, deltas), clamp(n).

import rolesData from '../content/roles.json'

export const EJES = ['CO', 'RI', 'RE', 'CF', 'PP']

// R2: etiquetas de los 5 stats (labels únicos, Venezuela R1).
export const NOMBRE_STATS = {
  CO: 'Coraje',
  RI: 'Riesgo',
  RE: 'Red',
  CF: 'Confianza',
  PP: 'Percepción pública',
}

export function clamp(n, min = 0, max = 100) {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

export function statsVacios() {
  return { CO: 0, RI: 0, RE: 0, CF: 0, PP: 0 }
}

/**
 * Stats iniciales del rol desde src/content/roles.json (design §5).
 * Si el rol no existe devuelve stats vacíos (nunca lanza).
 */
export function inicialStats(rolId) {
  const rol = (rolesData.roles || []).find((r) => r.id === rolId)
  if (!rol || !rol.statsIniciales) return statsVacios()
  const out = statsVacios()
  for (const eje of EJES) {
    const v = rol.statsIniciales[eje]
    if (typeof v === 'number') out[eje] = clamp(v)
  }
  return out
}

/**
 * Aplica deltas (parcial) a los stats y devuelve UN NUEVO objeto con clamp
 * 0-100 por eje. NUNCA muta el objeto de entrada (GS-010).
 */
export function aplicarDeltas(stats, deltas = {}) {
  const nuevo = { ...stats }
  for (const eje of EJES) {
    const d = deltas[eje]
    if (typeof d === 'number') nuevo[eje] = clamp((nuevo[eje] || 0) + d)
  }
  return nuevo
}

/**
 * Stat más alto; empates desempatados por orden CO>RI>RE>CF>PP (GS-010).
 * Alimenta el color del pulso en el mapa final (GS-092.1).
 */
export function dominante(stats) {
  let mejor = EJES[0]
  for (const eje of EJES) {
    if ((stats[eje] || 0) > (stats[mejor] || 0)) mejor = eje
  }
  return mejor
}

/** true si algún eje está al borde (≤ umbral). */
export function alBorde(stats, umbral = 10) {
  return EJES.some((eje) => (stats[eje] || 0) <= umbral)
}
