// @vitest-environment jsdom
// tests/audio.test.js — GS-033: estática de radio con Web Audio.
//
// Sin gesto previo no hay audio: en jsdom (sin AudioContext) todo es no-op
// seguro y audioDisponible() es false. Con un AudioContext falso se verifica
// el cableado: desbloqueo con el primer gesto (resume), estática por buffer
// en bucle → GainNode, ganancia ∝ intensidad y default OFF.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// AudioContext falso con registro estático de instancias (sin audio real).
class FakeAudioContext {
  static instancias = []

  constructor() {
    this.state = 'suspended'
    this.currentTime = 0
    this.sampleRate = 44100
    this.destination = {}
    this.starts = []
    this.gains = []
    this.filtros = []
    FakeAudioContext.instancias.push(this)
  }

  createBuffer(canales, longitud) {
    return { getChannelData: () => new Float32Array(longitud), length: longitud }
  }

  createBufferSource() {
    const self = this
    return {
      buffer: null,
      loop: false,
      // El connect() real devuelve el destino, que es lo que permite encadenar
      // fuente.connect(filtro).connect(ganancia). El fake lo modela igual.
      connect: (destino) => destino,
      start() {
        self.starts.push('start')
      },
      stop() {
        self.starts.push('stop')
      },
    }
  }

  createGain() {
    const g = { gain: { value: 0 }, connect: (destino) => destino }
    g.gain.setTargetAtTime = (v) => {
      g.gain.value = v
    }
    this.gains.push(g)
    return g
  }

  createBiquadFilter() {
    const f = {
      type: 'lowpass',
      frequency: { value: 0 },
      Q: { value: 0 },
      connect: (destino) => destino,
    }
    this.filtros.push(f)
    return f
  }

  createOscillator() {
    const self = this
    const o = {
      frequency: { value: 0 },
      connect: (destino) => destino,
      start() {
        self.starts.push('lfo-start')
      },
      stop() {
        self.starts.push('lfo-stop')
      },
    }
    return o
  }

  resume() {
    this.state = 'running'
  }
}

async function audioFresco() {
  vi.resetModules()
  return await import('../src/lib/audio.js')
}

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  FakeAudioContext.instancias = []
  delete window.AudioContext
  delete window.webkitAudioContext
})

describe('sin Web Audio (jsdom)', () => {
  it('audioDisponible() es false y las operaciones son no-op seguros', async () => {
    const audio = await audioFresco()
    expect(audio.audioDisponible()).toBe(false)
    expect(audio.desbloquear()).toBeNull()
    expect(audio.toggleEstatica(true, 0.5)).toBe(false)
    expect(audio.toggleEstatica(false)).toBe(false)
    expect(() => audio.detenerEstatica()).not.toThrow()
  })
})

describe('con AudioContext (GS-033)', () => {
  it('desbloquear crea el contexto perezosamente y lo reanuda (primer gesto)', async () => {
    window.AudioContext = FakeAudioContext
    const audio = await audioFresco()

    expect(audio.audioDisponible()).toBe(false) // perezoso: no existe aún
    expect(FakeAudioContext.instancias.length).toBe(0)

    audio.desbloquear()
    expect(audio.audioDisponible()).toBe(true)
    expect(FakeAudioContext.instancias.length).toBe(1)
    expect(FakeAudioContext.instancias[0].state).toBe('running') // resume()
  })

  it('la estática es LA SEÑAL cayéndose: muda abajo, fuerte arriba', async () => {
    window.AudioContext = FakeAudioContext
    const audio = await audioFresco()
    audio.desbloquear()

    // Niveles 0 y 1 de señal: la comunicación todavía funciona y no hay ruido.
    // Sonando siempre era un colchón de estática permanente encima de todo.
    expect(audio.toggleEstatica(true, 0)).toBe(true)
    const ctx = FakeAudioContext.instancias[0]
    expect(ctx.starts).toEqual(['start']) // una sola fuente en bucle
    expect(ctx.gains.length).toBe(1)
    expect(ctx.gains[0].gain.value).toBe(0)

    audio.toggleEstatica(true, 1 / 3) // nivel 1, irregular: todavía muda
    expect(ctx.gains[0].gain.value).toBe(0)

    audio.toggleEstatica(true, 2 / 3) // nivel 2, degradada: aparece
    const degradada = ctx.gains[0].gain.value
    expect(degradada).toBeGreaterThan(0)

    audio.toggleEstatica(true, 1) // nivel 3, colapso: más fuerte
    expect(ctx.gains.length).toBe(1) // siempre la misma fuente
    expect(ctx.gains[0].gain.value).toBeGreaterThan(degradada)
  })

  it('toggleEstatica(false) apaga la ganancia (default OFF, GS-033)', async () => {
    window.AudioContext = FakeAudioContext
    const audio = await audioFresco()
    audio.desbloquear()

    audio.toggleEstatica(true, 0.5)
    audio.toggleEstatica(false)
    const ctx = FakeAudioContext.instancias[0]
    expect(ctx.gains[0].gain.value).toBe(0)

    audio.detenerEstatica()
    expect(ctx.starts).toEqual(['start', 'stop']) // fuente detenida
  })
})

describe('ambiente sintetizado (GS-033)', () => {
  it('ningún ambiente usa ruido blanco: eso es estática, no un lugar', async () => {
    const { AMBIENTES } = await audioFresco()
    expect(Object.keys(AMBIENTES).sort()).toEqual(['aire', 'bullicio', 'cuarto', 'lluvia'])
    for (const [nombre, r] of Object.entries(AMBIENTES)) {
      expect(['rosa', 'marron'], `${nombre} usa ruido ${r.color}`).toContain(r.color)
      expect(['lowpass', 'highpass', 'bandpass'], nombre).toContain(r.tipo)
      expect(r.techo, nombre).toBeGreaterThan(0) // techo que corta el siseo
      expect(r.volumen, nombre).toBeGreaterThan(0)
      expect(r.volumen, nombre).toBeLessThan(0.12) // nunca compite con el texto
      expect(r.vaiven, nombre).toBeGreaterThan(0)
      expect(r.pulso, nombre).toBeGreaterThan(0) // respira, no zumba parejo
    }
  })

  it('sin Web Audio no lanza y no deja nada sonando', async () => {
    const audio = await audioFresco()
    expect(() => audio.ponerAmbiente('bullicio')).not.toThrow()
    expect(() => audio.ponerAmbiente('no-existe')).not.toThrow()
    expect(() => audio.detenerAmbiente()).not.toThrow()
    expect(audio.ambienteActual()).toBeNull()
  })

  it('un ambiente nulo o desconocido apaga en vez de romper', async () => {
    const audio = await audioFresco()
    expect(audio.ponerAmbiente(null)).toBeNull()
    expect(audio.ponerAmbiente('silencio')).toBeNull()
  })

  it('con AudioContext arranca el ambiente, lo cambia y lo apaga', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
    const audio = await audioFresco()

    expect(audio.ponerAmbiente('bullicio')).toBe('bullicio')
    expect(audio.ambienteActual()).toBe('bullicio')

    expect(audio.ponerAmbiente('lluvia')).toBe('lluvia')
    expect(audio.ambienteActual()).toBe('lluvia')

    audio.detenerAmbiente()
    expect(audio.ambienteActual()).toBeNull()

    // Cada ambiente arma dos filtros: el que le da carácter y el techo que le
    // quita el siseo. Sin ese techo el ruido se oye como estática de televisor.
    const ctx = FakeAudioContext.instancias.at(-1)
    const [caracter, techo] = ctx.filtros.slice(-2)
    expect(caracter.type).toBe(audio.AMBIENTES.lluvia.tipo)
    expect(caracter.frequency.value).toBe(audio.AMBIENTES.lluvia.frecuencia)
    expect(techo.type).toBe('lowpass')
    expect(techo.frequency.value).toBe(audio.AMBIENTES.lluvia.techo)
  })
})
