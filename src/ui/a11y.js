// src/ui/a11y.js — Ayudas de accesibilidad (GS-080 / GS-022).
// - focusScene(contenedor): mueve el foco al primer control interactivo del
//   contenedor (o al propio contenedor con tabindex=-1) tras un render.
//   Respeta prefers-reduced-motion (sin scroll forzado, GS-032).
// - anuncia(texto): emite texto en la región aria-live persistente de
//   consecuencias (creada una sola vez y reutilizada, GS-022).
// - ETIQUETA_MODO: etiquetas cortas de los modos para aria (R1).
//
// El skip-link vive en index.html + base.css (GS-080).

let regionLive = null

/**
 * Región aria-live persistente de consecuencias (GS-022). Se crea una sola
 * vez y se reutiliza; se inserta dentro de <main> (position:relative) para
 * que el posicionamiento absoluto de base.css quede contenido y el nodo no
 * quede fuera de los landmarks (axe / GS-080).
 */
export function regionConsecuencia() {
  if (regionLive && regionLive.isConnected) return regionLive
  regionLive = document.createElement('div')
  regionLive.id = 'consecuencia-live'
  regionLive.setAttribute('aria-live', 'polite')
  regionLive.setAttribute('aria-atomic', 'true')
  const contenedor = document.querySelector('main') ?? document.body
  contenedor.appendChild(regionLive)
  return regionLive
}

/** Emite el texto de la consecuencia en la región aria-live (GS-022). */
export function anuncia(texto) {
  if (texto == null || String(texto).trim() === '') return
  const r = regionConsecuencia()
  r.textContent = String(texto)
}

function prefiereMovimientoReducido() {
  try {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  } catch {
    return false
  }
}

const SELECTOR_INTERACTIVO = [
  'button:not(:disabled):not([hidden])',
  '[href]',
  'input:not(:disabled):not([type="hidden"])',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Mueve el foco al primer control interactivo del contenedor; si no hay
 * ninguno, al propio contenedor (tabindex=-1). Devuelve el elemento
 * enfocado. Con prefers-reduced-motion: focus({ preventScroll: true }).
 */
export function focusScene(contenedor) {
  if (!contenedor || typeof contenedor.querySelector !== 'function') return null
  const objetivo = contenedor.querySelector(SELECTOR_INTERACTIVO)
  const destino = objetivo ?? contenedor
  if (!objetivo && !destino.hasAttribute('tabindex')) {
    destino.setAttribute('tabindex', '-1')
  }
  try {
    destino.focus({ preventScroll: prefiereMovimientoReducido() })
  } catch {
    destino.focus()
  }
  return destino
}

// R1: etiquetas cortas por modo para aria (design §3, a11y).
export const ETIQUETA_MODO = {
  FEED: 'Modo pantalla principal',
  ZINE: 'Modo volante',
  RADIO: 'Modo radio',
}
