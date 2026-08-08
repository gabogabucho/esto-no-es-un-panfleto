// tests/endings.test.js — GS-013: matriz de finales, prioridad y alcanzabilidad.

import { describe, it, expect } from 'vitest'
import { resolveFinal, FINALES, configActo } from '../src/state/endings.js'

describe('FINALES (orden de prioridad, diseño §GS-013)', () => {
  it('el orden es: detencion-exilio > voz-internacional > organizacion-perdura > repliegue-silencioso > emigracion > memoria-activa', () => {
    expect(FINALES).toEqual([
      'detencion-exilio',
      'voz-internacional',
      'organizacion-perdura',
      'repliegue-silencioso',
      'emigracion',
      'memoria-activa',
    ])
  })
})

describe('configActo (finales.json)', () => {
  it('cada acto tiene sus 6 configuraciones y umbrales propios', () => {
    for (const acto of [1, 2, 3]) {
      const cfg = configActo(acto)
      expect(Object.keys(cfg)).toEqual(FINALES)
      expect(cfg['memoria-activa']).toBeDefined()
    }
  })

  it('los umbrales suben de acto 1 a acto 2 (detención más difícil)', () => {
    const a1 = configActo(1)['detencion-exilio'].umbrales
    const a2 = configActo(2)['detencion-exilio'].umbrales
    expect(a2.RI).toBeGreaterThan(a1.RI)
  })
})

describe('resolveFinal — cada final es alcanzable', () => {
  it('S8 → detencion-exilio (RI≥70 y CF≤30)', () => {
    const r = resolveFinal(1, {
      stats: { CO: 40, RI: 75, RE: 62, CF: 25, PP: 65 },
      flags: { pasaporte: true },
      ppBajaSostenida: 4,
    })
    expect(r.id).toBe('detencion-exilio')
    expect(r.prioridad).toBe(1)
  })

  it('voz-internacional (RI≥60, RE≥60, PP≥60, sin detención)', () => {
    const r = resolveFinal(1, {
      stats: { CO: 40, RI: 65, RE: 70, CF: 55, PP: 65 },
      flags: {},
      ppBajaSostenida: 0,
    })
    expect(r.id).toBe('voz-internacional')
    expect(r.prioridad).toBe(2)
  })

  it('organizacion-perdura (CO≥60, RE≥60, CF≥60, 30≤RI≤60)', () => {
    const r = resolveFinal(1, {
      stats: { CO: 70, RI: 45, RE: 70, CF: 70, PP: 40 },
      flags: {},
      ppBajaSostenida: 0,
    })
    expect(r.id).toBe('organizacion-perdura')
    expect(r.prioridad).toBe(3)
  })

  it('repliegue-silencioso (todos ≤30)', () => {
    const r = resolveFinal(1, {
      stats: { CO: 20, RI: 15, RE: 10, CF: 20, PP: 25 },
      flags: {},
      ppBajaSostenida: 0,
    })
    expect(r.id).toBe('repliegue-silencioso')
    expect(r.prioridad).toBe(4)
  })

  it('emigracion (pasaporte + PP baja sostenida ≥3)', () => {
    const r = resolveFinal(1, {
      stats: { CO: 40, RI: 40, RE: 40, CF: 40, PP: 25 },
      flags: { pasaporte: true },
      ppBajaSostenida: 4,
    })
    expect(r.id).toBe('emigracion')
    expect(r.prioridad).toBe(5)
  })

  it('memoria-activa (min ≥40 y ningún eje ≤20)', () => {
    const r = resolveFinal(1, {
      stats: { CO: 50, RI: 45, RE: 50, CF: 45, PP: 45 },
      flags: {},
      ppBajaSostenida: 0,
    })
    expect(r.id).toBe('memoria-activa')
    expect(r.prioridad).toBe(6)
  })

  it('el comodín responde aunque sus condiciones fallen (fallback incondicional)', () => {
    const r = resolveFinal(1, {
      stats: { CO: 45, RI: 45, RE: 45, CF: 45, PP: 10 }, // PP≤20 rompe memoria-activa
      flags: {},
      ppBajaSostenida: 0,
    })
    expect(r.id).toBe('memoria-activa')
  })
})

describe('resolveFinal — los umbrales suben por acto', () => {
  it('RI 72/CF 25 alcanza detención en el acto 1 pero no en el acto 2', () => {
    const estado = {
      stats: { CO: 10, RI: 72, RE: 10, CF: 25, PP: 10 },
      flags: {},
      ppBajaSostenida: 0,
    }
    expect(resolveFinal(1, estado).id).toBe('detencion-exilio')
    expect(resolveFinal(2, estado).id).toBe('memoria-activa')
  })
})

describe('resolveFinal — devuelve nombre y descripción', () => {
  it('el resultado trae id, prioridad, nombre y descripción', () => {
    const r = resolveFinal(1, {
      stats: { CO: 20, RI: 15, RE: 10, CF: 20, PP: 25 },
      flags: {},
      ppBajaSostenida: 0,
    })
    expect(r.id).toBe('repliegue-silencioso')
    expect(r.prioridad).toBe(4)
    expect(typeof r.nombre).toBe('string')
    expect(typeof r.descripcion).toBe('string')
    expect(r.nombre.length).toBeGreaterThan(0)
    expect(r.descripcion.length).toBeGreaterThan(0)
  })
})
