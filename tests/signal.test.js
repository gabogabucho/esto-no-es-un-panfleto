// @vitest-environment jsdom
// tests/signal.test.js — La Señal.
// M1b (GS-013): fórmula, niveles, descripciones, onUmbral (puro).
// M3 (GS-030/031/032): canvas decorativo aria-hidden, intensidadPorNivel,
// glitch CSS (nunca muta el texto), rasgado ZINE, reduced-motion → frame
// estático sin bucle, buffer de ruido reutilizado y convención R3
// (los renderers de modo no crean canvas).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { calcularSenal, nivelSenal, descripcionNivel, onUmbral, SEÑAL_PESOS } from '../src/state/signal.js'
import { intensidadPorNivel, crearDatosRuido, obtenerBufferRuido, crearLienzoSenal } from '../src/signal/canvas.js'
import { claseGlitch, aplicarGlitch, quitarGlitch } from '../src/signal/glitch.js'
import { conectarSenal, claseTear } from '../src/ui/senal.js'

describe('SEÑAL_PESOS (diseño §GS-011)', () => {
  it('0.45*RI + 0.40*(100-CF) + 0.15*(100-PP)', () => {
    expect(SEÑAL_PESOS).toEqual({ RI: 0.45, CF: 0.4, PP: 0.15 })
  })
})

describe('calcularSenal', () => {
  it('punto medio: RI 40, CF 50, PP 55 → 45', () => {
    expect(calcularSenal({ RI: 40, CF: 50, PP: 55 })).toBe(45)
  })

  it('calma total: RI 0, CF 100, PP 100 → 0', () => {
    expect(calcularSenal({ RI: 0, CF: 100, PP: 100 })).toBe(0)
  })

  it('colapso: RI 100, CF 0, PP 0 → 100', () => {
    expect(calcularSenal({ RI: 100, CF: 0, PP: 0 })).toBe(100)
  })

  it('redondea al entero más cercano', () => {
    // 0.45*43 + 0.40*(100-55) + 0.15*(100-45) = 19.35 + 18 + 8.25 = 45.6 → 46
    expect(calcularSenal({ RI: 43, CF: 55, PP: 45 })).toBe(46)
  })

  it('está acotada entre 0 y 100 aunque los ejes se pasen', () => {
    expect(calcularSenal({ RI: 200, CF: -50, PP: -50 })).toBe(100)
    expect(calcularSenal({ RI: -10, CF: 150, PP: 150 })).toBe(0)
  })
})

describe('nivelSenal (rangos exactos)', () => {
  it('0-24 → 0 estable', () => {
    expect(nivelSenal(0)).toBe(0)
    expect(nivelSenal(24)).toBe(0)
  })

  it('25-49 → 1 irregular', () => {
    expect(nivelSenal(25)).toBe(1)
    expect(nivelSenal(49)).toBe(1)
  })

  it('50-74 → 2 degradada', () => {
    expect(nivelSenal(50)).toBe(2)
    expect(nivelSenal(74)).toBe(2)
  })

  it('75-100 → 3 colapso', () => {
    expect(nivelSenal(75)).toBe(3)
    expect(nivelSenal(100)).toBe(3)
  })
})

describe('descripcionNivel (R1)', () => {
  it('devuelve la etiqueta por nivel', () => {
    expect(descripcionNivel(0)).toBe('estable')
    expect(descripcionNivel(1)).toBe('irregular')
    expect(descripcionNivel(2)).toBe('degradada')
    expect(descripcionNivel(3)).toBe('colapso')
    expect(descripcionNivel(9)).toBe('desconocido') // fuera de rango → neutral
  })
})

describe('onUmbral', () => {
  it('dispara el callback solo al CRUZAR hacia el nivel pedido', () => {
    const cb = vi.fn()
    const actualizar = onUmbral(3, cb) // colapso
    actualizar(24) // nivel 0
    actualizar(49) // nivel 1
    actualizar(50) // nivel 2
    actualizar(74) // sigue nivel 2
    actualizar(75) // cruza a 3 → cb
    actualizar(90) // sigue 3 → NO vuelve a disparar
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(75, 3)
  })

  it('dispara al cruzar a niveles intermedios también', () => {
    const cb = vi.fn()
    const actualizar = onUmbral(1, cb) // irregular
    actualizar(20) // nivel 0
    actualizar(25) // cruza a 1 → cb
    actualizar(30) // sigue 1 → no
    expect(cb).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// M3 — La Señal (GS-030/031/032)
// ---------------------------------------------------------------------------

beforeEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('intensidadPorNivel (M3)', () => {
  it('mapea 0-3 a 0..1', () => {
    expect(intensidadPorNivel(0)).toBe(0)
    expect(intensidadPorNivel(1)).toBeCloseTo(1 / 3)
    expect(intensidadPorNivel(2)).toBeCloseTo(2 / 3)
    expect(intensidadPorNivel(3)).toBe(1)
  })

  it('acota valores fuera de rango', () => {
    expect(intensidadPorNivel(-5)).toBe(0)
    expect(intensidadPorNivel(9)).toBe(1)
    expect(intensidadPorNivel(NaN)).toBe(0)
  })
})

describe('buffer de ruido reutilizado (GS-030)', () => {
  it('obtenerBufferRuido devuelve SIEMPRE la misma referencia', () => {
    const a = obtenerBufferRuido()
    const b = obtenerBufferRuido()
    expect(b).toBe(a)
    expect(a.data).toBeInstanceOf(Uint8ClampedArray)
    expect(a.data.length).toBe(256 * 256 * 4)
  })

  it('crearDatosRuido genera un plano RGBA del tamaño pedido', () => {
    const ruido = crearDatosRuido(64, 48)
    expect(ruido.ancho).toBe(64)
    expect(ruido.alto).toBe(48)
    expect(ruido.data.length).toBe(64 * 48 * 4)
  })
})

describe('claseGlitch (GS-031)', () => {
  it('mapea nivel → clase (null en nivel 0)', () => {
    expect(claseGlitch(0)).toBeNull()
    expect(claseGlitch(1)).toBe('glitch-1')
    expect(claseGlitch(2)).toBe('glitch-2')
    expect(claseGlitch(3)).toBe('glitch-3')
  })

  it('aplicarGlitch añade solo la clase del nivel y nunca toca el texto', () => {
    const c = document.createElement('div')
    c.textContent = 'El texto narrativo queda intacto.'
    aplicarGlitch(c, 2)
    expect(c.classList.contains('glitch-2')).toBe(true)
    expect(c.classList.contains('glitch-1')).toBe(false)
    expect(c.dataset.senalNivel).toBe('2')

    aplicarGlitch(c, 3)
    expect(c.classList.contains('glitch-2')).toBe(false)
    expect(c.classList.contains('glitch-3')).toBe(true)

    aplicarGlitch(c, 0)
    expect(c.className).toBe('') // sin clases
    expect(c.textContent).toBe('El texto narrativo queda intacto.') // GS-031
  })

  it('quitarGlitch limpia todas las clases de glitch', () => {
    const c = document.createElement('div')
    aplicarGlitch(c, 3)
    quitarGlitch(c)
    expect(c.className).toBe('')
    expect('senalNivel' in c.dataset).toBe(false)
  })
})

describe('claseTear (ZINE, GS-030)', () => {
  it('mapea nivel → tear-N (null en nivel 0)', () => {
    expect(claseTear(0)).toBeNull()
    expect(claseTear(1)).toBe('tear-1')
    expect(claseTear(2)).toBe('tear-2')
    expect(claseTear(3)).toBe('tear-3')
  })
})

describe('conectarSenal (GS-030/031/032)', () => {
  it('aplica glitch al contenedor, tear al ZINE y aria-label al indicador', () => {
    const contenedor = document.createElement('div')
    contenedor.textContent = 'texto intacto'
    const zonaZine = document.createElement('div')
    zonaZine.className = 'modo-zine'
    const indicador = document.createElement('p')
    indicador.setAttribute('aria-label', 'Señal: estable')
    const lienzoFalso = {
      setNivel: vi.fn(),
      iniciar: vi.fn(),
      detener: vi.fn(),
      destruir: vi.fn(),
    }

    const desconectar = conectarSenal(
      { senal: { valor: 60, nivel: 2 } },
      { contenedor, zonaZine, indicador, lienzo: lienzoFalso },
    )

    expect(contenedor.classList.contains('glitch-2')).toBe(true)
    expect(zonaZine.classList.contains('tear-2')).toBe(true)
    expect(indicador.getAttribute('aria-label')).toBe('Señal: degradada')
    expect(lienzoFalso.setNivel).toHaveBeenCalledWith(2)
    expect(contenedor.textContent).toBe('texto intacto') // GS-031
    expect(contenedor.style.getPropertyValue('--senal-intensidad')).toBe('0.667')

    desconectar()
    expect(contenedor.className).toBe('')
    expect(zonaZine.className).toBe('modo-zine')
    expect(lienzoFalso.destruir).toHaveBeenCalled()
  })

  it('sin indicador y sin contenedor sigue conectando el canvas', () => {
    const lienzoFalso = { setNivel: vi.fn(), iniciar: vi.fn(), detener: vi.fn(), destruir: vi.fn() }
    const desconectar = conectarSenal({ senal: { valor: 90, nivel: 3 } }, { lienzo: lienzoFalso })
    expect(lienzoFalso.setNivel).toHaveBeenCalledWith(3)
    expect(() => desconectar()).not.toThrow()
  })
})

describe('canvas decorativo (GS-030)', () => {
  it('crea UN canvas aria-hidden .senal-canvas adjuntado al contenedor', () => {
    const raiz = document.createElement('div')
    document.body.appendChild(raiz)
    const ctrl = crearLienzoSenal(raiz, { modo: 'radio' })

    const lienzos = raiz.querySelectorAll('canvas')
    expect(lienzos.length).toBe(1)
    const c = lienzos[0]
    expect(c.getAttribute('aria-hidden')).toBe('true')
    expect(c.classList.contains('senal-canvas')).toBe(true)
    expect(c.id).toBe('senal')
    expect(ctrl.lienzo).toBe(c)

    ctrl.destruir()
    expect(raiz.querySelectorAll('canvas').length).toBe(0) // sin fugas en el DOM
  })

  it('arranca el bucle rAF solo con intensidad > 0 y lo detiene con 0', () => {
    const raf = vi.fn((cb) => {
      raf.cb = cb
      return 1
    })
    const caf = vi.fn()
    vi.stubGlobal('requestAnimationFrame', raf)
    vi.stubGlobal('cancelAnimationFrame', caf)

    const ctrl = crearLienzoSenal(document.body, { modo: 'feed' })
    ctrl.iniciar() // nivel 0 → sin frames (GS-030)
    expect(raf).not.toHaveBeenCalled()

    ctrl.setNivel(2)
    expect(raf).toHaveBeenCalledTimes(1)

    ctrl.setNivel(0)
    expect(caf).toHaveBeenCalled() // intensidad 0 → detener
    expect(raf).toHaveBeenCalledTimes(1)
  })

  it('con prefers-reduced-motion dibuja un frame estático y NO bucea (GS-032)', () => {
    const raf = vi.fn(() => 1)
    const caf = vi.fn()
    vi.stubGlobal('requestAnimationFrame', raf)
    vi.stubGlobal('cancelAnimationFrame', caf)
    vi.stubGlobal('matchMedia', (q) => ({
      matches: q.includes('reduce'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }))

    const ctrl = crearLienzoSenal(document.body, { modo: 'feed', nivel: 3 })
    ctrl.iniciar()
    expect(raf).not.toHaveBeenCalled() // sin bucle
    expect(ctrl.lienzo.classList.contains('activo')).toBe(true) // frame estático presente
    expect(ctrl.nivel).toBe(3)
  })
})

describe('convención R3: los renderers de modo no crean canvas (M3)', () => {
  it('ningún módulo de src/modes crea canvas', () => {
    for (const nombre of ['decision', 'feed', 'zine', 'radio', 'transiciones']) {
      const src = readFileSync(join(process.cwd(), 'src', 'modes', `${nombre}.js`), 'utf8')
      expect(src.includes('canvas'), `src/modes/${nombre}.js no debe referenciar canvas`).toBe(false)
    }
  })
})
