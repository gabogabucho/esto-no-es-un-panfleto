// @vitest-environment jsdom
// tests/renderers.test.js — Renderers de modo + decisiones + helpers a11y (M2).
// Cubre GS-020 (bloque→DOM por modo), GS-021 (una decisión a la vez,
// requiere fuera del tab), GS-022 (consecuencia aria-live) y focusScene.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderFeed, indicadorSenal } from '../src/modes/feed.js'
import { renderZine } from '../src/modes/zine.js'
import { renderRadio } from '../src/modes/radio.js'
import { renderDecision } from '../src/modes/decision.js'
import { renderTransicion } from '../src/modes/transiciones.js'
import { focusScene, anuncia, regionConsecuencia } from '../src/ui/a11y.js'
import { initEstado } from '../src/state/game-state.js'

import fixFeed from '../src/content/fixtures/feed-fixture.json'
import fixZine from '../src/content/fixtures/zine-fixture.json'
import fixRadio from '../src/content/fixtures/radio-fixture.json'
import fixDoble from '../src/content/fixtures/double-decision.json'

beforeEach(() => {
  document.body.innerHTML = ''
  document.title = 'Esto no es un panfleto'
})

describe('renderFeed (FEED — GS-020)', () => {
  it('construye el timeline: indicador de señal, narración y tarjetas de tweet', () => {
    const c = renderFeed(fixFeed)
    expect(c.classList.contains('modo-feed')).toBe(true)

    // Señal por defecto: estable.
    const indicador = c.querySelector('.senal-indicador')
    expect(indicador).not.toBeNull()
    expect(indicador.getAttribute('aria-label')).toBe('Señal: estable')

    // 2 narraciones + 2 tweets en el fixture.
    expect(c.querySelectorAll('.feed-narracion').length).toBe(2)
    expect(c.querySelectorAll('.feed-tweet').length).toBe(2)

    const primer = c.querySelector('.feed-tweet')
    expect(primer.querySelector('.feed-tweet-autor').textContent).toBe('@resiste_caracas')
    expect(primer.querySelector('.feed-tweet-tiempo').textContent).toBe('14:02')
    expect(primer.querySelector('.feed-tweet-texto').textContent).toContain('Cacerola en Chacao')
    expect(primer.querySelector('.feed-tweet-hashtag').textContent).toBe('#CaracasResiste')
    expect(primer.querySelector('.feed-tweet-metricas').textContent).toContain('230')
  })

  it('respeta el nivel de señal de escena.senal (o opts.senal)', () => {
    const c = renderFeed({ ...fixFeed, senal: { valor: 60, nivel: 2 } })
    expect(c.querySelector('.senal-indicador').getAttribute('aria-label')).toBe('Señal: degradada')
    const c2 = renderFeed(fixFeed, { senal: { valor: 80, nivel: 3 } })
    expect(c2.querySelector('.senal-indicador').getAttribute('aria-label')).toBe('Señal: colapso')
  })

  it('indicadorSenal mapea niveles y nombres', () => {
    expect(indicadorSenal(0).getAttribute('aria-label')).toBe('Señal: estable')
    expect(indicadorSenal(1).getAttribute('aria-label')).toBe('Señal: irregular')
    expect(indicadorSenal(3).getAttribute('aria-label')).toBe('Señal: colapso')
  })

  it('los bloques no compatibles con FEED se omiten sin error', () => {
    const c = renderFeed({
      ...fixFeed,
      bloques: [
        ...fixFeed.bloques,
        { tipo: 'radio', tiempo: '23:41', emisor: 'Base Sur', texto: 'Confirmen, cambio.' },
        { tipo: 'zineTitulo', texto: 'Asamblea' },
        { tipo: 'dialogo', hablante: 'X', texto: 'Hola.' },
      ],
    })
    expect(c.querySelector('.radio-linea')).toBeNull()
    expect(c.querySelector('.zine-titulo')).toBeNull()
    expect(c.querySelectorAll('.feed-tweet').length).toBe(2)
  })

  it('las citas se renderizan como blockquote con autor y fuente', () => {
    const c = renderFeed({
      ...fixFeed,
      bloques: [
        ...fixFeed.bloques,
        { tipo: 'cita', texto: 'Aquí no hay silencio.', autor: 'Vecino', fuente: 'Testimonio' },
      ],
    })
    const bq = c.querySelector('.feed-cita')
    expect(bq).not.toBeNull()
    expect(bq.querySelector('p').textContent).toBe('Aquí no hay silencio.')
    expect(bq.querySelector('cite').textContent).toBe('Vecino — Testimonio')
  })
})

describe('renderZine (ZINE — GS-020)', () => {
  it('construye el volante: zineTitulo, sub, narración y diálogo', () => {
    const c = renderZine(fixZine)
    expect(c.classList.contains('modo-zine')).toBe(true)
    const hoja = c.querySelector('.zine-hoja')
    expect(hoja).not.toBeNull()

    expect(hoja.querySelector('.zine-titulo').textContent).toBe('Asamblea estudiantil')
    expect(hoja.querySelector('.zine-sub').textContent).toBe('Liceo Simón Bolívar — viernes 7 p.m.')
    expect(hoja.querySelectorAll('.zine-narracion').length).toBe(2)

    const dialogo = hoja.querySelector('.zine-dialogo')
    expect(dialogo).not.toBeNull()
    expect(dialogo.querySelector('p').textContent).toContain('Usted no tiene por qué gritar aquí.')
    expect(dialogo.querySelector('.zine-dialogo-hablante').textContent).toBe('— Profesora Méndez')
  })

  it('omite tweets y radios (no aplican en ZINE)', () => {
    const c = renderZine({
      ...fixZine,
      bloques: [
        ...fixZine.bloques,
        { tipo: 'tweet', autor: '@x', tiempo: '14:00', texto: 'Tuit ajeno al volante.' },
      ],
    })
    expect(c.querySelector('.feed-tweet')).toBeNull()
  })
})

describe('renderRadio (RADIO — GS-020)', () => {
  it('construye la bitácora: timestamps [hora], emisor, "cambio" y cursor', () => {
    const c = renderRadio(fixRadio)
    expect(c.classList.contains('modo-radio')).toBe(true)

    const linea = c.querySelector('.radio-linea')
    expect(linea.querySelector('.radio-tiempo').textContent).toBe('[23:41]')
    expect(linea.querySelector('.radio-emisor').textContent).toBe('Base Sur')
    expect(linea.textContent).toContain('Grupo Halcón, confirmen posición')
    expect(linea.querySelector('.radio-cambio').textContent).toBe(' — cambio')

    // Narración como línea de sistema.
    const sistema = c.querySelector('.radio-sistema')
    expect(sistema.textContent.startsWith('> ')).toBe(true)

    // Diálogo como cháchara de radio.
    const dialogo = c.querySelector('.radio-dialogo')
    expect(dialogo.querySelector('.radio-hablante').textContent).toBe('— Primo Roldán: ')
    expect(dialogo.textContent).toContain('Vos tenéis la radio encendida')

    // Cursor decorativo.
    expect(c.querySelector('.radio-cursor').textContent).toBe('>> _')
  })
})

describe('renderDecision (GS-021/022)', () => {
  it('renderiza un grupo como UN form con N botones', () => {
    const fn = vi.fn()
    const g = fixFeed.grupos[0]
    const form = renderDecision(fixFeed, g, fn)
    expect(form.tagName).toBe('FORM')
    expect(form.classList.contains('decision-group')).toBe(true)
    expect(form.dataset.grupo).toBe('g1')

    const botones = form.querySelectorAll('button.decision')
    expect(botones.length).toBe(3)
    botones.forEach((b, i) => {
      expect(b.dataset.opcion).toBe(String(i))
      expect(b.getAttribute('aria-label')).toBe(g.opciones[i].label)
      expect(b.textContent).toBe(g.opciones[i].label)
      expect(b.classList.contains('decision')).toBe(true) // min-height 56px por CSS
    })
  })

  it('llama onElegir(index, opcion) en click (no en hover)', () => {
    const fn = vi.fn()
    const g = fixFeed.grupos[0]
    const form = renderDecision(fixFeed, g, fn)
    const botones = form.querySelectorAll('button.decision')

    // Hover NO dispara la elección.
    botones[0].dispatchEvent(new MouseEvent('mouseover'))
    expect(fn).not.toHaveBeenCalled()

    botones[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1, g.opciones[1])
  })

  it('renderiza el título del grupo y lo asocia al form (aria-labelledby)', () => {
    const form = renderDecision(fixFeed, fixFeed.grupos[0], () => {})
    const titulo = form.querySelector('.grupo-titulo')
    expect(titulo.textContent).toBe('Decisión — la plaza.')
    expect(form.getAttribute('aria-labelledby')).toBe(titulo.id)
  })

  it('sin título usa aria-label "Decisiones"', () => {
    const form = renderDecision(fixFeed, { id: 'gx', opciones: [{ label: 'A' }, { label: 'B' }] }, () => {})
    expect(form.querySelector('.grupo-titulo')).toBeNull()
    expect(form.getAttribute('aria-label')).toBe('Decisiones')
  })

  it('una opción con requiere no cumplido queda fuera del árbol de foco (Z-08)', () => {
    const g2 = fixDoble.grupos[1] // "Regresas al punto de encuentro." requiere 'sigue-multitud'
    const estado = initEstado({ rol: 'vocero', acto: 2 }) // sin el flag
    const form1 = renderDecision(fixDoble, g2, () => {}, { estado })
    const oculta = form1.querySelector('button[data-opcion="2"]')
    expect(oculta.hidden).toBe(true)
    expect(oculta.getAttribute('aria-disabled')).toBe('true')

    const conFlag = renderDecision(fixDoble, g2, () => {}, {
      estado: { ...estado, flags: { 'sigue-multitud': true } },
    })
    expect(conFlag.querySelector('button[data-opcion="2"]').hidden).toBe(false)
  })

  it('una opción con costo no satisfecho queda deshabilitada (GS-011)', () => {
    const g2 = fixDoble.grupos[1] // "Compartes el agua..." costo agua: 1
    const estActo1 = initEstado({ rol: 'vocero', acto: 1 }) // agua: 0
    const form1 = renderDecision(fixDoble, g2, () => {}, { estado: estActo1 })
    expect(form1.querySelector('button[data-opcion="1"]').disabled).toBe(true)

    const estActo2 = initEstado({ rol: 'vocero', acto: 2 }) // agua: 1
    const form2 = renderDecision(fixDoble, g2, () => {}, { estado: estActo2 })
    expect(form2.querySelector('button[data-opcion="1"]').disabled).toBe(false)
  })

  it('una decisión a la vez: solo el grupo actual es visible (GS-021)', () => {
    const estado = initEstado({ rol: 'vocero', acto: 2 })
    const zona = document.createElement('div')
    zona.append(renderDecision(fixDoble, fixDoble.grupos[0], () => {}, { estado }))
    zona.append(renderDecision(fixDoble, fixDoble.grupos[1], () => {}, { estado, oculto: true }))

    const visibles = Array.from(zona.querySelectorAll('.decision-group')).filter((g) => !g.hidden)
    expect(visibles).toHaveLength(1)
    expect(visibles[0].dataset.grupo).toBe('g1')
  })

  it('grupo resuelto queda aria-disabled (GS-021)', () => {
    const form = renderDecision(fixFeed, fixFeed.grupos[0], () => {}, { resuelto: true })
    expect(form.getAttribute('aria-disabled')).toBe('true')
    expect(form.hidden).toBe(false) // se ve pero no es interactivo
  })
})

describe('a11y: focusScene (GS-022)', () => {
  it('mueve el foco al primer control interactivo del contenedor', () => {
    const zona = document.createElement('div')
    document.body.append(zona)
    const btn = document.createElement('button')
    btn.textContent = 'Entrar'
    zona.append(btn)
    const enfocado = focusScene(zona)
    expect(enfocado).toBe(btn)
    expect(document.activeElement).toBe(btn)
  })

  it('sin controles, enfoca el contenedor con tabindex=-1', () => {
    const zona = document.createElement('div')
    document.body.append(zona)
    const enfocado = focusScene(zona)
    expect(enfocado).toBe(zona)
    expect(zona.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(zona)
  })

  it('no falla con un contenedor vacío o nulo', () => {
    expect(focusScene(null)).toBeNull()
    expect(focusScene(document.createElement('div'))).not.toBeNull()
  })
})

describe('a11y: anuncia / región aria-live (GS-022)', () => {
  it('crea la región #consecuencia-live una sola vez y la reutiliza', () => {
    anuncia('La primera consecuencia.')
    const r1 = document.querySelector('#consecuencia-live')
    expect(r1).not.toBeNull()
    expect(r1.getAttribute('aria-live')).toBe('polite')
    expect(r1.textContent).toBe('La primera consecuencia.')

    anuncia('Segunda consecuencia.')
    expect(document.querySelectorAll('#consecuencia-live')).toHaveLength(1)
    expect(r1.textContent).toBe('Segunda consecuencia.')
  })

  it('la región se inserta dentro de <main> si existe (landmarks)', () => {
    const main = document.createElement('main')
    document.body.append(main)
    const r = regionConsecuencia()
    expect(main.contains(r)).toBe(true)
  })
})

describe('renderTransicion (GS-004)', () => {
  it('renderiza el separador "— ZINE —" con nombre accesible', () => {
    const t = renderTransicion('ZINE')
    expect(t).not.toBeNull()
    expect(t.classList.contains('transicion')).toBe(true)
    expect(t.querySelector('.transicion-texto').textContent).toBe('— ZINE —')
    expect(t.getAttribute('aria-label')).toBe('Cambio de modo: Modo volante')
  })

  it('sin modoFinal devuelve null', () => {
    expect(renderTransicion(null)).toBeNull()
    expect(renderTransicion(undefined)).toBeNull()
    expect(renderTransicion('')).toBeNull()
  })
})
