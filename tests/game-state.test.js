// tests/game-state.test.js — GS-014: initEstado, aplicarOpcion, evaluarCondicion, eventos.

import { describe, it, expect } from 'vitest'
import {
  initEstado, aplicarOpcion, evaluarCondicion, cumpleRequiere,
  TIPO_EVENTO, DELTAS_INFILTRACION, FLAG_RUMOR,
} from '../src/state/game-state.js'
import { calcularSenal } from '../src/state/signal.js'

import fix04 from '../src/content/fixtures/double-decision.json'
import fix05 from '../src/content/fixtures/infiltration.json'

const OP1_FIX04 = fix04.grupos[0].opciones[0] // 'Sigues a la multitud.'
const OP2_FIX04 = fix04.grupos[0].opciones[1] // 'Revisas el celular y te apartas.'
const G2_FIX04 = fix04.grupos[1] // condicion: decisiones[0].opcion === 'Sigues a la multitud.'
const OP_COSTO_FIX04 = fix04.grupos[1].opciones[1] // agua -1
const OP_INFILTRA = fix05.grupos[0].opciones[0] // evento infiltracion siCFBajo: 40

const C1 = { escenaId: 'FIX-04', grupoId: 'g1' }
const C2 = { escenaId: 'FIX-04', grupoId: 'g2' }

describe('initEstado', () => {
  it('construye el estado inicial a partir del rol y el acto', () => {
    const e = initEstado({ rol: 'vocero', acto: 2 })
    expect(e.rol).toBe('vocero')
    expect(e.acto).toBe(2)
    expect(e.stats).toEqual({ CO: 60, RI: 40, RE: 65, CF: 50, PP: 55 })
    expect(e.inventario).toEqual({ mascaras: 0, agua: 1, gasa: 0, contactos: 0 })
    expect(e.flags).toEqual({})
    expect(e.ppBajaSostenida).toBe(0)
    expect(e.historial).toEqual([])
  })

  it('precalcula la Señal inicial', () => {
    const e = initEstado({ rol: 'vocero', acto: 1 })
    const esperado = calcularSenal(e.stats)
    expect(e.senal.valor).toBe(esperado)
    expect(e.senal.nivel).toBe(1) // RI40/CF50/PP55 → 45 → irregular
  })
})

describe('aplicarOpcion — deltas y clamps', () => {
  it('aplica deltas y devuelve un NUEVO estado (inmutable)', () => {
    const e0 = initEstado({ rol: 'vocero', acto: 1 })
    const r = aplicarOpcion(e0, OP1_FIX04, C1)
    expect(r.ok).toBe(true)
    const e1 = r.estado
    expect(e1).not.toBe(e0)
    expect(e1.stats).not.toBe(e0.stats)
    expect(e0.stats).toEqual({ CO: 60, RI: 40, RE: 65, CF: 50, PP: 55 })
    expect(e1.stats).toEqual({ CO: 61, RI: 41, RE: 65, CF: 50, PP: 55 })
  })

  it('el costo de inventario se descuenta y se registra en el historial', () => {
    // acto 2 arranca con agua: 1
    const e0 = initEstado({ rol: 'vocero', acto: 2 })
    const r = aplicarOpcion(e0, OP_COSTO_FIX04, C2)
    expect(r.ok).toBe(true)
    expect(r.estado.inventario.agua).toBe(0)
    const ultima = r.estado.historial[r.estado.historial.length - 1]
    expect(ultima.opcion).toBe(OP_COSTO_FIX04.label)
    expect(ultima.inventario).toEqual({ costo: { agua: 1 } })
  })

  it('rechaza la opción si no alcanza el costo (ok:false)', () => {
    // acto 1 arranca sin agua
    const e0 = initEstado({ rol: 'vocero', acto: 1 })
    const r = aplicarOpcion(e0, OP_COSTO_FIX04, C2)
    expect(r.ok).toBe(false)
    expect(r.razon).toBe('inventario insuficiente')
  })

  it('los contactos gastados no se pueden reusar', () => {
    // acto 3 arranca con 1 contacto
    const e0 = initEstado({ rol: 'vocero', acto: 3 })
    const opContacto = {
      label: 'Usas tu contacto del barrio.',
      inventario: { costo: { contactos: 1 } },
      deltas: { RE: 1 },
    }
    const r1 = aplicarOpcion(e0, opContacto, { escenaId: 'FIX-00', grupoId: 'g1' })
    expect(r1.ok).toBe(true)
    expect(r1.estado.inventario.contactos).toBe(0)

    const r2 = aplicarOpcion(r1.estado, opContacto, { escenaId: 'FIX-00', grupoId: 'g1' })
    expect(r2.ok).toBe(false)
    expect(r2.razon).toBe('sin contactos')
  })
})

describe('aplicarOpcion — flags y ppBajaSostenida', () => {
  it('aplica flags de la opción', () => {
    const e0 = initEstado({ rol: 'vocero', acto: 1 })
    const r = aplicarOpcion(e0, OP1_FIX04, C1)
    expect(r.estado.flags['sigue-multitud']).toBe(true)
  })

  it('PP < 25 incrementa ppBajaSostenida; PP ≥ 25 la resetea', () => {
    const opBaja = { label: 'PP baja.', deltas: { PP: -40 } }
    const opRecupera = { label: 'PP sube.', deltas: { PP: 40 } }
    const ctx = { escenaId: 'FIX-00', grupoId: 'g1' }

    let e = initEstado({ rol: 'vocero', acto: 1 }) // PP 55
    e = aplicarOpcion(e, opBaja, ctx).estado // PP 15
    expect(e.stats.PP).toBe(15)
    expect(e.ppBajaSostenida).toBe(1)

    e = aplicarOpcion(e, opRecupera, ctx).estado // PP 55
    expect(e.ppBajaSostenida).toBe(0)
  })

  it('3 rondas seguidas de PP baja marcan la bandera pasaporte', () => {
    const opBaja = { label: 'PP baja.', deltas: { PP: -40 } }
    const ctx = { escenaId: 'FIX-00', grupoId: 'g1' }
    let e = initEstado({ rol: 'vocero', acto: 1 })
    for (let i = 0; i < 3; i++) {
      e = aplicarOpcion(e, opBaja, ctx).estado
    }
    expect(e.ppBajaSostenida).toBe(3)
    expect(e.flags['pasaporte']).toBe(true)
  })
})

describe('aplicarOpcion — evento infiltración', () => {
  it('se dispara si CF < siCFBajo (comunicador: CF 30 < 40)', () => {
    const e0 = initEstado({ rol: 'comunicador-redes', acto: 1 })
    expect(e0.stats.CF).toBe(30)
    const r = aplicarOpcion(e0, OP_INFILTRA, { escenaId: 'FIX-05', grupoId: 'g1' })
    expect(r.ok).toBe(true)
    expect(r.evento).toEqual({ tipo: 'infiltracion', disparado: true, siCFBajo: 40 })
    const e1 = r.estado
    expect(e1.stats.CF).toBe(27) // 30 - 3
    expect(e1.stats.PP).toBe(48) // 50 - 2
    expect(e1.stats.RE).toBe(70) // sin cambios extra
    expect(e1.flags[FLAG_RUMOR]).toBe(true)
    const ultimo = e1.historial[e1.historial.length - 1]
    expect(ultimo.evento).toBe(TIPO_EVENTO.INFILTRACION)
  })

  it('no se dispara si CF ≥ siCFBajo (brigadista: CF 70 ≥ 40)', () => {
    const e0 = initEstado({ rol: 'brigadista-salud', acto: 1 })
    expect(e0.stats.CF).toBe(70)
    const r = aplicarOpcion(e0, OP_INFILTRA, { escenaId: 'FIX-05', grupoId: 'g1' })
    expect(r.ok).toBe(true)
    expect(r.evento).toEqual({ tipo: 'infiltracion', disparado: false, siCFBajo: 40 })
    expect(r.estado.stats.CF).toBe(70)
    expect(r.estado.flags[FLAG_RUMOR]).toBeUndefined()
  })

  it('DELTAS_INFILTRACION coincide con el diseño', () => {
    expect(DELTAS_INFILTRACION).toEqual({ CF: -3, PP: -2 })
  })
})

describe('aplicarOpcion — la Señal se recalcula', () => {
  it('el estado final trae la Señal actualizada', () => {
    const e0 = initEstado({ rol: 'vocero', acto: 1 }) // RI 40 → Señal 45
    expect(e0.senal.valor).toBe(45)
    const r = aplicarOpcion(e0, { label: 'Alza de riesgo.', deltas: { RI: 30, CF: -30 } }, { escenaId: 'FIX-00', grupoId: 'g1' })
    // RI 70, CF 20, PP 55 → 0.45*70 + 0.40*80 + 0.15*45 = 31.5 + 32 + 6.75 = 70.25 → 70
    expect(r.estado.senal.valor).toBe(70)
    expect(r.estado.senal.nivel).toBe(2) // degradada
  })
})

describe('evaluarCondicion (sandbox confiable)', () => {
  it('evalúa condiciones del histórico: decisiones[0].opcion', () => {
    const e0 = initEstado({ rol: 'vocero', acto: 1 })
    const r = aplicarOpcion(e0, OP1_FIX04, C1)
    expect(evaluarCondicion(G2_FIX04.condicion, r.estado)).toBe(true)
  })

  it('devuelve false si la decisión previa fue otra', () => {
    const e0 = initEstado({ rol: 'vocero', acto: 1 })
    const r = aplicarOpcion(e0, OP2_FIX04, C1)
    expect(evaluarCondicion(G2_FIX04.condicion, r.estado)).toBe(false)
  })

  it('evalúa condiciones sobre stats y flags', () => {
    const e0 = initEstado({ rol: 'comunicador-redes', acto: 1 })
    expect(evaluarCondicion('stats.CF < 40', e0)).toBe(true)
    expect(evaluarCondicion("flags['sigue-multitud'] === true", e0)).toBe(false)
  })

  it('devuelve false para condiciones rotas sin lanzar', () => {
    const e0 = initEstado({ rol: 'vocero', acto: 1 })
    expect(evaluarCondicion('sintaxis rota ((', e0)).toBe(false)
    expect(evaluarCondicion('estado.x.y.z', e0)).toBe(false)
  })
})

describe('cumpleRequiere', () => {
  it('una bandera pelada exige estado.flags[bandera] === true', () => {
    const e0 = initEstado({ rol: 'vocero', acto: 1 })
    expect(cumpleRequiere(e0, 'sigue-multitud')).toBe(false)
    const r = aplicarOpcion(e0, OP1_FIX04, C1)
    expect(cumpleRequiere(r.estado, 'sigue-multitud')).toBe(true)
  })

  it('una expresión se evalúa como condición', () => {
    const e0 = initEstado({ rol: 'comunicador-redes', acto: 1 })
    expect(cumpleRequiere(e0, 'stats.CF < 40')).toBe(true)
  })
})

describe('playthrough FIX-04 (doble decisión encadenada)', () => {
  it('la segunda ronda solo se desbloquea con la condición correcta', () => {
    let e = initEstado({ rol: 'vocero', acto: 2 })
    expect(e.inventario.agua).toBe(1)

    // ronda 1: eliges seguir a la multitud
    e = aplicarOpcion(e, OP1_FIX04, C1).estado
    expect(e.flags['sigue-multitud']).toBe(true)

    // ronda 2 está condicionada y ahora se desbloquea
    expect(evaluarCondicion(G2_FIX04.condicion, e)).toBe(true)

    // eliges la opción con costo de agua
    const r = aplicarOpcion(e, OP_COSTO_FIX04, C2)
    expect(r.ok).toBe(true)
    expect(r.estado.inventario.agua).toBe(0)
    expect(r.estado.stats.RE).toBe(67) // 65 + 2
  })

  it('sin la condición, la opción condicionada no debería ofrecerse (el evaluador manda)', () => {
    let e = initEstado({ rol: 'vocero', acto: 2 })
    e = aplicarOpcion(e, OP2_FIX04, C1).estado
    expect(evaluarCondicion(G2_FIX04.condicion, e)).toBe(false)
  })
})
