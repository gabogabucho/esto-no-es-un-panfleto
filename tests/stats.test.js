// tests/stats.test.js — GS-010: stats de 5 ejes, clamp 0-100, roles.json.

import { describe, it, expect } from 'vitest'
import { clamp, inicialStats, aplicarDeltas, dominante, alBorde, NOMBRE_STATS, EJES } from '../src/state/stats.js'

describe('clamp', () => {
  it('acota a 0-100', () => {
    expect(clamp(-5)).toBe(0)
    expect(clamp(0)).toBe(0)
    expect(clamp(42)).toBe(42)
    expect(clamp(100)).toBe(100)
    expect(clamp(150)).toBe(100)
    expect(clamp(NaN)).toBe(0)
  })
})

describe('NOMBRE_STATS (R2)', () => {
  it('expone las 5 etiquetas exactas', () => {
    expect(NOMBRE_STATS).toEqual({
      CO: 'Coraje',
      RI: 'Riesgo',
      RE: 'Red',
      CF: 'Confianza',
      PP: 'Percepción pública',
    })
  })
})

describe('inicialStats (roles.json)', () => {
  it('carga los stats del rol vocero', () => {
    expect(inicialStats('vocero')).toEqual({ CO: 60, RI: 40, RE: 65, CF: 50, PP: 55 })
  })

  it('cada rol de roles.json tiene 5 ejes numéricos', () => {
    for (const rol of ['vocero', 'brigadista-salud', 'derecho', 'comunicador-redes', 'artista-muralista']) {
      const s = inicialStats(rol)
      for (const eje of EJES) {
        expect(typeof s[eje]).toBe('number')
        expect(s[eje]).toBeGreaterThanOrEqual(0)
        expect(s[eje]).toBeLessThanOrEqual(100)
      }
    }
  })

  it('rol desconocido devuelve stats vacíos (sin lanzar)', () => {
    expect(inicialStats('no-existe')).toEqual({ CO: 0, RI: 0, RE: 0, CF: 0, PP: 0 })
    expect(inicialStats()).toEqual({ CO: 0, RI: 0, RE: 0, CF: 0, PP: 0 })
  })
})

describe('aplicarDeltas', () => {
  it('aplica deltas y devuelve un NUEVO objeto (no muta el de entrada)', () => {
    const base = { CO: 10, RI: 20, RE: 30, CF: 40, PP: 50 }
    const out = aplicarDeltas(base, { CO: 5, RI: -5 })
    expect(out).toEqual({ CO: 15, RI: 15, RE: 30, CF: 40, PP: 50 })
    expect(base).toEqual({ CO: 10, RI: 20, RE: 30, CF: 40, PP: 50 })
  })

  it('los deltas negativos no bajan de 0', () => {
    expect(aplicarDeltas({ CO: 3, RI: 0 }, { CO: -10 })).toEqual({ CO: 0, RI: 0 })
  })

  it('los deltas positivos no suben de 100', () => {
    expect(aplicarDeltas({ CO: 98, RI: 0 }, { CO: 10 })).toEqual({ CO: 100, RI: 0 })
  })

  it('ejes ausentes se tratan como delta 0', () => {
    expect(aplicarDeltas({ CO: 50, RI: 50, RE: 50, CF: 50, PP: 50 }, {})).toEqual({
      CO: 50, RI: 50, RE: 50, CF: 50, PP: 50,
    })
  })
})

describe('dominante', () => {
  it('devuelve el eje más alto', () => {
    expect(dominante({ CO: 10, RI: 20, RE: 30, CF: 40, PP: 50 })).toBe('PP')
  })

  it('empates desempatados por orden CO>RI>RE>CF>PP (GS-010)', () => {
    expect(dominante({ CO: 50, RI: 50, RE: 50, CF: 50, PP: 50 })).toBe('CO')
    expect(dominante({ CO: 10, RI: 50, RE: 50, CF: 50, PP: 50 })).toBe('RI')
    expect(dominante({ CO: 10, RI: 10, RE: 50, CF: 50, PP: 50 })).toBe('RE')
    expect(dominante({ CO: 10, RI: 10, RE: 10, CF: 50, PP: 50 })).toBe('CF')
    expect(dominante({ CO: 10, RI: 10, RE: 10, CF: 10, PP: 50 })).toBe('PP')
  })
})

describe('alBorde', () => {
  it('true si algún eje está al borde', () => {
    expect(alBorde({ CO: 0, RI: 50, RE: 50, CF: 50, PP: 50 })).toBe(true)
    expect(alBorde({ CO: 11, RI: 50, RE: 50, CF: 50, PP: 50 })).toBe(false)
  })
})
