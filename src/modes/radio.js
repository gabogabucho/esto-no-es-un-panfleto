// src/modes/radio.js — Renderer RADIO (GS-020).
// Bitácora walkie-talkie, monospace, alta tensión: la narración como línea de
// sistema, los bloques radio como "[tiempo] emisor: texto — cambio", el
// diálogo como "— hablante: texto". Cursor ">> _" decorativo. Texto
// narrativo en DOM (indexable por SR, R2 / GS-020).
//
// API: renderRadio(escena) → contenedor (.modo-radio)
// Bloques no compatibles (tweet, zineTitulo, cita) se omiten.

import { el } from '../lib/dom.js'

export function renderRadio(escena) {
  const contenedor = el('div', { class: 'modo-radio' })
  const bitacora = el('div', { class: 'radio-bitacora' })

  for (const bloque of escena?.bloques ?? []) {
    if (bloque.tipo === 'narracion') {
      bitacora.append(el('p', { class: 'radio-sistema' }, `> ${bloque.texto}`))
    } else if (bloque.tipo === 'radio') {
      const hora = bloque.tiempo ?? bloque.hora
      const partes = []
      if (hora) partes.push(el('time', { class: 'radio-tiempo', dateTime: hora }, `[${hora}]`))
      if (bloque.emisor) partes.push(el('span', { class: 'radio-emisor' }, bloque.emisor), ': ')
      partes.push(bloque.texto)
      if (bloque.cambio === true) partes.push(el('span', { class: 'radio-cambio' }, ' — cambio'))
      bitacora.append(el('p', { class: 'radio-linea' }, partes))
    } else if (bloque.tipo === 'dialogo') {
      const partes = []
      if (bloque.hablante) partes.push(el('span', { class: 'radio-hablante' }, `— ${bloque.hablante}: `))
      partes.push(bloque.texto)
      bitacora.append(el('p', { class: 'radio-dialogo' }, partes))
    }
  }

  bitacora.append(el('p', { class: 'radio-cursor', 'aria-hidden': 'true' }, '>> _'))
  contenedor.append(bitacora)
  return contenedor
}
