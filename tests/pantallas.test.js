// @vitest-environment jsdom
// tests/pantallas.test.js — Pantallas del shell (M4).
// axe-core sobre cada pantalla montada como documento completo (GS-080) y
// verificación de que el cierre del entregable H pinta el contenido exacto de
// src/content (poema literal, seis tarjetas del desgaste, cuatro capas del
// vaciado, la cifra del OVCS y los créditos).

import { describe, it, expect } from 'vitest'
import axe from 'axe-core'
import * as pantallas from '../src/ui/pantallas.js'
import { initEstado } from '../src/state/game-state.js'
import { escenaPorId } from '../src/content/escenas.js'
import { renderDecision } from '../src/modes/decision.js'

/** Saca del foco los botones de un grupo resuelto, como hace el shell. */
const inertarParaTest = (form) => {
  for (const b of form.querySelectorAll('button')) b.tabIndex = -1
}
import rolesData from '../src/content/roles.json'
import memorialData from '../src/content/memorial.json'
import cifrasData from '../src/content/cifras.json'
import panfletoData from '../src/content/panfleto.json'
import materialesData from '../src/content/materiales.json'
import finalesData from '../src/content/finales.json'

const noop = () => {}

/** Monta una pantalla en un documento con los mismos landmarks que index.html. */
function montar(nodo) {
  document.documentElement.lang = 'es-VE'
  document.body.innerHTML = `
    <a class="skip-link" href="#main">Saltar al contenido</a>
    <header class="encabezado"><nav aria-label="Principal"></nav></header>
    <main id="main" tabindex="-1"></main>
    <footer class="pie"><p id="pie-texto"></p></footer>
  `
  document.querySelector('#main').append(nodo)
  return nodo
}

/** Violaciones de axe sin color-contrast (se mide en tests/contrast.test.js). */
async function violacionesAxe() {
  const resultados = await axe.run(document.body, {
    resultTypes: ['violations'],
    rules: { 'color-contrast': { enabled: false } },
  })
  return resultados.violations.map((v) => `${v.id}: ${v.nodes.length} nodo(s)`)
}

const estadoDemo = () => initEstado({ rol: 'vocero', acto: 2 })

const PANTALLAS = [
  ['inicio', () => pantallas.renderInicio({ hayGuardado: true, onContinuar: noop, onNueva: noop })],
  ['rol', () => pantallas.renderRoles({ acto: 1, roles: rolesData.roles, onElegir: noop })],
  [
    'escena en curso',
    () =>
      pantallas.renderEscena(escenaPorId('T-02'), {
        estado: estadoDemo(),
        jugados: [],
        grupoActual: 'g1',
        onElegir: noop,
      }),
  ],
  [
    'escena cerrada',
    () =>
      pantallas.renderEscena(escenaPorId('C-01'), {
        estado: estadoDemo(),
        jugados: ['g1'],
        grupoActual: null,
        cerrada: true,
        onContinuar: noop,
      }),
  ],
  [
    'final de acto',
    () =>
      pantallas.renderFinalActo({
        acto: 2,
        final: finalesData.actos['2']['memoria-activa'],
        estado: estadoDemo(),
        hayMasActos: true,
        onContinuar: noop,
      }),
  ],
  [
    'pulso',
    () =>
      pantallas.renderPulso({
        finales: [{ acto: 1, final: { nombre: 'Memoria activa' }, dominante: 'CO', intensidad: 0.6 }],
        onContinuar: noop,
      }),
  ],
  ['desgaste', () => pantallas.renderDesgaste({ cifras: cifrasData, onContinuar: noop })],
  ['vaciado', () => pantallas.renderVaciado({ memorial: memorialData, onContinuar: noop })],
  ['panfleto', () => pantallas.renderPanfleto({ panfleto: panfletoData, onContinuar: noop })],
  ['cifra', () => pantallas.renderCifra({ cifras: cifrasData, onContinuar: noop })],
  ['creditos', () => pantallas.renderCreditos({ cifras: cifrasData, onReiniciar: noop })],
  [
    'materiales',
    () =>
      pantallas.renderMateriales({
        catalogo: materialesData,
        desbloqueados: ['material-candelaria'],
        onVolver: noop,
      }),
  ],
]

describe('axe por pantalla del shell (GS-080)', () => {
  it.each(PANTALLAS)('%s sin violaciones críticas', async (_nombre, construir) => {
    montar(construir())
    expect(await violacionesAxe()).toEqual([])
  })

  it('el menú también pasa axe', async () => {
    montar(
      pantallas.renderMenu({
        sonido: false,
        materiales: 2,
        onMemorial: noop,
        onMateriales: noop,
        onSonido: noop,
        onReiniciar: noop,
        onCerrar: noop,
      }),
    )
    // El panel es lo único en main: se le añade un h1 como en el render real.
    document.querySelector('#main').prepend(pantallas.renderInicio({ onNueva: noop }))
    expect(await violacionesAxe()).toEqual([])
  })

  it('la portada muestra el conteo de partidas cuando ya se jugó', () => {
    const sinJugar = montar(pantallas.renderInicio({ onNueva: noop, conteo: { iniciadas: 0, completadas: 0 } }))
    expect(sinJugar.querySelector('.conteo-juego')).toBeNull()

    const jugada = montar(pantallas.renderInicio({ onNueva: noop, conteo: { iniciadas: 3, completadas: 1 } }))
    expect(jugada.querySelector('.conteo-juego').textContent).toContain('Jugado 3 veces')

    const una = montar(pantallas.renderInicio({ onNueva: noop, conteo: { iniciadas: 1, completadas: 0 } }))
    expect(una.querySelector('.conteo-juego').textContent).toContain('Jugado 1 vez')
  })
})

describe('escena', () => {
  it('un grupo resuelto queda a la vista pero fuera del foco (GS-021)', () => {
    // La escena ya no apila cartas muertas: el registro de lo elegido vive en
    // el relato. El modo resuelto del renderer se prueba donde vive.
    const escena = escenaPorId('T-02')
    const nodo = montar(
      renderDecision(escena, escena.grupos[0], noop, { estado: estadoDemo(), resuelto: true }),
    )
    inertarParaTest(nodo)
    const resuelto = nodo
    expect(resuelto.hasAttribute('hidden')).toBe(false)
    expect(resuelto.getAttribute('aria-disabled')).toBe('true')
    for (const b of resuelto.querySelectorAll('button')) expect(b.tabIndex).toBe(-1)
  })

  it('un grupo resuelto se renderiza sin callback y no dispara nada', () => {
    let llamadas = 0
    const escena = escenaPorId('T-02')
    const resuelto = montar(
      renderDecision(escena, escena.grupos[0], null, { estado: estadoDemo(), resuelto: true }),
    )
    resuelto.querySelector('button').click()
    expect(llamadas).toBe(0)

    const activo = montar(
      renderDecision(escena, escena.grupos[0], () => (llamadas += 1), { estado: estadoDemo() }),
    )
    activo.querySelector('button').click()
    expect(llamadas).toBe(1)
  })

  it('el rótulo va sobre la imagen y el estado cabe en una barra', () => {
    const escena = escenaPorId('Z-05')
    const nodo = montar(
      pantallas.renderEscena(escena, { estado: initEstado({ rol: 'vocero', acto: 3 }), jugados: [], grupoActual: 'g1' }),
    )
    expect(nodo.querySelector('.escena-escenario .escena-acto').textContent).toContain('Acto 3')
    expect(nodo.querySelector('.escena-lugar').textContent).toContain(escena.lugar)
    expect(nodo.querySelectorAll('.hud .hud-eje')).toHaveLength(5)
    expect(nodo.querySelectorAll('.hud .hud-item')).toHaveLength(4)
  })

  it('en ZINE y RADIO el indicador de La Señal lo pone el HUD; en FEED, el modo', () => {
    const radio = montar(
      pantallas.renderEscena(escenaPorId('Z-05'), { estado: estadoDemo(), jugados: [], grupoActual: 'g1' }),
    )
    expect(radio.querySelectorAll('.senal-indicador')).toHaveLength(1)
    expect(radio.querySelector('.hud .senal-indicador')).toBeTruthy()

    const feed = montar(
      pantallas.renderEscena(escenaPorId('C-01'), { estado: estadoDemo(), jugados: [], grupoActual: 'g1' }),
    )
    expect(feed.querySelectorAll('.senal-indicador')).toHaveLength(1)
    expect(feed.querySelector('.hud .senal-indicador')).toBeNull()
  })

  it('avisa del costo de inventario del grupo en curso (GS-011)', () => {
    const nodo = montar(
      pantallas.renderEscena(escenaPorId('T-04'), {
        estado: initEstado({ rol: 'vocero', acto: 1 }),
        jugados: [],
        grupoActual: 'g1',
        onElegir: noop,
      }),
    )
    expect(nodo.querySelector('.costos').textContent).toContain('contacto')
  })

  it('no pinta capa de foto si la escena no tiene archivo verificado (R3)', () => {
    const nodo = montar(
      pantallas.renderEscena(escenaPorId('C-01'), { estado: estadoDemo(), jugados: [], grupoActual: 'g1' }),
    )
    expect(nodo.querySelector('.foto-archivo')).toBeNull()
  })

  it('los deltas del último movimiento se marcan en el HUD', () => {
    const nodo = montar(
      pantallas.renderEscena(escenaPorId('C-01'), {
        estado: estadoDemo(),
        jugados: [],
        grupoActual: 'g1',
        deltas: { CO: 2, CF: -1 },
      }),
    )
    const deltas = [...nodo.querySelectorAll('.hud-eje-delta')].map((n) => n.textContent)
    expect(deltas).toEqual(['+2', '-1'])
  })

  it('el ítem de inventario que cambió se marca en el HUD (FG-05)', () => {
    const nodo = montar(
      pantallas.renderEscena(escenaPorId('C-01'), {
        estado: estadoDemo(),
        jugados: [],
        grupoActual: 'g1',
        deltasInventario: { agua: -1, gasa: 1 },
      }),
    )
    const deltas = [...nodo.querySelectorAll('.hud-item-delta')].map((n) => n.textContent)
    expect(deltas).toEqual(['-1', '+1'])
    expect(nodo.querySelector('.hud-item--baja')).toBeTruthy()
    expect(nodo.querySelector('.hud-item--sube')).toBeTruthy()
  })
})

describe('cierre — entregable H', () => {
  it('el pulso apaga los actos que no se jugaron y remata sin adjetivos', () => {
    const nodo = montar(
      pantallas.renderPulso({
        finales: [{ acto: 2, final: { nombre: 'Voz internacional' }, dominante: 'RE', intensidad: 0.7 }],
        onContinuar: noop,
      }),
    )
    expect(nodo.querySelectorAll('.pulso-punto')).toHaveLength(3)
    expect(nodo.querySelectorAll('.pulso-punto--apagado')).toHaveLength(2)
    expect(nodo.querySelectorAll('.pulso-linea--apagada')).toHaveLength(2)
    expect(nodo.querySelector('.remate').textContent).toBe('No se conocieron.')
  })

  it('el desgaste son seis tarjetas y una sola cifra', () => {
    const nodo = montar(pantallas.renderDesgaste({ cifras: cifrasData, onContinuar: noop }))
    expect(nodo.querySelectorAll('.desgaste-tarjeta')).toHaveLength(6)
    expect(nodo.querySelector('.remate--seco').textContent).toBe(cifrasData.fraseCierreDesgaste)
  })

  it('el vaciado baja de 43 fichas a cuatro palabras sin dato', () => {
    const nodo = montar(pantallas.renderVaciado({ memorial: memorialData, onContinuar: noop }))
    const capas = nodo.querySelectorAll('.capa')
    expect(capas).toHaveLength(4)
    expect(nodo.querySelectorAll('.capa--capa-1 .ficha')).toHaveLength(43)
    expect(nodo.querySelectorAll('.capa--capa-2 .categorias li')).toHaveLength(5)
    expect(nodo.querySelector('.capa--capa-3 .capa-nota').textContent).toContain('1.854')
    expect(nodo.querySelectorAll('.capa--capa-4 .ficha')).toHaveLength(0)
    expect(nodo.querySelectorAll('.capa--capa-4 .capa-linea')).toHaveLength(3)
  })

  it('el panfleto es el poema literal completo con su atribución', () => {
    const nodo = montar(pantallas.renderPanfleto({ panfleto: panfletoData, onContinuar: noop }))
    const versos = [...nodo.querySelectorAll('.verso')].map((n) => n.textContent)
    expect(versos).toEqual(panfletoData.versos)
    expect(nodo.querySelector('.atribucion').textContent).toBe(panfletoData.atribucion)
  })

  it('la cifra pinta las líneas del OVCS y los blancos quedan fuera de SR', () => {
    const nodo = montar(pantallas.renderCifra({ cifras: cifrasData, onContinuar: noop }))
    const lineas = [...nodo.querySelectorAll('.cifra-linea')].map((n) => n.textContent)
    expect(lineas).toEqual(cifrasData.ovcs.lineas.filter((l) => l !== ''))
    for (const hueco of nodo.querySelectorAll('.cifra-espacio')) {
      expect(hueco.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('los créditos enlazan las fuentes y cierran con la línea del proyecto', () => {
    const nodo = montar(pantallas.renderCreditos({ cifras: cifrasData, onReiniciar: noop }))
    const enlaces = nodo.querySelectorAll('.creditos-fuentes a')
    expect(enlaces.length).toBe(cifrasData.creditos.fuentes.filter((f) => f.url).length)
    expect(nodo.querySelector('.remate--seco').textContent).toBe(cifrasData.creditos.cierre)
  })
})

describe('utilidades', () => {
  it('metaActo devuelve la ciudad de cada acto', () => {
    expect(pantallas.metaActo(1).ciudad).toBe('San Cristóbal')
    expect(pantallas.metaActo(3).ciudad).toBe('Maracaibo')
    expect(pantallas.metaActo(9)).toBeNull()
  })

  it('textoPie nombra el acto solo mientras se juega', () => {
    expect(pantallas.textoPie({ acto: 2, enActo: true })).toContain('Caracas')
    expect(pantallas.textoPie({ acto: null, enActo: true })).toBe('Venezuela, 2014')
    // En el cierre ya no hay acto que nombrar aunque quede el último en sesión.
    expect(pantallas.textoPie({ acto: 3, enActo: false })).toBe('Venezuela, 2014')
  })

  it('la portada sin guardado no ofrece continuar', () => {
    const nodo = montar(pantallas.renderInicio({ hayGuardado: false, onNueva: noop }))
    const textos = [...nodo.querySelectorAll('button')].map((b) => b.textContent)
    expect(textos).not.toContain('Continuar la partida')
    expect(textos).toEqual(['Empezar', 'Cómo se juega'])
  })

  it('la portada con guardado ofrece continuar, empezar de nuevo y el tutorial', () => {
    const nodo = montar(pantallas.renderInicio({ hayGuardado: true, onNueva: noop, onContinuar: noop }))
    const textos = [...nodo.querySelectorAll('button')].map((b) => b.textContent)
    expect(textos).toEqual(['Continuar la partida', 'Empezar de nuevo', 'Cómo se juega'])
  })

  it('el tutorial pinta las cuatro tarjetas y cierra con la acción', () => {
    const nodo = montar(pantallas.renderTutorial({ etiqueta: 'Entendido', onVolver: noop }))
    expect(nodo.querySelectorAll('.tutorial-paso').length).toBe(4)
    const cerrar = [...nodo.querySelectorAll('button')].map((b) => b.textContent)
    expect(cerrar).toEqual(['Entendido'])
  })
})

describe('materiales desbloqueados (GS-012)', () => {
  it('solo lista los ids que tienen ficha en el catálogo', () => {
    const nodo = montar(
      pantallas.renderMateriales({
        catalogo: materialesData,
        desbloqueados: ['material-otro-angulo', 'no-existe-en-el-catalogo'],
        onVolver: noop,
      }),
    )
    const titulos = [...nodo.querySelectorAll('.material-titulo')].map((n) => n.textContent)
    expect(titulos).toEqual(['Cuarenta segundos desde el edificio de enfrente'])
  })

  it('sin materiales explica cómo se consiguen, en vez de dejar la pantalla vacía', () => {
    const nodo = montar(
      pantallas.renderMateriales({ catalogo: materialesData, desbloqueados: [], onVolver: noop }),
    )
    expect(nodo.querySelectorAll('.material')).toHaveLength(0)
    expect(nodo.querySelector('.materiales-vacio').textContent).toBe(materialesData.vacio)
  })

  it('el menú cuenta cuántos hay', () => {
    const conCero = pantallas.renderMenu({ materiales: 0, onMateriales: noop })
    const conDos = pantallas.renderMenu({ materiales: 2, onMateriales: noop })
    const texto = (n) => [...n.querySelectorAll('button')].map((b) => b.textContent)
    expect(texto(conCero)).toContain('Materiales')
    expect(texto(conDos)).toContain('Materiales (2)')
  })
})

describe('saltar el cierre (entregable H §7)', () => {
  const CIERRE = [
    ['pulso', (o) => pantallas.renderPulso({ finales: [], ...o })],
    ['desgaste', (o) => pantallas.renderDesgaste({ cifras: cifrasData, ...o })],
    ['vaciado', (o) => pantallas.renderVaciado({ memorial: memorialData, ...o })],
    ['panfleto', (o) => pantallas.renderPanfleto({ panfleto: panfletoData, ...o })],
    ['cifra', (o) => pantallas.renderCifra({ cifras: cifrasData, ...o })],
  ]

  it.each(CIERRE)('%s no ofrece saltar si el shell no pasa onSaltar', (_n, construir) => {
    const nodo = montar(construir({ onContinuar: noop }))
    const textos = [...nodo.querySelectorAll('.acciones button')].map((b) => b.textContent)
    expect(textos).toEqual(['Continuar'])
  })

  it.each(CIERRE)('%s ofrece saltar cuando el shell lo habilita', (_n, construir) => {
    let saltos = 0
    const nodo = montar(construir({ onContinuar: noop, onSaltar: () => (saltos += 1) }))
    const boton = [...nodo.querySelectorAll('.acciones button')].find(
      (b) => b.textContent === 'Saltar el cierre',
    )
    expect(boton).toBeTruthy()
    boton.click()
    expect(saltos).toBe(1)
  })

  it('el memorial abierto desde el menú nunca ofrece saltar', () => {
    const nodo = montar(
      pantallas.renderVaciado({ memorial: memorialData, etiquetaAccion: 'Volver', onContinuar: noop }),
    )
    const textos = [...nodo.querySelectorAll('.acciones button')].map((b) => b.textContent)
    expect(textos).toEqual(['Volver'])
  })
})

describe('banda sonora sugerida (portada)', () => {
  it('enlaza el disco sin el token de compartir y avisa que sale del juego', () => {
    const nodo = montar(pantallas.renderInicio({ hayGuardado: false, onNueva: noop }))
    const enlace = nodo.querySelector('.banda-sonora-enlace')

    expect(enlace.getAttribute('href')).toBe(pantallas.BANDA_SONORA.url)
    // El ?si= de Spotify identifica la cuenta de quien comparte: no viaja.
    expect(enlace.getAttribute('href')).not.toContain('?si=')
    expect(enlace.getAttribute('rel')).toContain('noopener')
    expect(enlace.getAttribute('target')).toBe('_blank')
    expect(enlace.textContent.trim().length).toBeGreaterThan(0)
    expect(nodo.querySelector('.banda-sonora-nota').textContent).toContain('conexión')
  })

  it('nombra disco, artista y año', () => {
    const nodo = montar(pantallas.renderInicio({ hayGuardado: false, onNueva: noop }))
    const texto = nodo.querySelector('.banda-sonora-disco').textContent
    expect(texto).toContain(pantallas.BANDA_SONORA.album)
    expect(texto).toContain(pantallas.BANDA_SONORA.artista)
    expect(texto).toContain(String(pantallas.BANDA_SONORA.anio))
  })

  it('es una recomendación, no un reproductor: nada se incrusta ni suena solo', () => {
    const nodo = montar(pantallas.renderInicio({ hayGuardado: false, onNueva: noop }))
    expect(nodo.querySelectorAll('iframe, audio, video')).toHaveLength(0)
  })
})

describe('banda ilustrada', () => {
  it('una escena sin ilustración no pinta banda', () => {
    // Escena inventada, sin bloque de ilustración: no hay banda que pintar.
    expect(pantallas.renderIlustracion({ id: 'X-01', acto: 1, modo: 'FEED' })).toBeNull()
    expect(pantallas.renderIlustracion({})).toBeNull()
    expect(pantallas.renderIlustracion(null)).toBeNull()
  })

  it('T-07 trae banda con capa, tinte y descripción, y sin niebla (no es RADIO)', () => {
    const nodo = montar(pantallas.renderIlustracion(escenaPorId('T-07')))
    expect(nodo.getAttribute('role')).toBe('img')
    expect(nodo.getAttribute('aria-label')).toBe(escenaPorId('T-07').ilustracion.alt)
    expect(nodo.className).toContain('ilustracion--acto-1')
    expect(nodo.querySelectorAll('.ilustracion-capa')).toHaveLength(1)
    expect(nodo.querySelector('.ilustracion-tinte')).toBeTruthy()
    expect(nodo.querySelector('.ilustracion-niebla')).toBeNull()
  })

  it('Z-05 es RADIO y por eso lleva niebla', () => {
    const nodo = montar(pantallas.renderIlustracion(escenaPorId('Z-05')))
    expect(nodo.className).toContain('ilustracion--radio')
    expect(nodo.className).toContain('ilustracion--niebla')
    expect(nodo.querySelector('.ilustracion-niebla')).toBeTruthy()
  })

  it('las capas quedan mudas: la descripción va una sola vez, en el contenedor', () => {
    const nodo = montar(pantallas.renderIlustracion(escenaPorId('C-06')))
    for (const img of nodo.querySelectorAll('img')) expect(img.getAttribute('alt')).toBe('')
    expect(nodo.querySelectorAll('[aria-label]')).toHaveLength(0)
  })

  it('cada capa declara su factor de parallax', () => {
    const nodo = montar(pantallas.renderIlustracion(escenaPorId('C-06')))
    for (const capa of nodo.querySelectorAll('.ilustracion-capa')) {
      expect(Number(capa.style.getPropertyValue('--factor'))).toBeGreaterThan(0)
    }
  })

  it('la escena abre con el escenario y deja el texto en su propio panel', () => {
    const nodo = montar(
      pantallas.renderEscena(escenaPorId('T-07'), { estado: estadoDemo(), jugados: [], grupoActual: 'g1' }),
    )
    const hijos = [...nodo.children].map((n) => n.className.split(' ')[0])
    expect(hijos).toEqual(['escena-escenario', 'escena-panel'])
    expect(nodo.querySelector('.escena-escenario .ilustracion')).toBeTruthy()
    // El relato es lo único que scrollea; la acción vive aparte y a la vista.
    expect(nodo.querySelector('.escena-panel > .escena-relato')).toBeTruthy()
    expect(nodo.querySelector('.escena-panel > .escena-accion')).toBeTruthy()
  })

  it('la banda ilustrada no rompe axe', async () => {
    montar(
      pantallas.renderEscena(escenaPorId('Z-05'), {
        estado: initEstado({ rol: 'vocero', acto: 3 }),
        jugados: [],
        grupoActual: 'g1',
        onElegir: noop,
      }),
    )
    expect(await violacionesAxe()).toEqual([])
  })
})

describe('el autor en los créditos', () => {
  it('enlaza el poemario en PDF, con atributo de descarga', () => {
    const nodo = montar(pantallas.renderCreditos({ cifras: cifrasData, onReiniciar: noop }))
    const pdf = [...nodo.querySelectorAll('.autor-enlace')].find((a) =>
      a.getAttribute('href').endsWith('.pdf'),
    )
    expect(pdf).toBeTruthy()
    expect(pdf.getAttribute('href')).toBe(pantallas.AUTOR.pdf)
    expect(pdf.hasAttribute('download')).toBe(true)
  })

  it('nombra el libro del que sale el poema y a su autor', () => {
    const nodo = montar(pantallas.renderAutor())
    const texto = nodo.querySelector('.autor-libro').textContent
    expect(texto).toContain(pantallas.AUTOR.poemario)
    expect(texto).toContain(pantallas.AUTOR.nombre)
  })

  it('sin handle no hay enlace a Twitter: no se inventa una cuenta', () => {
    const nodo = montar(pantallas.renderAutor())
    const enlaces = [...nodo.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    if (pantallas.AUTOR.twitter === null) {
      expect(enlaces.some((h) => h.includes('twitter.com'))).toBe(false)
    } else {
      expect(enlaces.some((h) => h.includes(pantallas.AUTOR.twitter))).toBe(true)
    }
  })

  it('el poema en pantalla sigue limpio: ahí no se vende nada', () => {
    const nodo = montar(pantallas.renderPanfleto({ panfleto: panfletoData, onContinuar: noop }))
    expect(nodo.querySelectorAll('a')).toHaveLength(0)
  })

  it('los créditos con el bloque del autor pasan axe', async () => {
    montar(pantallas.renderCreditos({ cifras: cifrasData, onReiniciar: noop }))
    expect(await violacionesAxe()).toEqual([])
  })
})
