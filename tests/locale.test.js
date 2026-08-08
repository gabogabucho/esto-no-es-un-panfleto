// tests/locale.test.js — gate R1 (GS-040/041): español venezolano.
// Cubre: cada forma prohibida produce violación ubicada; falsos positivos NO;
// literal:true exento; maracucho permitido solo en diálogo del acto 3;
// allowlist con dead-entry; registro por acto.

import { describe, it, expect } from 'vitest'
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  analizaJSON,
  FORMAS_GLOBALES,
  FALSOS_POSITIVOS,
  nuevoRegistro,
  cargarAllowlist,
  main,
} from '../scripts/check-locale.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(__dirname, 'fixtures-locale')

function corre(obj) {
  const violaciones = []
  const warnings = []
  const registro = nuevoRegistro()
  analizaJSON(JSON.stringify(obj), 'prueba.json', registro, violaciones, warnings)
  return { violaciones, warnings, registro }
}

function escena(bloques, acto = 1) {
  return { id: acto === 3 ? 'Z-PRUEBA' : 'A1-PRUEBA', acto, modo: 'FEED', epigrafe: 'Prueba.', bloques }
}

describe('check-locale — lista negra global', () => {
  it('cada forma prohibida global produce violación', () => {
    const muestras = {
      'tenés': 'Tenés que venir.',
      'sos': 'Sos el único.',
      'podés': 'Podés hacerlo.',
      'querés': 'Querés saber.',
      'sabés': 'Sabés la verdad.',
      'hacés': 'Hacés ruido.',
      'publicás': 'Publicás el video.',
      'salís': 'Salís tarde.',
      'elegís': 'Elegís el camino.',
      'pasás': 'Pasás por aquí.',
      'empezás': 'Empezás a correr.',
      'encontrás': 'Encontrás la llave.',
      'abrís': 'Abrís la puerta.',
      'señalás': 'Señalás el mapa.',
      'acá': 'Venite acá.',
      'básquet': 'Juega básquet.',
    }
    for (const [forma, texto] of Object.entries(muestras)) {
      const { violaciones } = corre(escena([{ tipo: 'narracion', texto }]))
      expect(violaciones.length, `${forma} debería producir violación`).toBeGreaterThan(0)
    }
  })

  it('con y sin acento: "tenes" y "tenés" ambos fallan', () => {
    expect(corre(escena([{ tipo: 'narracion', texto: 'Tenes que venir.' }])).violaciones.length).toBeGreaterThan(0)
    expect(corre(escena([{ tipo: 'narracion', texto: 'Tenés que venir.' }])).violaciones.length).toBeGreaterThan(0)
  })

  it('imperativos rioplatenses fallan en narración (todos los actos)', () => {
    for (const texto of ['Mirá eso.', 'Vení pronto.', 'Dejá eso.', 'Traé el volante.', 'Andá vos.', 'Poné la gasolina.', 'Tomá el panfleto.', 'Buscá a los demás.', 'Llamá a tu primo.', 'Esperá aquí.', 'Decí la verdad.', 'Contá qué pasó.']) {
      expect(corre(escena([{ tipo: 'narracion', texto }])).violaciones.length, texto).toBeGreaterThan(0)
    }
  })

  it('imperativos rioplatenses fallan en diálogo de acto 1 y acto 2', () => {
    expect(corre(escena([{ tipo: 'dialogo', hablante: 'X', texto: 'Mirá, vení.' }], 1)).violaciones.length).toBeGreaterThan(0)
    expect(corre(escena([{ tipo: 'dialogo', hablante: 'X', texto: 'Mirá, vení.' }], 2)).violaciones.length).toBeGreaterThan(0)
  })

  it('imperativos rioplatenses PERMITIDOS en diálogo del acto 3 (voseo maracucho)', () => {
    const { violaciones } = corre(escena([{ tipo: 'dialogo', hablante: 'Primo', texto: 'Mirá, andá y contá qué pasó.' }], 3))
    expect(violaciones.length).toBe(0)
  })
})

describe('check-locale — falsos positivos y exenciones', () => {
  it('los falsos positivos verificados no producen violación', () => {
    for (const fp of FALSOS_POSITIVOS) {
      expect(corre(escena([{ tipo: 'narracion', texto: `Palabra ${fp} aquí.` }])).violaciones.length, fp).toBe(0)
    }
  })

  it('literal:true exime de TODO el chequeo (GS-003)', () => {
    const { violaciones } = corre(escena([{ tipo: 'cita', literal: true, autor: 'X', fuente: 'Y', texto: 'Tenés que venir, sos necesario.' }]))
    expect(violaciones.length).toBe(0)
  })

  it('chico/colectivo generan warning semántico, no fail', () => {
    const { violaciones, warnings } = corre(escena([{ tipo: 'narracion', texto: 'Un colectivo pequeño pasa y un chico lo observa.' }]))
    expect(violaciones.length).toBe(0)
    expect(warnings.length).toBeGreaterThan(0)
  })
})

describe('check-locale — voseo maracucho (acto 3)', () => {
  it('maracucho permitido en diálogo del acto 3', () => {
    const { violaciones } = corre(escena([{ tipo: 'dialogo', hablante: 'Primo', texto: 'Vos tenéis razón, queréis venir mañana.' }], 3))
    expect(violaciones.length).toBe(0)
  })

  it('maracucho PROHIBIDO en narración del acto 3', () => {
    for (const texto of ['Vos tenéis que ver.', 'Sois los únicos.', 'Queréis saber la verdad.']) {
      expect(corre(escena([{ tipo: 'narracion', texto }], 3)).violaciones.length, texto).toBeGreaterThan(0)
    }
  })
})

describe('check-locale — registro por acto (GS-041)', () => {
  it('acto 1 sin "usted" en diálogos queda en nivel fail', () => {
    const { registro } = corre(escena([{ tipo: 'dialogo', hablante: 'X', texto: 'Tú no puedes pasar.' }], 1))
    const informe = registro.informe()
    expect(informe.find((r) => r.acto === 1).nivel).toBe('fail')
  })

  it('acto 1 con "usted" y acto 3 con voseo maracucho quedan en ok', () => {
    const { registro } = corre([
      escena([{ tipo: 'dialogo', hablante: 'Profe', texto: 'Usted no puede pasar.' }], 1),
      escena([{ tipo: 'dialogo', hablante: 'Primo', texto: 'Vos tenéis razón.' }], 3),
    ])
    const informe = registro.informe()
    expect(informe.find((r) => r.acto === 1).nivel).toBe('ok')
    expect(informe.find((r) => r.acto === 3).nivel).toBe('ok')
  })
})

describe('check-locale — allowlist', () => {
  it('cargarAllowlist ignora comentarios y vacíos', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'enp-allow-'))
    const ruta = join(tmp, 'allow.txt')
    writeFileSync(ruta, '# comentario\n\nsrc/content/acto1/escenas-acto1.json:A1-01:tenés\n')
    const entradas = cargarAllowlist([ruta])
    expect(entradas).toHaveLength(1)
    expect(entradas[0].archivo).toBe('src/content/acto1/escenas-acto1.json')
    expect(entradas[0].clave).toBe('A1-01:tenés')
  })
})

describe('check-locale — end-to-end con fixtures', () => {
  it('bad.json falla con violaciones ubicadas', () => {
    const resultado = main(['--paths=tests/fixtures-locale', '--json'])
    expect(resultado.exit).toBe(1)
    expect(resultado.violaciones.length).toBeGreaterThan(0)
    // La salida ubica archivo > escena > bloque > forma.
    const primera = resultado.violaciones[0]
    expect(primera.archivo).toContain('fixtures-locale')
    expect(primera.forma).toBeTruthy()
  })

  it('un árbol solo con good.json pasa', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'enp-locale-'))
    writeFileSync(join(tmp, 'good.json'), readFileSync(join(FIXTURES, 'good.json'), 'utf8'))
    const resultado = main([`--paths=${tmp}`, '--json'])
    expect(resultado.exit).toBe(0)
    expect(resultado.violaciones.length).toBe(0)
  })

  it('entrada de allowlist sin uso hace fallar el script (dead-entry)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'enp-locale-'))
    writeFileSync(join(tmp, 'good.json'), readFileSync(join(FIXTURES, 'good.json'), 'utf8'))
    const allow = join(tmp, 'allow.txt')
    writeFileSync(allow, 'src/content/acto1/escenas-acto1.json:A1-01:tenés\n')
    const resultado = main([`--paths=${tmp}`, `--allowlist=${allow}`, '--json'])
    expect(resultado.exit).toBe(1)
    expect(resultado.allowlistMuerta.length).toBe(1)
  })

  it('una forma prohibida real con allowlist aplicada pasa', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'enp-locale-'))
    const escenaConTenés = [{ id: 'A1-01', acto: 1, modo: 'FEED', bloques: [{ tipo: 'narracion', texto: 'Tenés que venir.' }] }]
    writeFileSync(join(tmp, 's.json'), JSON.stringify(escenaConTenés))
    const allow = join(tmp, 'allow.txt')
    writeFileSync(allow, 's.json:A1-01:tenés\n')
    const resultado = main([`--paths=${tmp}`, `--allowlist=${allow}`, '--json'])
    expect(resultado.exit).toBe(0)
    expect(resultado.allowlistMuerta.length).toBe(0)
  })

  it('--require-register exige "usted" en acto 1', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'enp-locale-'))
    const sinUsted = [{ id: 'A1-01', acto: 1, modo: 'FEED', bloques: [{ tipo: 'dialogo', hablante: 'X', texto: 'Tú no puedes pasar.' }] }]
    writeFileSync(join(tmp, 's.json'), JSON.stringify(sinUsted))
    const resultado = main([`--paths=${tmp}`, '--require-register', '--json'])
    expect(resultado.exit).toBe(1)
    expect(resultado.registro.find((r) => r.acto === 1).nivel).toBe('fail')
  })
})
