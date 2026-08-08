// src/state/signal.js — La Señal (GS-013). Puro, sin DOM.
// Intensidad continua 0-100 + 4 niveles. NO es barra de vida: la UI
// comunica por glitch/estática/rasgado (design §5).
//
// Fórmula: S = clamp(0,100, round(0.45·RI + 0.40·(100−CF) + 0.15·(100−PP)))
// Niveles: 0 estable (0-24) / 1 irregular (25-49) / 2 degradada (50-74) /
//          3 colapso (75-100).

import { clamp } from './stats.js'

// Pesos en constantes (design §5, GS-013).
export const SEÑAL_PESOS = { RI: 0.45, CF: 0.4, PP: 0.15 }

export const NIVELES = [
  { nivel: 0, desde: 0, hasta: 24, nombre: 'estable' },
  { nivel: 1, desde: 25, hasta: 49, nombre: 'irregular' },
  { nivel: 2, desde: 50, hasta: 74, nombre: 'degradada' },
  { nivel: 3, desde: 75, hasta: 100, nombre: 'colapso' },
]

/**
 * Intensidad de La Señal 0-100 según la fórmula GS-013.
 * Solo dependen RI, CF y PP (RE no participa).
 */
export function calcularSenal({ RI = 0, CF = 0, PP = 0 } = {}) {
  const s = SEÑAL_PESOS.RI * RI + SEÑAL_PESOS.CF * (100 - CF) + SEÑAL_PESOS.PP * (100 - PP)
  return clamp(Math.round(s))
}

/**
 * Nivel 0-3 desde la intensidad (umbrales del design §5 / spec GS-013):
 * 0 estable (0-24) · 1 irregular (25-49) · 2 degradada (50-74) · 3 colapso (75-100).
 */
export function nivelSenal(S) {
  const v = clamp(Math.round(S))
  for (const n of NIVELES) {
    if (v >= n.desde && v <= n.hasta) return n.nivel
  }
  return 3 // por construcción inalcanzable; clamp cubre 0-100
}

/** Descripción corta de un nivel (R1). */
export function descripcionNivel(nivel) {
  const n = NIVELES.find((x) => x.nivel === nivel)
  return n ? n.nombre : 'desconocido'
}

/**
 * Callback que se dispara al CRUZAR hacia un nivel dado (GS-013).
 * Devuelve una función actualizadora: `onUmbral(3, cb)(senal)`.
 * Nivel 3 (colapso) además setea el flag `feed_muerto` en game-state.
 */
export function onUmbral(nivel, cb) {
  let anterior = null
  return function actualizar(S) {
    const actual = nivelSenal(S)
    if (actual === nivel && anterior !== nivel) {
      cb(S, actual)
    }
    anterior = actual
  }
}
