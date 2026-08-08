// src/ui/pantallas.js — Pantallas del shell (T-039). Solo DOM: ni estado ni
// navegación. Cada render recibe datos ya resueltos y devuelve un <section>
// listo para montar; los callbacks los cablea src/app.js.
//
// Todo el copy del shell vive en este archivo a propósito: scripts/check-locale.mjs
// escanea src/ui/**/*.js como gate R1 (tuteo venezolano neutro, cero
// rioplatense). Si una cadena de interfaz nace fuera de aquí, se escapa del gate.
//
// Pantallas: inicio, selección de rol, escena, final de acto y las cinco
// secuencias del cierre (pulso, desgaste, vaciado, panfleto, cifra, créditos)
// del entregable H, más el memorial suelto del menú.

import { el } from '../lib/dom.js'
import { urlDeArchivo, urlDeIlustracion } from '../lib/archivo.js'
import { EJES, NOMBRE_STATS } from '../state/stats.js'
import { ITEMS, costoVisible } from '../state/inventory.js'
import { renderFeed, indicadorSenal } from '../modes/feed.js'
import { renderZine } from '../modes/zine.js'
import { renderRadio } from '../modes/radio.js'
import { renderDecision } from '../modes/decision.js'
import { renderTransicion } from '../modes/transiciones.js'
import actosData from '../content/actos.json'

const RENDERERS = { FEED: renderFeed, ZINE: renderZine, RADIO: renderRadio }

// Etiquetas de inventario para el HUD (NOMBRE_ITEMS lleva plural entre
// paréntesis, pensado para costoVisible, no para una fila de estado).
export const ETIQUETA_ITEM = {
  mascaras: 'Máscaras',
  agua: 'Agua',
  gasa: 'Gasa',
  contactos: 'Contactos',
}

// Mensajes sueltos del shell: viven aquí, y no en app.js, para que el gate R1
// los alcance (check-locale escanea src/ui, no src).
export const MENSAJES = {
  sinInventario: 'No te alcanza el inventario para esa opción.',
  infiltracion: 'Un rumor de infiltración recorre el grupo.',
  volver: 'Volver',
}

// Banda sonora sugerida en la portada. Es una recomendación y nada más: el
// juego no reproduce nada, no incrusta nada y funciona igual sin abrirla. El
// enlace va limpio, sin el token ?si= de compartir, que identifica a la cuenta
// de quien lo copió.
export const BANDA_SONORA = {
  album: 'La Lucha',
  artista: 'La Vida Bohème',
  anio: 2017,
  url: 'https://open.spotify.com/album/0L3mUCSDXJgh6sIj5S9MXM',
}

// El poemario del que sale «Panfleto» y la cuenta del autor. El PDF vive en
// public/ y NO se precachea: el juego entero funciona sin conexión, pero un
// libro de 93 KB no tiene por qué viajar en la instalación de todo el mundo.
// `twitter: null` deja el enlace fuera hasta que haya handle: nunca se inventa.
export const AUTOR = {
  nombre: 'Gabriel Urrutia',
  poemario: 'Esto no es un panfleto',
  pdf: '/esto-no-es-un-panfleto.pdf',
  twitter: 'gabogabucho',
}

// Siglas del inventario para la barra de estado. El nombre completo viaja en
// title y aria-label: se ve corto y se lee entero.
export const SIGLA_ITEM = {
  mascaras: 'Másc',
  agua: 'Agua',
  gasa: 'Gasa',
  contactos: 'Cont',
}

// Portada: la ilustración de fondo sale del propio juego.
export const PORTADA = {
  imagen: 't07-barricada-futbol.webp',
  kicker: 'Un juego de decisiones sobre la resistencia estudiantil venezolana',
}

// Mini tutorial. Cuatro tarjetas: qué mide el juego, cómo avanza, qué es La
// Señal y qué parte es documentada. La última no es un detalle legal: es la
// tesis del proyecto y conviene decirla antes de empezar.
export const TUTORIAL = [
  {
    titulo: 'Cinco ejes, ninguno bueno',
    texto:
      'Coraje, Riesgo, Red, Confianza y Percepción pública. Cada decisión los mueve, y en las cartas ves cuánto antes de tocar. No hay uno que convenga tener alto: son cinco maneras distintas de quedar expuesto.',
  },
  {
    titulo: 'Una decisión a la vez',
    texto:
      'El relato llega por partes. Cuando termina aparecen las cartas, eliges una y el juego te dice qué pasó. No se vuelve atrás: lo que hiciste queda escrito en la escena.',
  },
  {
    titulo: 'La Señal',
    texto:
      'Mide cuánto se degrada tu capacidad de comunicarte. No es una barra de vida y no se recarga: se nota en la imagen, en el ruido y en lo que deja de cargar. Cuando cae del todo, el modo en el que estabas se apaga.',
  },
  {
    titulo: 'Qué es verdad aquí dentro',
    texto:
      'Los personajes son ficticios. Los hechos, las fechas, los lugares y las cifras no. Cada escena muestra sus fuentes y con qué nivel de certeza, y las personas que murieron no tienen diálogo: nadie tiene derecho a ponerles palabras.',
  },
]

// Certeza de las fuentes de una escena (GS-093): la etiqueta que ve el jugador.
export const ETIQUETA_CERTEZA = {
  confirmado: 'confirmado',
  'fuente-unica': 'fuente única',
  'testimonio-no-verificado': 'testimonio sin verificar',
}

/** Metadatos del acto desde actos.json (nombre, ciudad, epígrafe). */
export function metaActo(acto) {
  return (actosData.actos || []).find((a) => a.id === acto) || null
}

/** Contenedor de pantalla con clase propia y la clase común. */
function pantalla(nombre, hijos) {
  return el('section', { class: `pantalla pantalla--${nombre}` }, hijos)
}

/** Título de pantalla que existe para lectores de pantalla, no para la vista. */
function tituloOculto(texto) {
  return el('h1', { class: 'oculto-visual' }, texto)
}

function boton(texto, onClick, clase = 'boton') {
  return el('button', { type: 'button', class: clase, onClick }, texto)
}

/**
 * Botonera de una pantalla del cierre. El botón de saltar aparece SOLO si el
 * llamador pasa onSaltar, y el shell solo lo pasa cuando el jugador ya vio el
 * cierre entero alguna vez (entregable H §7): se puede saltar, pero nunca la
 * primera vez, y nunca se bloquea a nadie en una pantalla de muertos.
 */
function accionesCierre(opts = {}) {
  const acciones = el('div', { class: 'acciones' }, [
    boton('Continuar', opts.onContinuar, 'boton boton--primario'),
  ])
  if (typeof opts.onSaltar === 'function') {
    acciones.append(boton('Saltar el cierre', opts.onSaltar))
  }
  return acciones
}

// ---------------------------------------------------------------------------
// Stats e inventario
// ---------------------------------------------------------------------------

/**
 * Fila de los 5 ejes. `deltas` (opcional) marca los ejes que acaban de
 * moverse: peso visual inmediato de la decisión (R2.5). La barra se escala con
 * la variable --valor; el número queda siempre en DOM para lectores de pantalla.
 */
export function renderStats(stats, opts = {}) {
  const deltas = opts.deltas || {}
  const lista = el('ul', { class: 'stats', 'aria-label': 'Tus cinco ejes' })

  for (const eje of EJES) {
    const valor = Number(stats?.[eje]) || 0
    const d = Number(deltas[eje]) || 0
    const item = el('li', { class: `stat stat--${eje}` }, [
      el('span', { class: 'stat-nombre' }, NOMBRE_STATS[eje]),
      el('span', { class: 'stat-valor' }, String(valor)),
      d !== 0
        ? el('span', { class: `stat-delta stat-delta--${d > 0 ? 'sube' : 'baja'}` }, `${d > 0 ? '+' : ''}${d}`)
        : null,
    ])
    const barra = el('span', { class: 'stat-barra', 'aria-hidden': 'true' })
    barra.style.setProperty('--valor', String(valor))
    item.append(barra)
    lista.append(item)
  }
  return lista
}

/**
 * Los cinco ejes en una sola línea. Va dentro del botón de rol, donde una
 * lista no es contenido válido: solo elementos de frase.
 */
export function renderStatsCompacto(stats) {
  const fila = el('span', { class: 'stats-compacto' })
  for (const eje of EJES) {
    fila.append(
      el('span', { class: `stat-compacto stat-compacto--${eje}` }, [
        el('span', { class: 'stat-nombre' }, `${NOMBRE_STATS[eje]} `),
        el('span', { class: 'stat-valor' }, String(Number(stats?.[eje]) || 0)),
      ]),
    )
  }
  return fila
}

/** Fila de inventario del acto (GS-011). */
export function renderInventario(inventario) {
  const lista = el('ul', { class: 'inventario', 'aria-label': 'Inventario' })
  for (const item of ITEMS) {
    lista.append(
      el('li', { class: 'inventario-item' }, [
        el('span', { class: 'inventario-nombre' }, ETIQUETA_ITEM[item]),
        el('span', { class: 'inventario-valor' }, String(Number(inventario?.[item]) || 0)),
      ]),
    )
  }
  return lista
}

// ---------------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------------

/**
 * Portada. Con guardado válido ofrece reanudar; sin él, solo empezar.
 * opts: { hayGuardado, conteo, onContinuar, onNueva }
 */
export function renderInicio(opts = {}) {
  const acciones = el('div', { class: 'acciones' })
  if (opts.hayGuardado) {
    acciones.append(boton('Continuar la partida', opts.onContinuar, 'boton boton--primario'))
    acciones.append(boton('Empezar de nuevo', opts.onNueva, 'boton boton--peligro'))
  } else {
    acciones.append(boton('Empezar', opts.onNueva, 'boton boton--primario'))
  }
  acciones.append(boton('Cómo se juega', opts.onTutorial, 'boton boton--discreto'))

  const conteo = opts.conteo || {}
  const iniciadas = Number(conteo.iniciadas) || 0
  const completadas = Number(conteo.completadas) || 0

  const seccion = pantalla('inicio', [])

  // Fondo: una ilustración del propio juego, no una decoración.
  const fondo = el('div', { class: 'portada-fondo', 'aria-hidden': 'true' })
  const url = urlDeIlustracion(PORTADA.imagen)
  if (url) fondo.append(el('img', { src: url, alt: '', decoding: 'async' }))
  seccion.append(fondo)

  seccion.append(
    el('div', { class: 'portada-cuerpo' }, [
      el('p', { class: 'portada-kicker' }, PORTADA.kicker),
      el('h1', { class: 'titulo-portada' }, 'Esto no es un panfleto'),
      el('p', { class: 'entradilla' }, 'Venezuela, 2014. Tres ciudades, tres personas, el mismo semestre.'),
      el('p', { class: 'entradilla-2' }, 'Cada decisión cuesta algo y ninguna es la correcta.'),
      acciones,
      el('div', { class: 'portada-pie' }, [
        renderBandaSonora(),
        iniciadas > 0
          ? el(
              'p',
              {
                class: 'conteo-juego',
                title: `${iniciadas} partida(s) iniciada(s), ${completadas} completada(s) en este navegador`,
              },
              `Jugado ${iniciadas} ${iniciadas === 1 ? 'vez' : 'veces'}`,
            )
          : null,
        el('p', { class: 'nota-portada' },
          'Los personajes son ficticios. Los hechos, las fechas, los lugares y las cifras no lo son.'),
      ]),
    ]),
  )
  return seccion
}

/**
 * Cómo se juega. Cuatro cosas, ni una más: los ejes, cómo avanza una escena,
 * qué es La Señal y qué parte de todo esto es verdad. Lo último importa tanto
 * como lo primero.
 */
export function renderTutorial(opts = {}) {
  const tarjetas = el('ol', { class: 'tutorial' })
  TUTORIAL.forEach((t, i) => {
    tarjetas.append(
      el('li', { class: 'tutorial-paso' }, [
        el('p', { class: 'tutorial-numero', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
        el('h2', { class: 'tutorial-titulo' }, t.titulo),
        el('p', { class: 'tutorial-texto' }, t.texto),
      ]),
    )
  })

  return pantalla('tutorial', [
    el('p', { class: 'kicker' }, 'Cómo se juega'),
    el('h1', { class: 'titulo-tutorial' }, 'Cuatro cosas y ya'),
    tarjetas,
    el('div', { class: 'acciones' }, [
      boton(opts.etiqueta || 'Entendido', opts.onVolver, 'boton boton--primario'),
    ]),
  ])
}

/**
 * Recomendación de banda sonora. Enlace externo y explícito: el juego entero
 * funciona sin conexión y esto no, así que el aviso va en pantalla en vez de
 * dejar que el jugador se encuentre con un enlace muerto en el metro.
 */
export function renderBandaSonora() {
  const { album, artista, anio, url } = BANDA_SONORA
  return el('aside', { class: 'banda-sonora', 'aria-label': 'Banda sonora sugerida' }, [
    el('p', { class: 'banda-sonora-kicker' }, 'Banda sonora sugerida'),
    el('p', { class: 'banda-sonora-disco' }, `${album} — ${artista} (${anio})`),
    el(
      'a',
      { class: 'banda-sonora-enlace', href: url, rel: 'noopener noreferrer', target: '_blank' },
      'Abrir el disco en Spotify',
    ),
    el('p', { class: 'banda-sonora-nota' }, 'Se abre fuera del juego y necesita conexión.'),
  ])
}

// ---------------------------------------------------------------------------
// Selección de rol
// ---------------------------------------------------------------------------

/**
 * Elección de personaje al abrir un acto.
 * opts: { acto, roles, onElegir(rol) }
 */
export function renderRoles(opts = {}) {
  const acto = opts.acto
  const meta = metaActo(acto)
  const roles = opts.roles || []

  const opciones = el('div', { class: 'opciones opciones--roles' })
  for (const rol of roles) {
    opciones.append(
      el(
        'button',
        {
          type: 'button',
          class: 'opcion opcion--rol',
          dataset: { rol: rol.id },
          'aria-label': rol.nombre,
          onClick: () => typeof opts.onElegir === 'function' && opts.onElegir(rol),
        },
        [
          el('span', { class: 'rol-nombre' }, rol.nombre),
          el('span', { class: 'rol-descripcion' }, rol.descripcion),
          renderStatsCompacto(rol.statsIniciales),
        ],
      ),
    )
  }

  return pantalla('rol', [
    el('h1', { class: 'titulo-acto' }, meta ? `Acto ${acto} — ${meta.nombre}` : `Acto ${acto}`),
    meta ? el('p', { class: 'acto-lugar' }, `${meta.ciudad}, ${meta.estado}`) : null,
    meta ? el('p', { class: 'acto-epigrafe' }, meta.epigrafe) : null,
    el('h2', { class: 'pregunta-rol' }, '¿Quién eres en esta ronda?'),
    opciones,
  ])
}

// ---------------------------------------------------------------------------
// Escena
// ---------------------------------------------------------------------------

/**
 * Barra de estado de la escena: los cinco ejes y el inventario como fichas en
 * una sola línea. La lista con barras ocupaba media pantalla y empujaba la
 * decisión fuera de la vista, que es justo lo que no puede pasar.
 */
function renderHud(estado, opts = {}) {
  const deltas = opts.deltas || {}
  const deltasInv = opts.deltasInventario || {}
  const barra = el('div', { class: 'hud' })

  const ejes = el('ul', { class: 'hud-ejes', 'aria-label': 'Tus cinco ejes' })
  for (const eje of EJES) {
    const valor = Number(estado?.stats?.[eje]) || 0
    const d = Number(deltas[eje]) || 0
    // Sigla a la vista, nombre completo para quien no ve la pantalla. Con
    // "Percepción pública" entero, la barra no entraba y el inventario quedaba
    // cortado fuera de cuadro.
    const item = el(
      'li',
      {
        class: `hud-eje${d ? ` hud-eje--${d > 0 ? 'sube' : 'baja'}` : ''}`,
        title: NOMBRE_STATS[eje],
        'aria-label': `${NOMBRE_STATS[eje]}: ${valor}`,
      },
      [
        el('span', { class: 'hud-eje-nombre' }, eje),
        el('span', { class: 'hud-eje-valor' }, String(valor)),
        d ? el('span', { class: 'hud-eje-delta' }, `${d > 0 ? '+' : ''}${d}`) : null,
      ],
    )
    item.style.setProperty('--valor', String(valor))
    ejes.append(item)
  }
  barra.append(ejes)

  const inv = el('ul', { class: 'hud-inventario', 'aria-label': 'Inventario' })
  for (const item of ITEMS) {
    const n = Number(estado?.inventario?.[item]) || 0
    const d = Number(deltasInv[item]) || 0
    inv.append(
      el(
        'li',
        {
          class: `hud-item${n === 0 ? ' hud-item--vacio' : ''}${d ? ` hud-item--${d > 0 ? 'sube' : 'baja'}` : ''}`,
          title: ETIQUETA_ITEM[item],
          'aria-label': `${ETIQUETA_ITEM[item]}: ${n}`,
        },
        [
          el('span', { class: 'hud-item-nombre' }, SIGLA_ITEM[item]),
          el('span', { class: 'hud-item-valor' }, String(n)),
          d ? el('span', { class: 'hud-item-delta' }, `${d > 0 ? '+' : ''}${d}`) : null,
        ],
      ),
    )
  }
  barra.append(inv)

  // En ZINE y RADIO el indicador de La Señal lo pone el HUD; en FEED, el modo.
  if (opts.modo !== 'FEED') barra.append(indicadorSenal(estado?.senal))
  return barra
}

/** Trazabilidad de la escena (GS-093), plegada para no competir con el relato. */
function renderFuentes(escena) {
  const fuentes = escena?.fuentes || []
  if (fuentes.length === 0) return null
  const lista = el('ul', { class: 'fuentes-lista' })
  for (const f of fuentes) {
    lista.append(
      el('li', null, [
        f.fuente,
        el('span', { class: 'fuente-certeza' }, ` — ${ETIQUETA_CERTEZA[f.certeza] || f.certeza}`),
      ]),
    )
  }
  return el('details', { class: 'fuentes' }, [
    el('summary', null, 'Fuentes de esta escena'),
    lista,
  ])
}

/**
 * Saca del orden de tabulación los botones de un grupo ya resuelto: siguen a la
 * vista como registro de lo que elegiste, pero el teclado ya no los alcanza
 * (una decisión a la vez, GS-021). El puntero lo corta modes.css.
 */
function inertar(form) {
  for (const b of form.querySelectorAll('button')) b.tabIndex = -1
}

// Tope duro de opacidad de las fotos de archivo (GS-050): la foto es capa de
// fondo y nunca compite con la legibilidad del texto.
export const OPACIDAD_MAX_FOTO = 0.35

/**
 * Capa de foto de archivo de la escena (R3 / GS-050), o null si la escena no
 * tiene foto o el archivo no está empaquetado. La atribución no va aquí: viaja
 * en `escena.fuentes`, que ya se pinta en pantalla, y la ficha completa vive en
 * src/assets/archive/ATTRIBUTION.md.
 */
export function renderFotoArchivo(escena) {
  const foto = escena?.foto
  if (!foto) return null
  const url = urlDeArchivo(foto.src)
  if (!url) return null

  const capa = el('div', { class: 'foto-archivo' })
  const opacidad = Math.min(OPACIDAD_MAX_FOTO, Math.max(0, Number(foto.opacidad) || 0))
  capa.style.setProperty('--opacidad-foto', String(opacidad))
  capa.append(el('img', { src: url, alt: foto.alt ?? '', loading: 'lazy', decoding: 'async' }))
  return capa
}

// Los modos nocturnos llevan niebla por defecto. RADIO es la madrugada del
// juego: la patrulla, el allanamiento, la frecuencia a las cuatro.
const MODOS_CON_NIEBLA = ['RADIO']

/**
 * Banda ilustrada de la escena. Una capa da deriva; dos o más, parallax — el
 * factor de cada plano lo fija aquí el render y el desplazamiento lo alimenta
 * el shell con --parallax, para que el scroll no toque el DOM.
 *
 * Los archivos son grises: el color sale del degradado del acto por debajo,
 * con mezcla de luminosidad. La descripción va una sola vez en el contenedor
 * (role img) y las capas quedan mudas, que es lo correcto: es UNA imagen.
 */
export function renderIlustracion(escena) {
  const ilu = escena?.ilustracion
  if (!ilu) return null
  const urls = (ilu.capas || []).map(urlDeIlustracion).filter(Boolean)
  if (urls.length === 0) return null

  const conNiebla = ilu.niebla ?? MODOS_CON_NIEBLA.includes(escena.modo)
  const banda = el('div', {
    class: [
      'ilustracion',
      `ilustracion--acto-${escena.acto}`,
      `ilustracion--${String(escena.modo).toLowerCase()}`,
      conNiebla ? 'ilustracion--niebla' : null,
    ]
      .filter(Boolean)
      .join(' '),
    role: 'img',
    'aria-label': ilu.alt,
  })

  urls.forEach((url, i) => {
    const capa = el('div', { class: 'ilustracion-capa', dataset: { plano: String(i) } }, [
      el('img', { src: url, alt: '', loading: 'lazy', decoding: 'async' }),
    ])
    // Fondo quieto, frente suelto. Con una sola capa, deriva discreta.
    const factor = urls.length === 1 ? 0.4 : 0.15 + (0.85 * i) / (urls.length - 1)
    capa.style.setProperty('--factor', factor.toFixed(2))
    banda.append(capa)
  })

  // El tinte va encima de las capas y debajo de la niebla.
  banda.append(el('div', { class: 'ilustracion-tinte', 'aria-hidden': 'true' }))
  if (conNiebla) {
    banda.append(el('div', { class: 'ilustracion-niebla', 'aria-hidden': 'true' }))
  }
  banda.append(el('div', { class: 'ilustracion-fundido', 'aria-hidden': 'true' }))
  return banda
}

/** Costo de inventario de las opciones del grupo, visible antes de elegir. */
function renderCostos(grupo) {
  const costos = (grupo?.opciones || [])
    .map((op) => ({ label: op.label, costo: costoVisible(op) }))
    .filter((c) => c.costo)
  if (costos.length === 0) return null
  const lista = el('ul', { class: 'costos' })
  for (const c of costos) {
    lista.append(el('li', null, `${c.label} ${c.costo.toLowerCase()}.`))
  }
  return lista
}

/**
 * Escena completa: HUD + modo + decisiones (una a la vez, GS-021) + fuentes.
 * opts: {
 *   estado, grupoActual (id | null), jugados (ids), deltas,
 *   onElegir(indice, opcion), cerrada, onContinuar
 * }
 */
export function renderEscena(escena, opts = {}) {
  const estado = opts.estado ?? null
  const jugados = opts.jugados || []
  const grupoActual = opts.grupoActual ?? null
  const renderModo = RENDERERS[escena.modo] || renderFeed

  const bloques = escena.bloques || []
  const revelados = Math.max(1, Math.min(bloques.length, opts.revelados ?? bloques.length))
  const faltanBloques = revelados < bloques.length
  const grupo = (escena.grupos || []).find((g) => g.id === grupoActual) || null

  const seccion = pantalla('escena', [])
  seccion.dataset.modo = escena.modo
  seccion.dataset.escena = escena.id

  // ---- Escenario: la ilustración manda y NO se va con el scroll ----------
  const escenario = el('div', { class: 'escena-escenario' })
  const banda = renderIlustracion(escena)
  if (banda) escenario.append(banda)
  const foto = renderFotoArchivo(escena)
  if (foto) escenario.append(foto)
  escenario.append(
    el('header', { class: 'escena-rotulo' }, [
      el('h1', { class: 'escena-acto' }, tituloDeActo(escena.acto)),
      el('p', { class: 'escena-lugar' }, `${escena.lugar} · ${escena.fecha}`),
    ]),
  )
  seccion.append(escenario)

  // ---- Panel: estado, relato y acción -------------------------------------
  const panel = el('div', { class: 'escena-panel' })
  panel.append(renderHud(estado, { deltas: opts.deltas, deltasInventario: opts.deltasInventario, modo: escena.modo }))

  const relato = el('div', { class: 'escena-relato', tabIndex: -1 })
  if (escena.epigrafe) relato.append(el('p', { class: 'escena-epigrafe' }, escena.epigrafe))
  relato.append(renderModo({ ...escena, bloques: bloques.slice(0, revelados) }, { senal: estado?.senal }))

  // El eco de cada decisión: qué elegiste y qué pasó. Las consecuencias antes
  // solo se anunciaban al lector de pantalla y ningún jugador llegaba a
  // leerlas; y al sacar de la vista las cartas ya resueltas (GS-021) hacía
  // falta que quedara constancia de la elección en algún lado. Aquí queda
  // mejor que como botones muertos: se lee lo que hiciste y lo que costó.
  for (const eco of opts.consecuencias || []) {
    const elegido = typeof eco === 'string' ? null : eco.eleccion
    const texto = typeof eco === 'string' ? eco : eco.texto
    relato.append(
      el('div', { class: 'eco' }, [
        elegido ? el('p', { class: 'eco-eleccion' }, `— ${elegido}`) : null,
        texto ? el('p', { class: 'consecuencia' }, texto) : null,
      ]),
    )
  }
  if (opts.cerrada && escena.consecuenciaComun) {
    relato.append(el('p', { class: 'consecuencia consecuencia--comun' }, escena.consecuenciaComun))
  }
  const fuentes = renderFuentes(escena)
  if (fuentes) relato.append(fuentes)
  panel.append(relato)

  // ---- Acción: una sola cosa que hacer, siempre a la vista ----------------
  const accion = el('div', { class: 'escena-accion' })
  if (faltanBloques) {
    accion.append(
      el('button', { type: 'button', class: 'boton boton--seguir', onClick: opts.onSeguir }, [
        'Seguir',
        el('span', { class: 'seguir-cuenta', 'aria-hidden': 'true' }, `${revelados}/${bloques.length}`),
      ]),
    )
  } else if (grupo) {
    accion.append(
      renderDecision(escena, grupo, opts.onElegir, { estado, detalle: chipsDeOpcion }),
    )
    const costos = renderCostos(grupo)
    if (costos) accion.append(costos)
  } else if (opts.cerrada) {
    // En la última escena del acto no hay siguiente modo que anunciar: la
    // transición de modo solo se muestra cuando existe una escena que viene.
    if (!opts.esUltima) {
      const transicion = renderTransicion(escena.modoFinal)
      if (transicion) accion.append(transicion)
    }
    accion.append(boton('Continuar', opts.onContinuar, 'boton boton--primario'))
  }
  panel.append(accion)

  seccion.append(panel)
  void jugados
  return seccion
}

/** Chips con el movimiento que promete una opción, dentro de su carta. */
function chipsDeOpcion(opcion) {
  const deltas = opcion?.deltas || {}
  const ejes = EJES.filter((eje) => Number(deltas[eje]))
  if (ejes.length === 0) return null
  return el(
    'span',
    { class: 'decision-chips', 'aria-hidden': 'true' },
    ejes.map((eje) => {
      const d = Number(deltas[eje])
      return el('span', { class: `chip chip--${d > 0 ? 'sube' : 'baja'}` }, `${d > 0 ? '+' : ''}${d} ${NOMBRE_STATS[eje]}`)
    }),
  )
}

function tituloDeActo(acto) {
  const meta = metaActo(acto)
  return meta ? `Acto ${acto} — ${meta.nombre}` : `Acto ${acto}`
}

// ---------------------------------------------------------------------------
// Final de acto
// ---------------------------------------------------------------------------

/**
 * Desenlace del acto (GS-015). Sin copy de victoria ni de derrota.
 * opts: { acto, final, estado, hayMasActos, onContinuar }
 */
export function renderFinalActo(opts = {}) {
  const meta = metaActo(opts.acto)
  const final = opts.final || {}
  const etiqueta = opts.hayMasActos ? 'Seguir' : 'Ver el cierre'

  return pantalla('final', [
    el('p', { class: 'kicker' }, meta ? `Acto ${opts.acto} — ${meta.ciudad}` : `Acto ${opts.acto}`),
    el('h1', { class: 'titulo-final' }, final.nombre || 'Memoria activa'),
    el('p', { class: 'final-descripcion' }, final.descripcion || ''),
    el('h2', { class: 'subtitulo' }, 'Cómo terminas'),
    renderStats(opts.estado?.stats),
    el('div', { class: 'acciones' }, [
      boton(etiqueta, opts.onContinuar, 'boton boton--primario'),
    ]),
  ])
}

// ---------------------------------------------------------------------------
// Cierre §1 — El pulso
// ---------------------------------------------------------------------------

/**
 * Los tres actos a la vez (entregable H §1). Un punto por ciudad con el color
 * del eje dominante y la intensidad de ese eje; los actos sin jugar quedan
 * apagados y sin línea.
 * opts: { finales: [{acto, final, dominante, intensidad}], onContinuar }
 */
export function renderPulso(opts = {}) {
  const finales = opts.finales || []
  const mapa = el('div', { class: 'pulso-mapa', 'aria-hidden': 'true' })
  const lista = el('ul', { class: 'pulso-lista' })

  for (const acto of [1, 2, 3]) {
    const meta = metaActo(acto)
    const registro = finales.find((f) => f.acto === acto) || null
    const punto = el('span', {
      class: `pulso-punto pulso-punto--acto-${acto}${registro ? ` pulso-punto--${registro.dominante}` : ' pulso-punto--apagado'}`,
    })
    punto.style.setProperty('--intensidad', String(registro ? registro.intensidad ?? 1 : 0))
    mapa.append(punto)

    lista.append(
      el('li', { class: registro ? 'pulso-linea' : 'pulso-linea pulso-linea--apagada' }, [
        el('span', { class: 'pulso-ciudad' }, (meta?.ciudad || `Acto ${acto}`).toUpperCase()),
        el('span', { class: 'pulso-final' }, registro ? registro.final?.nombre || '' : ''),
      ]),
    )
  }

  return pantalla('pulso', [
    tituloOculto('El pulso'),
    mapa,
    lista,
    el('p', { class: 'remate' }, 'No se conocieron.'),
    accionesCierre(opts),
  ])
}

// ---------------------------------------------------------------------------
// Cierre §2 — El desgaste
// ---------------------------------------------------------------------------

/**
 * Julio a diciembre de 2014 (entregable H §2). Seis tarjetas y una cifra. La
 * interfaz se degrada tarjeta a tarjeta: la última llega sin marco.
 * opts: { cifras, onContinuar }
 */
export function renderDesgaste(opts = {}) {
  const cifras = opts.cifras || {}
  const tarjetas = el('ol', { class: 'desgaste-tarjetas' })
  ;(cifras.desgaste || []).forEach((t, i) => {
    tarjetas.append(
      el('li', { class: `desgaste-tarjeta desgaste-tarjeta--${i + 1}` }, [
        el('p', { class: 'desgaste-fecha' }, t.fecha),
        el('p', { class: 'desgaste-texto' }, t.texto),
      ]),
    )
  })

  return pantalla('desgaste', [
    tituloOculto('El desgaste'),
    el('p', { class: 'kicker' }, 'Julio a diciembre de 2014'),
    tarjetas,
    el('p', { class: 'remate remate--seco' }, cifras.fraseCierreDesgaste || ''),
    accionesCierre(opts),
  ])
}

// ---------------------------------------------------------------------------
// Cierre §3 — El vaciado (memorial por capas)
// ---------------------------------------------------------------------------

function renderFicha(ficha) {
  const datos = [
    ficha.edad != null ? `${ficha.edad} años` : null,
    ficha.ciudad,
    ficha.fecha,
  ].filter(Boolean)

  return el('li', { class: 'ficha' }, [
    el('p', { class: 'ficha-nombre' }, ficha.nombre),
    el('p', { class: 'ficha-datos' }, datos.join(' · ')),
    ficha.causa ? el('p', { class: 'ficha-causa' }, ficha.causa) : null,
    ficha.nota ? el('p', { class: 'ficha-nota' }, ficha.nota) : null,
    ficha.fuente ? el('p', { class: 'ficha-fuente' }, ficha.fuente) : null,
  ])
}

function renderCapa(capa) {
  const seccion = el('section', { class: `capa capa--${capa.id}` }, [
    el('h2', { class: 'capa-titulo' }, capa.titulo),
  ])
  if (capa.subtitulo) seccion.append(el('p', { class: 'capa-subtitulo' }, capa.subtitulo))

  if (Array.isArray(capa.fichas) && capa.fichas.length > 0) {
    const lista = el('ul', { class: 'fichas' })
    for (const ficha of capa.fichas) lista.append(renderFicha(ficha))
    seccion.append(lista)
  }
  if (Array.isArray(capa.categorias) && capa.categorias.length > 0) {
    const lista = el('ul', { class: 'categorias' })
    for (const c of capa.categorias) lista.append(el('li', null, c))
    seccion.append(lista)
  }
  if (capa.nota) seccion.append(el('p', { class: 'capa-nota' }, capa.nota))
  if (Array.isArray(capa.lineas)) {
    for (const linea of capa.lineas) seccion.append(el('p', { class: 'capa-linea' }, linea))
  }
  return seccion
}

/**
 * Memorial por capas (entregable H §3): cada capa tiene menos datos que la
 * anterior. Sirve tanto al cierre como al acceso desde el menú (§7).
 * opts: { memorial, etiquetaAccion, onContinuar }
 */
export function renderVaciado(opts = {}) {
  const memorial = opts.memorial || {}
  const seccion = pantalla('vaciado', [
    el('h1', { class: 'titulo-memorial' }, memorial.titulo || 'Memorial'),
  ])
  for (const capa of memorial.capas || []) seccion.append(renderCapa(capa))
  seccion.append(
    opts.etiquetaAccion
      ? el('div', { class: 'acciones' }, [
          boton(opts.etiquetaAccion, opts.onContinuar, 'boton boton--primario'),
        ])
      : accionesCierre(opts),
  )
  return seccion
}

// ---------------------------------------------------------------------------
// Materiales desbloqueados (GS-012)
// ---------------------------------------------------------------------------

/**
 * Lo que las decisiones dejaron guardado. Un id sin ficha en el catálogo se
 * ignora: el contenido puede ir por delante del catálogo sin romper nada.
 * opts: { catalogo, desbloqueados: [id], onVolver }
 */
export function renderMateriales(opts = {}) {
  const catalogo = opts.catalogo || {}
  const ids = opts.desbloqueados || []
  const fichas = (catalogo.materiales || []).filter((m) => ids.includes(m.id))

  const seccion = pantalla('materiales', [
    el('h1', { class: 'titulo-materiales' }, catalogo.titulo || 'Materiales'),
  ])

  if (fichas.length === 0) {
    seccion.append(el('p', { class: 'materiales-vacio' }, catalogo.vacio || ''))
  } else {
    const lista = el('ul', { class: 'materiales' })
    for (const m of fichas) {
      lista.append(
        el('li', { class: 'material' }, [
          el('h2', { class: 'material-titulo' }, m.titulo),
          el('p', { class: 'material-origen' }, `Acto ${m.acto} · escena ${m.escena}`),
          el('p', { class: 'material-descripcion' }, m.descripcion),
          m.fuente ? el('p', { class: 'material-fuente' }, m.fuente) : null,
        ]),
      )
    }
    seccion.append(lista)
  }

  seccion.append(
    el('div', { class: 'acciones' }, [
      boton(MENSAJES.volver, opts.onVolver, 'boton boton--primario'),
    ]),
  )
  return seccion
}

// ---------------------------------------------------------------------------
// Cierre §4 — Panfleto
// ---------------------------------------------------------------------------

/**
 * El poema completo, verso por verso sobre negro (entregable H §4). Texto
 * literal del cliente: se pinta tal cual viene de panfleto.json, con atribución.
 * opts: { panfleto, onContinuar }
 */
export function renderPanfleto(opts = {}) {
  const poema = opts.panfleto || {}
  const versos = el('div', { class: 'versos' })
  for (const verso of poema.versos || []) {
    versos.append(el('p', { class: 'verso' }, verso))
  }

  return pantalla('panfleto', [
    tituloOculto(poema.titulo || 'Panfleto'),
    versos,
    el('p', { class: 'atribucion' }, poema.atribucion || ''),
    accionesCierre(opts),
  ])
}

// ---------------------------------------------------------------------------
// Cierre §5 — La cifra
// ---------------------------------------------------------------------------

/**
 * La última pantalla antes de los créditos (entregable H §5): el conteo del
 * OVCS, sin comentario.
 * opts: { cifras, onContinuar }
 */
export function renderCifra(opts = {}) {
  const cifras = opts.cifras || {}
  const bloque = el('div', { class: 'cifra-bloque' })
  for (const linea of cifras.ovcs?.lineas || []) {
    bloque.append(
      linea === ''
        ? el('p', { class: 'cifra-espacio', 'aria-hidden': 'true' }, '·')
        : el('p', { class: 'cifra-linea' }, linea),
    )
  }

  return pantalla('cifra', [
    tituloOculto(cifras.titulo || 'La cifra'),
    bloque,
    accionesCierre(opts),
  ])
}

// ---------------------------------------------------------------------------
// Cierre §6 — Créditos
// ---------------------------------------------------------------------------

/**
 * Nota del proyecto, fuentes con enlace y la línea final (entregable H §6).
 * opts: { cifras, onReiniciar }
 */
export function renderCreditos(opts = {}) {
  const creditos = opts.cifras?.creditos || {}
  const nota = el('div', { class: 'creditos-nota' })
  for (const linea of creditos.nota || []) {
    if (linea === '') nota.append(el('p', { class: 'cifra-espacio', 'aria-hidden': 'true' }, '·'))
    else nota.append(el('p', null, linea))
  }

  const fuentes = el('ul', { class: 'creditos-fuentes' })
  for (const f of creditos.fuentes || []) {
    fuentes.append(
      el('li', null, [
        f.url
          ? el('a', { href: f.url, rel: 'noopener noreferrer', target: '_blank' }, f.medio)
          : f.medio,
      ]),
    )
  }

  return pantalla('creditos', [
    el('h1', { class: 'titulo-creditos' }, 'Créditos'),
    nota,
    renderAutor(),
    el('h2', { class: 'subtitulo' }, 'Fuentes'),
    fuentes,
    el('p', { class: 'remate remate--seco' }, creditos.cierre || ''),
    el('div', { class: 'acciones' }, [
      boton('Volver al inicio', opts.onReiniciar, 'boton'),
    ]),
  ])
}

/**
 * El autor y su libro, en los créditos. El poema que cierra el juego sale de
 * ahí, así que el enlace al poemario va donde va el crédito y no encima del
 * poema, que es el único momento del juego sin nada que tocar.
 */
export function renderAutor() {
  const { nombre, poemario, pdf, twitter } = AUTOR
  const enlaces = el('div', { class: 'autor-enlaces' }, [
    el('a', { class: 'autor-enlace', href: pdf, download: '' }, 'Descargar el poemario en PDF'),
    twitter
      ? el(
          'a',
          { class: 'autor-enlace', href: `https://x.com/${twitter}`, rel: 'noopener noreferrer', target: '_blank' },
          `Seguir a @${twitter} en X`,
        )
      : null,
  ])

  return el('section', { class: 'autor', 'aria-label': 'El autor' }, [
    el('p', { class: 'kicker' }, 'El poema'),
    el('p', { class: 'autor-libro' }, `«Panfleto» pertenece a ${poemario}, de ${nombre}.`),
    enlaces,
  ])
}

// ---------------------------------------------------------------------------
// Menú
// ---------------------------------------------------------------------------

/**
 * Panel del menú. El memorial se abre desde aquí en cualquier momento, sin
 * haber terminado el juego (entregable H §7).
 * opts: { sonido, onMemorial, onSonido, onReiniciar, onCerrar }
 */
export function renderMenu(opts = {}) {
  const cuantos = Number(opts.materiales) || 0
  return el('div', { class: 'menu', role: 'dialog', 'aria-label': 'Menú' }, [
    el('h2', { class: 'menu-titulo' }, 'Menú'),
    el('div', { class: 'menu-acciones' }, [
      boton('Cómo se juega', opts.onTutorial),
      boton('Memorial', opts.onMemorial),
      boton(cuantos > 0 ? `Materiales (${cuantos})` : 'Materiales', opts.onMateriales),
      boton(opts.sonido ? 'Sonido: encendido' : 'Sonido: apagado', opts.onSonido),
      boton('Empezar de nuevo', opts.onReiniciar, 'boton boton--peligro'),
      boton('Cerrar el menú', opts.onCerrar),
    ]),
  ])
}

/**
 * Línea del pie: dónde estás, sin adornos. Solo dice el acto mientras lo estás
 * jugando; en la portada, el memorial y el cierre ya no hay acto que nombrar.
 * ubicacion: { acto, enActo }
 */
export function textoPie(ubicacion = {}) {
  const meta = ubicacion.enActo && ubicacion.acto ? metaActo(ubicacion.acto) : null
  if (meta) return `Acto ${ubicacion.acto} · ${meta.ciudad}`
  return 'Venezuela, 2014'
}
