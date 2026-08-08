// tests/inventory.test.js — GS-012: inventario, costos y consumo de contactos.

import { describe, it, expect } from 'vitest'
import {
  inventarioInicial, aplicarInventario, puedeCostear, costoVisible, ITEMS, NOMBRE_ITEMS,
} from '../src/state/inventory.js'

describe('ITEMS / NOMBRE_ITEMS (R2)', () => {
  it('expone los 4 ítems con sus etiquetas', () => {
    expect(ITEMS).toEqual(['mascaras', 'agua', 'gasa', 'contactos'])
    expect(NOMBRE_ITEMS).toEqual({
      mascaras: 'máscara(s)',
      agua: 'agua',
      gasa: 'gasa',
      contactos: 'contacto(s)',
    })
  })
})

describe('inventarioInicial (actos.json)', () => {
  it('el acto 1 arranca sin nada', () => {
    expect(inventarioInicial(1)).toEqual({ mascaras: 0, agua: 0, gasa: 0, contactos: 0 })
  })

  it('el acto 2 arranca con un poco de agua', () => {
    expect(inventarioInicial(2)).toEqual({ mascaras: 0, agua: 1, gasa: 0, contactos: 0 })
  })

  it('el acto 3 (Zulia) arranca con logística de la red', () => {
    expect(inventarioInicial(3)).toEqual({ mascaras: 2, agua: 3, gasa: 1, contactos: 1 })
  })

  it('acto desconocido devuelve inventario vacío sin lanzar', () => {
    expect(inventarioInicial(99)).toEqual({ mascaras: 0, agua: 0, gasa: 0, contactos: 0 })
  })
})

describe('aplicarInventario', () => {
  it('suma ganancias y no muta el inventario de entrada', () => {
    const base = { mascaras: 1, agua: 1, gasa: 0, contactos: 0 }
    const out = aplicarInventario(base, { ganancia: { agua: 2 } })
    expect(out.ok).toBe(true)
    expect(out.inventario).toEqual({ mascaras: 1, agua: 3, gasa: 0, contactos: 0 })
    expect(base).toEqual({ mascaras: 1, agua: 1, gasa: 0, contactos: 0 })
  })

  it('resta costos sin bajar de 0', () => {
    const base = { mascaras: 5, agua: 3, gasa: 1, contactos: 0 }
    const out = aplicarInventario(base, { costo: { mascaras: 3, agua: 1 } })
    expect(out.ok).toBe(true)
    expect(out.inventario).toEqual({ mascaras: 2, agua: 2, gasa: 1, contactos: 0 })
  })

  it('devuelve {ok:false, razon:"inventario insuficiente"} si no alcanza', () => {
    const base = { mascaras: 0, agua: 0, gasa: 0, contactos: 0 }
    const r = aplicarInventario(base, { costo: { mascaras: 1 } })
    expect(r.ok).toBe(false)
    expect(r.razon).toBe('inventario insuficiente')
    expect(base).toEqual({ mascaras: 0, agua: 0, gasa: 0, contactos: 0 })
  })

  it('un contacto gastado no se puede reusar (razon:"sin contactos")', () => {
    const r = aplicarInventario({ mascaras: 0, agua: 0, gasa: 0, contactos: 1 }, { costo: { contactos: 1 } })
    expect(r.ok).toBe(true)
    expect(r.inventario.contactos).toBe(0)

    const r2 = aplicarInventario(r.inventario, { costo: { contactos: 1 } })
    expect(r2.ok).toBe(false)
    expect(r2.razon).toBe('sin contactos')
  })
})

describe('puedeCostear', () => {
  it('true si alcanza exacto, false si falta un solo ítem', () => {
    expect(puedeCostear({ mascaras: 2, agua: 3, gasa: 1, contactos: 1 }, { mascaras: 2, agua: 3 })).toBe(true)
    expect(puedeCostear({ mascaras: 2, agua: 3, gasa: 1, contactos: 1 }, { agua: 4 })).toBe(false)
    expect(puedeCostear({ mascaras: 2, agua: 3, gasa: 1, contactos: 1 }, { contactos: 2 })).toBe(false)
  })

  it('sin costo siempre es costeable', () => {
    expect(puedeCostear({ mascaras: 0, agua: 0, gasa: 0, contactos: 0 }, null)).toBe(true)
    expect(puedeCostear({ mascaras: 0, agua: 0, gasa: 0, contactos: 0 }, undefined)).toBe(true)
    expect(puedeCostear({ mascaras: 0, agua: 0, gasa: 0, contactos: 0 }, {})).toBe(true)
  })
})

describe('costoVisible (R2)', () => {
  it('describe el costo en español', () => {
    expect(costoVisible({ inventario: { costo: { mascaras: 2 } } })).toBe('Cuesta 2 máscara(s)')
    expect(costoVisible({ inventario: { costo: { agua: 1, contactos: 1 } } })).toBe('Cuesta 1 agua, 1 contacto(s)')
  })

  it('devuelve null cuando no hay costo', () => {
    expect(costoVisible(null)).toBeNull()
    expect(costoVisible({})).toBeNull()
    expect(costoVisible({ inventario: {} })).toBeNull()
  })
})
