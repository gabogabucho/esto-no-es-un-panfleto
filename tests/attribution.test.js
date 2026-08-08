// tests/attribution.test.js — gate R3 (GS-050): toda foto con archivo + ficha.
// Cubre: foto sin archivo → fail; sin ficha → fail; ficha incompleta → fail;
// opacidad alta → fail; hotlink → fail; caso válido → pasa.

import { describe, it, expect } from 'vitest'
import { parsearFichas, verificarFoto, leerFichas, main } from '../scripts/check-attribution.mjs'

const MD_VALIDO = `# Atribución

| Archivo | Medio | Fecha | Autor | Licencia | Estado |
|---|---|---|---|---|---|
| foto-a.png | El Nacional | 2014-02-12 | Fulanito | CC BY-NC 4.0 | aprobado |
| foto-b.jpg | Agencia EFE | 2014-02-15 | Anónimo | CC BY 4.0 | aprobado |
`

describe('parsearFichas', () => {
  it('lee la tabla markdown saltando encabezado y separador', () => {
    const fichas = parsearFichas(MD_VALIDO)
    expect(fichas.size).toBe(2)
    expect(fichas.get('foto-a.png')).toEqual({
      medio: 'El Nacional', fecha: '2014-02-12', autor: 'Fulanito',
      licencia: 'CC BY-NC 4.0', estado: 'aprobado',
    })
  })
})

describe('verificarFoto', () => {
  const fichas = parsearFichas(MD_VALIDO)
  const contexto = { fichas, archivoExiste: (src) => src === 'foto-a.png' }

  it('foto válida pasa sin errores', () => {
    expect(verificarFoto({ src: 'foto-a.png', opacidad: 0.3 }, contexto)).toEqual([])
  })

  it('foto sin archivo en src/assets/archive/ → fail', () => {
    const errores = verificarFoto({ src: 'foto-a.png' }, { fichas, archivoExiste: () => false })
    expect(errores.some((e) => e.includes('no existe'))).toBe(true)
  })

  it('foto sin ficha en ATTRIBUTION.md → fail', () => {
    const errores = verificarFoto({ src: 'foto-c.png', opacidad: 0.2 }, contexto)
    expect(errores.some((e) => e.includes('sin ficha'))).toBe(true)
  })

  it('ficha incompleta (sin licencia) → fail', () => {
    const incompleta = new Map([['foto-a.png', { medio: 'X', fecha: '2020', autor: 'Y', licencia: '', estado: '' }]])
    const errores = verificarFoto({ src: 'foto-a.png', opacidad: 0.2 }, { fichas: incompleta, archivoExiste: () => true })
    expect(errores.some((e) => e.includes('licencia'))).toBe(true)
  })

  it('opacidad > 0.35 → fail', () => {
    const errores = verificarFoto({ src: 'foto-a.png', opacidad: 0.5 }, contexto)
    expect(errores.some((e) => e.includes('opacidad'))).toBe(true)
  })

  it('hotlink (URL) → fail', () => {
    const errores = verificarFoto({ src: 'https://example.com/foto.png', opacidad: 0.2 }, contexto)
    expect(errores.some((e) => e.includes('hotlink'))).toBe(true)
  })

  it('sin ATTRIBUTION.md → fail', () => {
    const errores = verificarFoto({ src: 'foto-a.png', opacidad: 0.2 }, { fichas: null, archivoExiste: () => true })
    expect(errores.some((e) => e.includes('ATTRIBUTION.md'))).toBe(true)
  })
})

describe('main', () => {
  it('árbol M0 sin fotos pasa de forma trivial', () => {
    // No hay src/content aún (M1) → 0 fotos → 0 fallos.
    const resultado = main(['--json'])
    expect(resultado.exit).toBe(0)
    expect(resultado.fotos).toBe(0)
  })

  it('leerFichas encuentra ATTRIBUTION.md con estructura M0', () => {
    const fichas = leerFichas()
    expect(fichas).not.toBeNull()
    expect(fichas.size).toBe(0) // tabla vacía en M0 a propósito
  })
})
