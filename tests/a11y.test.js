// @vitest-environment jsdom
// tests/a11y.test.js — axe-core por modo (GS-080 / R2 / R3 convención).
// Cada fixture renderizado completo (renderer + decisión + región aria-live)
// debe salir sin violaciones, salvo color-contrast (AA se re-verifica en
// pantallas reales en T-044/M5). Además se asevera la regla "una decisión a
// la vez" (GS-021) y la convención R3: texto visible en canvas no
// aria-hidden = fail (aquí no hay canvas: el texto narrativo vive en DOM).

import { describe, it, expect, beforeEach } from 'vitest'
import axe from 'axe-core'
import { renderFeed } from '../src/modes/feed.js'
import { renderZine } from '../src/modes/zine.js'
import { renderRadio } from '../src/modes/radio.js'
import { renderDecision } from '../src/modes/decision.js'
import { regionConsecuencia } from '../src/ui/a11y.js'
import { initEstado } from '../src/state/game-state.js'

import fixFeed from '../src/content/fixtures/feed-fixture.json'
import fixZine from '../src/content/fixtures/zine-fixture.json'
import fixRadio from '../src/content/fixtures/radio-fixture.json'
import fixDoble from '../src/content/fixtures/double-decision.json'

const RENDERERS = { FEED: renderFeed, ZINE: renderZine, RADIO: renderRadio }

/** Monta un documento completo (skip-link, main, h1) con la escena renderizada. */
function montarEscena(escena) {
  document.documentElement.lang = 'es-VE'
  document.body.innerHTML = `
    <header class="encabezado">
      <a class="skip-link" href="#main">Saltar al contenido</a>
    </header>
    <main id="main">
      <h1>Esto no es un panfleto</h1>
      <div id="escena"></div>
    </main>
  `
  const zona = document.getElementById('escena')
  zona.append(RENDERERS[escena.modo](escena))
  zona.append(
    renderDecision(escena, escena.grupos[0], () => {}, {
      estado: initEstado({ rol: 'vocero', acto: escena.acto }),
    }),
  )
  regionConsecuencia()
  return zona
}

/**
 * Violaciones de axe sin color-contrast (se revisa manualmente en pantallas
 * reales en M5/T-044). La regla se desactiva en la corrida: su medición de
 * ligaduras usa canvas.getContext, que jsdom no implementa (ruido en stderr).
 */
async function violacionesAxe() {
  const resultados = await axe.run(document.body, {
    resultTypes: ['violations'],
    rules: { 'color-contrast': { enabled: false } },
  })
  return resultados.violations.filter((v) => v.id !== 'color-contrast')
}

describe('axe por modo (GS-080)', () => {
  it.each([
    ['FEED', fixFeed],
    ['ZINE', fixZine],
    ['RADIO', fixRadio],
    ['doble decisión (FEED)', fixDoble],
  ])('escena %s sin violaciones críticas', async (_nombre, escena) => {
    montarEscena(escena)
    const violaciones = await violacionesAxe()
    expect(violaciones).toEqual([])
  })
})

describe('una decisión a la vez (GS-021)', () => {
  it('solo un grupo de decisión está visible en el contenedor', () => {
    document.body.innerHTML = '<main id="main"></main>'
    const main = document.querySelector('#main')
    const estado = initEstado({ rol: 'vocero', acto: 2 })
    main.append(renderDecision(fixDoble, fixDoble.grupos[0], () => {}, { estado }))
    main.append(renderDecision(fixDoble, fixDoble.grupos[1], () => {}, { estado, oculto: true }))

    const visibles = Array.from(main.querySelectorAll('.decision-group')).filter(
      (g) => !g.hasAttribute('hidden'),
    )
    expect(visibles).toHaveLength(1)
    expect(visibles[0].dataset.grupo).toBe('g1')
  })
})

describe('convención R3: todo el texto narrativo vive en DOM', () => {
  it('ningún canvas contiene texto sin aria-hidden', () => {
    // Convención (design §10): si un canvas no está marcado aria-hidden y
    // contiene nodos de texto, axe/no regresión debe detectarlo. Aquí la
    // convención se traduce en: los renderers no crean ningún canvas.
    for (const renderer of [renderFeed, renderZine, renderRadio]) {
      const nodo = renderer({ ...fixFeed, bloques: [fixFeed.bloques[0]] })
      expect(nodo.querySelectorAll('canvas').length).toBe(0)
    }
  })
})
