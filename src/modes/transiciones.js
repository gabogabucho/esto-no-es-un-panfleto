// src/modes/transiciones.js — Transiciones de modo (GS-004).
// Renderiza un separador mínimo cuando la escena anuncia un modoFinal
// (ej: "— ZINE —"). El cambio real de modo lo orquesta app.js (M4)
// preservando el estado; aquí solo la etiqueta visual con nombre accesible.
//
// API: renderTransicion(modoFinal, opts) → elemento .transicion o null
//   - opts.nombreModo → mapa opcional de etiquetas (por defecto las de
//     src/ui/a11y.js) para el aria-label.

import { el } from '../lib/dom.js'

const NOMBRE_MODO = {
  FEED: 'Modo pantalla principal',
  ZINE: 'Modo volante',
  RADIO: 'Modo radio',
}

export function renderTransicion(modoFinal, opts = {}) {
  if (!modoFinal) return null
  const nombre = (opts.nombreModo ?? NOMBRE_MODO)[modoFinal] ?? modoFinal
  const div = el('div', { class: 'transicion', 'aria-label': `Cambio de modo: ${nombre}` })
  div.append(
    el('span', { class: 'transicion-linea', 'aria-hidden': 'true' }, '——'),
    el('strong', { class: 'transicion-texto' }, `— ${modoFinal} —`),
    el('span', { class: 'transicion-linea', 'aria-hidden': 'true' }, '——'),
  )
  return div
}
