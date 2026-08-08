// src/modes/decision.js — Componente de decisión (GS-021/022).
//
// Renderiza UN grupo de decisión como un solo <form> con botones. La
// condición del grupo YA la evalúa el llamador (app.js en M4); aquí solo se
// renderiza el grupo actual. El `requiere` de cada opción (GS-012) se evalúa
// en render contra opts.estado: si no se cumple, la opción queda FUERA del
// árbol de foco (hidden) — Z-08. Un costo de inventario insatisfecho
// deshabilita el botón (GS-011). La consecuencia (aria-live polite) la
// gestiona el llamador con la región persistente de src/ui/a11y.js — no
// vive aquí.
//
// API: renderDecision(escena, grupo, onElegir, opts) → <form.decision-group>
//   - escena   : escena de contenido (fixture / scene.schema.json)
//   - grupo    : grupo actual a renderizar (escena.grupos[i])
//   - onElegir : (indice, opcion) => void — click/tap (no hover)
//   - opts     : { estado?, resuelto?, oculto? }
//       estado   → estado de sesión (state/game-state.js) para evaluar
//                  requiere y costo; si no se pasa, todas las opciones se
//                  muestran interactivas.
//       resuelto → grupo ya resuelto: visible pero aria-disabled (GS-021).
//       oculto   → grupo futuro: hidden, fuera del árbol de foco (GS-021).
//       detalle  → (opcion) => Node|null. Contenido extra DENTRO del botón,
//                  para convertirlo en carta: chips de deltas, costo, lo que
//                  haga falta. Decorativo: el nombre accesible sigue siendo
//                  aria-label = opcion.label.
//
// Botones: role=button (implícito de <button>), aria-label = opción,
// class 'decision', data-opcion = índice, min-height 56px por CSS,
// :focus-visible visible (ocre #c9a227, GS-080).

import { el } from '../lib/dom.js'
import { cumpleRequiere } from '../state/game-state.js'
import { puedeCostear } from '../state/inventory.js'

export const CLASE_GRUPO = 'decision-group'

export function renderDecision(escena, grupo, onElegir, opts = {}) {
  const estado = opts.estado ?? null
  const resuelto = opts.resuelto === true
  const oculto = opts.oculto === true

  const form = el('form', {
    class: [
      CLASE_GRUPO,
      resuelto ? `${CLASE_GRUPO}--resuelto` : null,
      oculto ? `${CLASE_GRUPO}--oculto` : null,
    ]
      .filter(Boolean)
      .join(' '),
    novalidate: true,
    dataset: { grupo: grupo?.id ?? '' },
  })
  if (oculto) form.hidden = true
  if (resuelto) form.setAttribute('aria-disabled', 'true')

  // Título del grupo (opcional, null permitido). aria-labelledby asocia el
  // prompt al form (nombre accesible del landmark 'form').
  if (grupo && typeof grupo.titulo === 'string' && grupo.titulo.trim() !== '') {
    const idTitulo = `decision-titulo-${escena?.id ?? 'escena'}-${grupo.id}`
    form.append(el('h2', { class: 'grupo-titulo', id: idTitulo }, grupo.titulo))
    form.setAttribute('aria-labelledby', idTitulo)
  } else {
    form.setAttribute('aria-label', 'Decisiones')
  }

  const detalle = typeof opts.detalle === 'function' ? opts.detalle : () => null
  const opciones = el('div', { class: 'opciones' })
  const lista = grupo?.opciones ?? []
  lista.forEach((opcion, indice) => {
    const disponible = estado ? cumpleRequiere(estado, opcion.requiere) : true
    const puedePagar =
      estado && opcion.inventario?.costo
        ? puedeCostear(estado.inventario, opcion.inventario.costo)
        : true

    const boton = el(
      'button',
      {
        type: 'button',
        class: 'decision',
        dataset: { opcion: String(indice) },
        'aria-label': opcion.label,
        onClick: (ev) => {
          ev.preventDefault()
          if (typeof onElegir === 'function') onElegir(indice, opcion)
        },
      },
      [el('span', { class: 'decision-label' }, opcion.label), detalle(opcion)],
    )

    if (!disponible) {
      // Fuera del árbol de foco y de SR (Z-08 / GS-012).
      boton.hidden = true
      boton.setAttribute('aria-disabled', 'true')
    } else if (!puedePagar) {
      boton.disabled = true
      boton.setAttribute('aria-disabled', 'true')
    }
    opciones.append(boton)
  })

  form.append(opciones)
  return form
}
