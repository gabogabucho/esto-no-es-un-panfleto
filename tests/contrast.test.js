// tests/contrast.test.js — WCAG AA de los 6 tokens (R2 / GS-080).
//
// Función pura de contraste (luminancia relativa + razón, WCAG 2.x) sin
// navegador. Define los pares DE DISEÑO que deben pasar:
//   ≥ 4.5:1 texto normal · ≥ 3:1 texto grande / UI
// y documenta los usos DECORATIVOS (bajo 3:1) para que no se usen como texto.
// Re-verificación manual en pantallas reales: T-044 / M5.

import { describe, it, expect } from 'vitest'

const TOKENS = {
  negro: '#12130f',
  papel: '#e8ddc4',
  rojo: '#8c2f1f',
  ocre: '#c9a227',
  noche: '#2c4a52',
  senal: '#5b7a63',
}

/** Canal sRGB 0-1 desde el hex '#rrggbb'. */
function canal(hex, pos) {
  const v = parseInt(hex.slice(1 + pos * 2, 1 + pos * 2 + 2), 16) / 255
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

/** Luminancia relativa (WCAG): 0 (negro) a 1 (blanco). */
export function relativaLuminancia(hex) {
  return 0.2126 * canal(hex, 0) + 0.7152 * canal(hex, 1) + 0.0722 * canal(hex, 2)
}

/** Razón de contraste entre dos colores (orden indiferente). */
export function razonContraste(a, b) {
  const la = relativaLuminancia(a)
  const lb = relativaLuminancia(b)
  const clara = Math.max(la, lb)
  const oscura = Math.min(la, lb)
  return (clara + 0.05) / (oscura + 0.05)
}

// Pares de DISEÑO: el sistema los usa como texto/UI y deben cumplir AA.
const PARES_DISENO = [
  { nombre: 'papel sobre negro (texto normal)', f: 'papel', b: 'negro', min: 4.5 },
  { nombre: 'ocre sobre negro (títulos, foco, decisiones)', f: 'ocre', b: 'negro', min: 4.5 },
  { nombre: 'señal sobre negro (UI, texto grande, enlaces)', f: 'senal', b: 'negro', min: 3 },
  { nombre: 'noche sobre papel (volante ZINE)', f: 'noche', b: 'papel', min: 4.5 },
  { nombre: 'rojo sobre papel (títulos display ZINE)', f: 'rojo', b: 'papel', min: 3 },
  { nombre: 'rojo sobre papel (texto normal)', f: 'rojo', b: 'papel', min: 4.5 },
  { nombre: 'papel sobre noche (tarjetas FEED)', f: 'papel', b: 'noche', min: 4.5 },
]

// Usos DECORATIVOS documentados: por debajo de 3:1 → NUNCA texto.
// Decisión registrada en M3: se mantienen solo como acentos/iconos/
// texturas (glitch, estática, rasgado), nunca para contenido legible.
const USO_DECORATIVO = [
  { nombre: 'señal sobre noche', f: 'senal', b: 'noche' },
  { nombre: 'rojo sobre negro', f: 'rojo', b: 'negro' },
  { nombre: 'noche sobre negro', f: 'noche', b: 'negro' },
]

describe('razón de contraste WCAG (GS-080)', () => {
  it('luminancia: negro ≈ 0 y papel ≈ 0.73 (sanity)', () => {
    const lNegro = relativaLuminancia(TOKENS.negro)
    const lPapel = relativaLuminancia(TOKENS.papel)
    expect(lNegro).toBeLessThan(0.02)
    expect(lPapel).toBeGreaterThan(0.6)
    expect(lPapel).toBeGreaterThan(lNegro)
  })

  it('razón simétrica (orden indiferente)', () => {
    expect(razonContraste(TOKENS.papel, TOKENS.negro)).toBe(
      razonContraste(TOKENS.negro, TOKENS.papel),
    )
  })

  it('pares de diseño cumplen el mínimo AA', () => {
    for (const p of PARES_DISENO) {
      const r = razonContraste(TOKENS[p.f], TOKENS[p.b])
      expect(r, `${p.nombre} (${p.f}/${p.b}) = ${r.toFixed(2)}:1, mínimo ${p.min}:1`).toBeGreaterThanOrEqual(p.min)
    }
  })

  it('los usos decorativos quedan documentados bajo 3:1 (nunca texto)', () => {
    for (const p of USO_DECORATIVO) {
      const r = razonContraste(TOKENS[p.f], TOKENS[p.b])
      expect(r, `${p.nombre} debe ser solo decorativo: ${r.toFixed(2)}:1`).toBeLessThan(3)
    }
  })

  it('las capas del vaciado sobre negro (GS-092.3): texto AA, acentos decorativos', () => {
    // Capa del memorial sobre negro: papel/ocre como texto; señal grande/UI;
    // rojo y noche solo decorativos.
    expect(razonContraste(TOKENS.papel, TOKENS.negro)).toBeGreaterThanOrEqual(4.5)
    expect(razonContraste(TOKENS.ocre, TOKENS.negro)).toBeGreaterThanOrEqual(4.5)
    expect(razonContraste(TOKENS.senal, TOKENS.negro)).toBeGreaterThanOrEqual(3)
    expect(razonContraste(TOKENS.rojo, TOKENS.negro)).toBeLessThan(3)
    expect(razonContraste(TOKENS.noche, TOKENS.negro)).toBeLessThan(3)
  })
})
