// src/lib/audio.js — Estática de radio con Web Audio (GS-033).
//
// Política de autoplay: el AudioContext se crea PEREZOSAMENTE y se desbloquea
// con el PRIMER gesto del usuario (pointerdown/keydown). Default OFF: el
// audio solo suena cuando el jugador lo enciende explícitamente (toggle en
// menú, M4). Motor pequeño: estática de radio = buffer de ruido blanco de 2s
// en bucle a través de un GainNode; intensidad 0..1 → ganancia.
//
// API:
//   crearAudio(opts)          → controlador { desbloquear, toggleEstatica,
//                                detener, disponible }
//   desbloquear()             → crea/resume el contexto (primer gesto)
//   conectarDesbloqueo()      → ata pointerdown/keydown una sola vez
//   toggleEstatica(on, i)     → enciende/apaga la estática (gain ∝ i)
//   detenerEstatica()         → detiene la fuente de ruido
//   audioDisponible()         → true si el AudioContext existe y está vivo
//
// En entornos sin Web Audio (jsdom) todo es no-op seguro: audioDisponible()
// devuelve false y crearAudio() funciona sin lanzar.

let ctx = null
let fuente = null
let ganancia = null
let desbloqueado = false

/** true si existe un AudioContext vivo (útil en tests). */
export function audioDisponible() {
  return ctx !== null && typeof ctx.state === 'string' && ctx.state !== 'closed'
}

function crearContexto() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  try {
    ctx = new AC()
  } catch {
    ctx = null
  }
  return ctx
}

/** Crea el contexto (si hace falta) y lo reanuda: primer gesto (GS-033). */
export function desbloquear() {
  if (!ctx) crearContexto()
  if (ctx && ctx.state === 'suspended') {
    try {
      ctx.resume()
    } catch {
      /* contexto no desbloqueable aún */
    }
  }
  desbloqueado = true
  return ctx
}

let gestoAtado = false

/**
 * Ata el desbloqueo al PRIMER pointerdown/keydown, una sola vez. El shell
 * (M4) lo llama en el bootstrap; sin gesto previo no hay audio (GS-033).
 */
export function conectarDesbloqueo() {
  if (gestoAtado || typeof window === 'undefined') return
  gestoAtado = true
  const onGesto = () => {
    desbloquear()
    window.removeEventListener('pointerdown', onGesto)
    window.removeEventListener('keydown', onGesto)
  }
  window.addEventListener('pointerdown', onGesto)
  window.addEventListener('keydown', onGesto)
}

function crearFuenteEstatica() {
  // Aquí el blanco SÍ corresponde: esto es una radio fuera de sintonía.
  const buffer = bufferDeRuido('blanco', 2)

  const f = ctx.createBufferSource()
  f.buffer = buffer
  f.loop = true
  const g = ctx.createGain()
  g.gain.value = 0 // default OFF (GS-033)
  f.connect(g)
  g.connect(ctx.destination)
  f.start()
  return { fuente: f, ganancia: g }
}

/**
 * Enciende/apaga la estática. intensidad 0..1 → ganancia (0 = silencio).
 * Devuelve true si hay contexto activo y el audio quedó cableado.
 */
export function toggleEstatica(encendida, intensidad = 1) {
  const i = Math.max(0, Math.min(1, Number(intensidad) || 0))
  if (!ctx) {
    if (!encendida) return false
    crearContexto()
    if (!ctx) return false
  }
  if (encendida && !fuente) {
    const creada = crearFuenteEstatica()
    fuente = creada.fuente
    ganancia = creada.ganancia
  }
  if (ganancia) {
    // Silencio hasta que La Señal empieza a caerse de verdad. Antes sonaba
    // siempre, y encima del ambiente daba un colchón de estática constante.
    const objetivo = encendida ? Math.max(0, i - 0.34) * 0.16 : 0
    try {
      ganancia.gain.setTargetAtTime(objetivo, ctx.currentTime, 0.15)
    } catch {
      ganancia.gain.value = objetivo
    }
  }
  return Boolean(ctx)
}

/** Detiene la fuente de ruido (estática apagada del todo). */
export function detenerEstatica() {
  if (fuente) {
    try {
      fuente.stop()
    } catch {
      /* ya detenida */
    }
    fuente = null
  }
  ganancia = null
}

// ---------------------------------------------------------------------------
// Ambiente de escena
//
// Todo se SINTETIZA: ni un byte de descarga. El juego funciona sin conexión y
// trata sobre gente a la que le cortaron el internet, así que meterle diez
// megas de loops de ambiente sería contradecirse. Un buffer de ruido y una
// cadena de filtros dan bullicio, aire y lluvia con el mismo material.
//
// Sigue la misma política que la estática: apagado por defecto y detrás del
// primer gesto del usuario (GS-033). El menú enciende las dos cosas a la vez.
// ---------------------------------------------------------------------------

/**
 * Recetas de ambiente.
 *
 * `color` es lo que decide si suena a lugar o a televisor roto:
 *   blanco  — energía plana. Es estática. Solo sirve para la radio.
 *   rosa    — cae 3 dB por octava. Lluvia, agua, aire con cuerpo.
 *   marrón  — cae 6 dB por octava. Viento, oleaje, tráfico lejano.
 *
 * La primera versión de esto usaba blanco para todo, y sonaba exactamente a lo
 * que es: un televisor sin señal. El color del ruido no es un adorno, es el
 * ambiente entero.
 */
export const AMBIENTES = {
  // Voces y motores a distancia, con la respiración de una multitud.
  bullicio: {
    color: 'marron',
    tipo: 'bandpass', frecuencia: 420, q: 0.6,
    techo: 1600,
    volumen: 0.075, vaiven: 0.11, profundidad: 180,
    pulso: 0.16, hondura: 0.4,
  },
  // Aire y distancia: el silencio de una calle a las cuatro de la mañana.
  aire: {
    color: 'marron',
    tipo: 'lowpass', frecuencia: 260, q: 0.5,
    techo: 900,
    volumen: 0.06, vaiven: 0.045, profundidad: 90,
    pulso: 0.07, hondura: 0.35,
  },
  // Lluvia: banda alta del ruido rosa, sin brillo de estática.
  lluvia: {
    color: 'rosa',
    tipo: 'highpass', frecuencia: 800, q: 0.5,
    techo: 6000,
    volumen: 0.07, vaiven: 0.09, profundidad: 220,
    pulso: 0.1, hondura: 0.2,
  },
  // Interior cerrado: zumbido bajo, casi solo presión.
  cuarto: {
    color: 'marron',
    tipo: 'lowpass', frecuencia: 130, q: 0.7,
    techo: 400,
    volumen: 0.05, vaiven: 0.03, profundidad: 40,
    pulso: 0.05, hondura: 0.25,
  },
}

let ambiente = null

/** Ruido con color. Blanco es plano; rosa y marrón bajan con la frecuencia. */
function bufferDeRuido(color = 'blanco', segundos = 4) {
  const largo = Math.max(1, Math.floor(ctx.sampleRate * segundos))
  const buffer = ctx.createBuffer(1, largo, ctx.sampleRate)
  const datos = buffer.getChannelData(0)

  if (color === 'marron') {
    let ultimo = 0
    for (let i = 0; i < largo; i++) {
      const blanco = Math.random() * 2 - 1
      ultimo = (ultimo + 0.02 * blanco) / 1.02
      datos[i] = ultimo * 3.5
    }
    return buffer
  }

  if (color === 'rosa') {
    // Filtro de Paul Kellett: aproximación barata y estable a -3 dB/octava.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < largo; i++) {
      const blanco = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + blanco * 0.0555179
      b1 = 0.99332 * b1 + blanco * 0.0750759
      b2 = 0.969 * b2 + blanco * 0.153852
      b3 = 0.8665 * b3 + blanco * 0.3104856
      b4 = 0.55 * b4 + blanco * 0.5329522
      b5 = -0.7616 * b5 - blanco * 0.016898
      datos[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + blanco * 0.5362) * 0.11
      b6 = blanco * 0.115926
    }
    return buffer
  }

  for (let i = 0; i < largo; i++) datos[i] = Math.random() * 2 - 1
  return buffer
}

function desvanecer(nodo, hasta, segundos = 1.4) {
  try {
    nodo.gain.setTargetAtTime(hasta, ctx.currentTime, segundos / 3)
  } catch {
    nodo.gain.value = hasta
  }
}

function clamp01(n) {
  return Math.max(0, Math.min(1, Number(n) || 0))
}

/**
 * Pone el ambiente de una escena, cruzando desde el anterior. `nombre` nulo o
 * desconocido apaga. Devuelve el nombre en curso, o null.
 */
export function ponerAmbiente(nombre, intensidad = 1) {
  const receta = nombre ? AMBIENTES[nombre] : null

  if (!receta) {
    detenerAmbiente()
    return null
  }
  if (!ctx) {
    crearContexto()
    if (!ctx) return null
  }
  if (ambiente && ambiente.nombre === nombre) {
    desvanecer(ambiente.ganancia, receta.volumen * clamp01(intensidad))
    return nombre
  }

  detenerAmbiente()

  try {
    const fuente = ctx.createBufferSource()
    fuente.buffer = bufferDeRuido(receta.color)
    fuente.loop = true

    const filtro = ctx.createBiquadFilter()
    filtro.type = receta.tipo
    filtro.frequency.value = receta.frecuencia
    filtro.Q.value = receta.q

    // Segundo filtro: corta lo que quede de brillo. Sin este techo, hasta el
    // ruido marrón conserva un siseo que el oído lee como estática.
    const techo = ctx.createBiquadFilter()
    techo.type = 'lowpass'
    techo.frequency.value = receta.techo
    techo.Q.value = 0.4

    // Vaivén del filtro: el lugar respira en vez de zumbar parejo.
    const lfo = ctx.createOscillator()
    lfo.frequency.value = receta.vaiven
    const lfoGanancia = ctx.createGain()
    lfoGanancia.gain.value = receta.profundidad
    lfo.connect(lfoGanancia).connect(filtro.frequency)

    const ganancia = ctx.createGain()
    ganancia.gain.value = 0

    // Pulso de volumen: lo que separa una multitud lejana de un ventilador.
    const pulso = ctx.createOscillator()
    pulso.frequency.value = receta.pulso
    const pulsoGanancia = ctx.createGain()
    pulsoGanancia.gain.value = receta.volumen * receta.hondura
    pulso.connect(pulsoGanancia).connect(ganancia.gain)

    fuente.connect(filtro).connect(techo).connect(ganancia).connect(ctx.destination)
    fuente.start()
    lfo.start()
    pulso.start()
    desvanecer(ganancia, receta.volumen * clamp01(intensidad))

    ambiente = { nombre, fuente, filtro, techo, ganancia, lfo, lfoGanancia, pulso }
    return nombre
  } catch {
    ambiente = null
    return null
  }
}

/** Corta el ambiente en curso. Seguro de llamar aunque no haya nada sonando. */
export function detenerAmbiente() {
  if (!ambiente) return
  const { fuente, lfo, pulso } = ambiente
  ambiente = null
  for (const nodo of [fuente, lfo, pulso]) {
    try {
      nodo.stop()
    } catch {
      /* ya detenido o sin contexto */
    }
  }
}

/** Nombre del ambiente en curso, o null. Útil en tests y en el menú. */
export function ambienteActual() {
  return ambiente ? ambiente.nombre : null
}

/** Controlador único de La Señal sonora y el ambiente (GS-033). */
export function crearAudio() {
  return {
    desbloquear,
    toggleEstatica,
    ponerAmbiente,
    detener: () => {
      detenerEstatica()
      detenerAmbiente()
    },
    disponible: audioDisponible,
  }
}
