// src/signal/glitch.js — Glitch de texto SOLO por CSS (GS-031).
//
// El texto narrativo del DOM NUNCA se muta: el glitch es 100% CSS
// (text-shadow de color-split + transform jitter + slices clip-path), y este
// módulo solo añade/elimina clases sobre el contenedor. Puro, sin side
// effects salvo classList sobre el nodo recibido.
//
// API:
//   claseGlitch(nivel)      → 'glitch-1' | 'glitch-2' | 'glitch-3' | null (puro)
//   aplicarGlitch(cont, n)  → añade la clase del nivel y quita las otras
//   quitarGlitch(cont)      → limpia todas las clases de glitch
//
// Las clases .glitch-1/2/3 y sus animaciones viven en signal.css.

export const CLASES_GLITCH = ['glitch-1', 'glitch-2', 'glitch-3']

/** Clase de glitch para un nivel 0-3 (null si nivel 0 — sin degradación). */
export function claseGlitch(nivel) {
  const n = Math.max(0, Math.min(3, Math.round(Number(nivel) || 0)))
  return n === 0 ? null : CLASES_GLITCH[n - 1]
}

/**
 * Aplica el glitch del nivel al contenedor: añade la clase correspondiente,
 * quita las de otros niveles y registra el nivel en data-senal-nivel.
 * NUNCA toca el contenido de texto (GS-031). Devuelve la clase aplicada.
 */
export function aplicarGlitch(contenedor, nivel) {
  if (!contenedor || typeof contenedor.classList === 'undefined') return null
  const clase = claseGlitch(nivel)
  for (const c of CLASES_GLITCH) contenedor.classList.remove(c)
  if (clase) contenedor.classList.add(clase)
  contenedor.dataset.senalNivel = String(nivel)
  return clase
}

/** Quita las clases de glitch del contenedor (señal restaurada). */
export function quitarGlitch(contenedor) {
  if (!contenedor || typeof contenedor.classList === 'undefined') return
  for (const c of CLASES_GLITCH) contenedor.classList.remove(c)
  delete contenedor.dataset.senalNivel
}
