// src/modes/zine.js — Renderer ZINE (GS-020).
// Volante fotocopiado tricolor: zineTitulo en display (Anton/Oswald) + sub,
// narración como cuerpo del volante, diálogo como blockquote indentado con
// "hablante:", cita en recuadro. La textura de papel y la rotación ligera
// viven en CSS (modes.css) — aquí solo DOM. Todo el texto está en DOM
// (indexable por SR, R2 / GS-020).
//
// API: renderZine(escena) → contenedor (.modo-zine)
// Bloques no compatibles (tweet, radio) se omiten.

import { el } from '../lib/dom.js'

export function renderZine(escena) {
  const contenedor = el('div', { class: 'modo-zine' })
  const hoja = el('article', { class: 'zine-hoja' })

  for (const bloque of escena?.bloques ?? []) {
    if (bloque.tipo === 'zineTitulo') {
      hoja.append(
        el('header', { class: 'zine-cabecera' }, [
          el('h2', { class: 'zine-titulo' }, bloque.texto),
          bloque.sub ? el('p', { class: 'zine-sub' }, bloque.sub) : null,
        ]),
      )
    } else if (bloque.tipo === 'narracion') {
      hoja.append(el('p', { class: 'zine-narracion' }, bloque.texto))
    } else if (bloque.tipo === 'dialogo') {
      const partes = [el('p', null, bloque.texto)]
      if (bloque.hablante) {
        partes.push(el('footer', { class: 'zine-dialogo-hablante' }, `— ${bloque.hablante}`))
      }
      hoja.append(el('blockquote', { class: 'zine-dialogo' }, partes))
    } else if (bloque.tipo === 'cita') {
      const partes = [el('p', null, bloque.texto)]
      if (bloque.autor) {
        partes.push(el('cite', null, [bloque.autor, bloque.fuente ? ` — ${bloque.fuente}` : '']))
      }
      hoja.append(el('blockquote', { class: 'zine-cita' }, partes))
    }
  }

  contenedor.append(hoja)
  return contenedor
}
