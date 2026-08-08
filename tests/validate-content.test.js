// tests/validate-content.test.js — gate GS-060 (M1): Ajv contra
// scene.schema.json + checks extra (id de escena único por acto, id de grupo
// único por escena). Reemplaza el placeholder M0 (validación mínima id/acto/modo).

import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { validarDatos, cargarArchivos, main, idsUnicosPorActo } from '../scripts/validate-content.mjs'

function escenaBase(overrides = {}) {
  return {
    id: 'FIX-01',
    acto: 2,
    modo: 'FEED',
    fecha: '12 de febrero de 2014',
    lugar: 'Caracas',
    bloques: [{ tipo: 'narracion', texto: 'Una frase de prueba.' }],
    grupos: [
      {
        id: 'g1',
        opciones: [
          { label: 'Opción uno.', consecuencia: 'Sucede algo.' },
          { label: 'Opción dos.', consecuencia: 'Sucede otra cosa.' },
        ],
      },
    ],
    ...overrides,
  }
}

describe('validarDatos contra scene.schema.json (Ajv)', () => {
  it('una escena válida pasa', () => {
    expect(validarDatos([escenaBase()], 'fixtures/feed-fixture.json')).toEqual([])
  })

  it('id malformado falla (GS-001)', () => {
    const errores = validarDatos([escenaBase({ id: 'X1-99' })], 's.json')
    expect(errores.some((e) => e.campo === 'id' && e.error.includes('patrón'))).toBe(true)
  })

  it('modo inválido falla', () => {
    const errores = validarDatos([escenaBase({ modo: 'YOUTUBE' })], 's.json')
    expect(errores.some((e) => e.campo === 'modo')).toBe(true)
  })

  it('falta un campo obligatorio raíz → error ubicado', () => {
    const { modo, ...sinModo } = escenaBase()
    const errores = validarDatos([sinModo], 's.json')
    expect(errores.some((e) => e.campo === 'modo' && e.error.includes('falta la propiedad requerida'))).toBe(true)
  })

  it('grupo con 1 sola opción falla (GS-060: 2-4 opciones)', () => {
    const escena = escenaBase()
    escena.grupos[0].opciones = [{ label: 'Única opción.' }]
    const errores = validarDatos([escena], 's.json')
    expect(errores.some((e) => e.campo.includes('opciones') && e.error.includes('límite 2'))).toBe(true)
  })

  it('grupo con 5 opciones falla', () => {
    const escena = escenaBase()
    escena.grupos[0].opciones = [
      { label: '1.' }, { label: '2.' }, { label: '3.' }, { label: '4.' }, { label: '5.' },
    ]
    const errores = validarDatos([escena], 's.json')
    expect(errores.some((e) => e.campo.includes('opciones') && e.error.includes('límite 4'))).toBe(true)
  })

  it('deltas solo sobre ejes válidos (GS-060)', () => {
    const escena = escenaBase()
    escena.grupos[0].opciones[0].deltas = { CO: 1, ZZ: 5 }
    const errores = validarDatos([escena], 's.json')
    expect(errores.some((e) => e.error.includes('propiedad no permitida: "ZZ"'))).toBe(true)
  })

  it('tweet sin autor falla (GS-003)', () => {
    const escena = escenaBase()
    escena.bloques = [{ tipo: 'tweet', texto: 'Sin autor.' }]
    const errores = validarDatos([escena], 's.json')
    expect(errores.some((e) => e.error.includes('falta la propiedad requerida "autor"'))).toBe(true)
  })

  it('radio sin tiempo falla (GS-003)', () => {
    const escena = escenaBase()
    escena.bloques = [{ tipo: 'radio', texto: 'Sin hora.', emisor: 'Base' }]
    const errores = validarDatos([escena], 's.json')
    expect(errores.some((e) => e.error.includes('falta la propiedad requerida "tiempo"'))).toBe(true)
  })

  it('evento con tipo inválido falla', () => {
    const escena = escenaBase()
    escena.grupos[0].opciones[0].evento = { tipo: 'explosion' }
    const errores = validarDatos([escena], 's.json')
    expect(errores.some((e) => e.error.includes('infiltracion'))).toBe(true)
  })

  it('propiedad extra en el raíz falla (additionalProperties false)', () => {
    const errores = validarDatos([escenaBase({ campoExtra: true })], 's.json')
    expect(errores.some((e) => e.error.includes('propiedad no permitida: "campoExtra"'))).toBe(true)
  })

  it('id de grupo duplicado en la escena → error ubicado', () => {
    const escena = escenaBase()
    escena.grupos.push({ id: 'g1', opciones: [{ label: 'A.' }, { label: 'B.' }] })
    const errores = validarDatos([escena], 's.json')
    expect(errores.some((e) => e.error.includes('grupo duplicado'))).toBe(true)
  })

  it('JSON que no es escena (actos.json) no se valida contra el schema', () => {
    expect(validarDatos({ actos: { 1: { ciudad: 'San Cristóbal' } } }, 'actos.json')).toEqual([])
  })
})

describe('idsUnicosPorActo (GS-060)', () => {
  it('dos escenas con el mismo id en el mismo acto fallan', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'enp-vc-'))
    writeFileSync(join(tmp, 'a.json'), JSON.stringify([escenaBase(), escenaBase()]))
    const errores = idsUnicosPorActo([join(tmp, 'a.json')])
    expect(errores.some((e) => e.error.includes('duplicada'))).toBe(true)
  })

  it('escenas con el mismo id en actos distintos no fallan', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'enp-vc-'))
    writeFileSync(join(tmp, 'a.json'), JSON.stringify([escenaBase(), escenaBase({ acto: 3 })], null, 2))
    expect(idsUnicosPorActo([join(tmp, 'a.json')])).toEqual([])
  })
})

describe('main', () => {
  it('el árbol de contenido (fixtures) pasa', () => {
    const resultado = main(['--json'])
    expect(resultado.exit).toBe(0)
    expect(Array.isArray(cargarArchivos())).toBe(true)
    expect(resultado.archivos).toBeGreaterThan(0)
  })
})
