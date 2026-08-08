// src/modes/feed.js — Renderer FEED (GS-020).
// Timeline oscuro, monospace, estilo notificaciones: la narración como texto
// de estado, los tweets como tarjetas (autor · tiempo, texto, hashtags,
// métricas), las citas como blockquote con autor + fuente. Arriba, el
// indicador de La Señal (R2: ● señal: ▂▃▅). Todo el texto vive en DOM
// (indexable por SR, R2 / GS-020).
//
// API: renderFeed(escena, opts) → contenedor (.modo-feed)
//   - escena.senal u opts.senal → { valor, nivel } de state/signal.js;
//     si no hay señal, el indicador dice "estable".
//   - Bloques no compatibles con FEED (radio, zineTitulo, dialogo) se
//     omiten sin error.
// renderDecision lo agrega el llamador después (GS-021).

import { el } from '../lib/dom.js'

export const NIVELES_SENAL = {
  0: { nombre: 'estable', grafico: '▂' },
  1: { nombre: 'irregular', grafico: '▂▃' },
  2: { nombre: 'degradada', grafico: '▂▃▅' },
  3: { nombre: 'colapso', grafico: '▂▃▅' },
}

/** Fila superior del FEED: ● señal: ▂▃▅ (nivel nombre en aria-label). */
export function indicadorSenal(senal) {
  const nivel = typeof senal === 'number' ? senal : senal?.nivel
  const info =
    nivel !== undefined && NIVELES_SENAL[nivel] ? NIVELES_SENAL[nivel] : NIVELES_SENAL[0]
  return el('p', { class: 'senal-indicador', 'aria-label': `Señal: ${info.nombre}` }, [
    el('span', { class: 'senal-dot', 'aria-hidden': 'true' }, '●'),
    ' señal: ',
    el('span', { class: 'senal-grafico', 'aria-hidden': 'true' }, info.grafico),
  ])
}

export function renderFeed(escena, opts = {}) {
  const contenedor = el('div', { class: 'modo-feed' })
  const senal = escena?.senal ?? opts.senal ?? null
  contenedor.append(indicadorSenal(senal))

  const timeline = el('div', { class: 'feed-timeline' })
  for (const bloque of escena?.bloques ?? []) {
    if (bloque.tipo === 'narracion') {
      timeline.append(el('p', { class: 'feed-narracion' }, bloque.texto))
    } else if (bloque.tipo === 'tweet') {
      timeline.append(tarjetaTweet(bloque))
    } else if (bloque.tipo === 'cita') {
      timeline.append(bloqueCita(bloque, 'feed-cita'))
    }
    // radio / zineTitulo / dialogo: no aplican en FEED → se omiten.
  }
  contenedor.append(timeline)
  return contenedor
}

function tarjetaTweet(bloque) {
  const autor = bloque.handle ?? bloque.autor ?? ''
  const cabecera = [el('span', { class: 'feed-tweet-autor' }, autor)]
  if (bloque.tiempo) {
    cabecera.push(el('time', { class: 'feed-tweet-tiempo', dateTime: bloque.tiempo }, bloque.tiempo))
  }

  const partes = [
    el('header', { class: 'feed-tweet-cabecera' }, cabecera),
    el('p', { class: 'feed-tweet-texto' }, bloque.texto),
  ]

  if (Array.isArray(bloque.hashtags) && bloque.hashtags.length > 0) {
    partes.push(
      el('p', { class: 'feed-tweet-hashtags' }, bloque.hashtags.map((h) => el('span', { class: 'feed-tweet-hashtag' }, h))),
    )
  }

  const m = bloque.metricas
  if (m && (m.rt || m.fav || m.replies)) {
    const metricas = []
    if (m.rt) metricas.push(el('span', { class: 'feed-metrica' }, `↻ ${m.rt}`))
    if (m.fav) metricas.push(el('span', { class: 'feed-metrica' }, `♥ ${m.fav}`))
    if (m.replies) metricas.push(el('span', { class: 'feed-metrica' }, `💬 ${m.replies}`))
    partes.push(el('p', { class: 'feed-tweet-metricas' }, metricas))
  }

  return el('article', { class: 'feed-item feed-tweet' }, partes)
}

function bloqueCita(bloque, clase) {
  const partes = [el('p', null, bloque.texto)]
  if (bloque.autor) {
    partes.push(el('cite', null, [bloque.autor, bloque.fuente ? ` — ${bloque.fuente}` : '']))
  }
  return el('blockquote', { class: clase }, partes)
}
