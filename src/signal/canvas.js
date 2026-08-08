// src/signal/canvas.js — La Señal: canvas decorativo de fondo (GS-030/GS-032).
//
// Un único <canvas> fijo (position:fixed, pointer-events:none,
// aria-hidden="true") que redibuja el fondo con efectos por modo:
//   feed  → barras horizontales de escaneo VHS + línea glitch ocasional
//   radio → estática: buffer de ruido pre-generado UNA vez (ImageData) y
//           reutilizado con drawImage escalado — sin alocación por frame
//   zine  → mínima viñeta / mancha de borde (el papel lo hace el CSS)
//
// Reglas de energía (GS-030): el bucle rAF SOLO corre con intensidad > 0;
// se throttlea a ~30fps con delta-time; se pausa con la pestaña oculta.
// Con prefers-reduced-motion se dibuja UN frame estático y no se bucea
// (GS-032: mismo mensaje por textura, sin movimiento).
//
// API: crearLienzoSenal(root, opts) → {
//   iniciar(), detener(), setNivel(nivel), resize(), destruir(),
//   lienzo (el <canvas>), nivel }
// Helpers puros exportados para tests: intensidadPorNivel, crearDatosRuido,
// obtenerBufferRuido.

const FPS_MAX = 30
const PASO_MIN = 1000 / FPS_MAX // ~33.33 ms entre pintadas

/** getContext('2d') con tolerancia a entornos sin canvas 2D (jsdom → null). */
function obtenerContexto(lienzo) {
  try {
    // jsdom no implementa canvas 2d: null sin ruido ni dependencia extra.
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return null
    return lienzo.getContext('2d')
  } catch {
    return null
  }
}

function rAF(cb) {
  return typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : 0
}

function cAF(id) {
  if (id && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id)
}

function prefiereMovimientoReducido() {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  } catch {
    return false
  }
}

/** Intensidad 0..1 para un nivel 0-3 (helper puro, testeable). */
export function intensidadPorNivel(nivel) {
  const n = Math.max(0, Math.min(3, Math.round(Number(nivel) || 0)))
  return n / 3
}

/** Datos de ruido blanco (plano RGBA) para RADIO. Puro, sin DOM. */
export function crearDatosRuido(ancho = 256, alto = 256) {
  const data = new Uint8ClampedArray(ancho * alto * 4)
  for (let i = 0; i < data.length; i += 4) {
    const v = (Math.random() * 256) | 0
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
    data[i + 3] = 255
  }
  return { ancho, alto, data }
}

// Buffer de ruido UNA vez por proceso (GS-030: sin alocación por frame).
let bufferRuido = null

/** Devuelve SIEMPRE la misma referencia: el buffer se crea una sola vez. */
export function obtenerBufferRuido() {
  if (!bufferRuido) bufferRuido = crearDatosRuido(256, 256)
  return bufferRuido
}

// ---------------------------------------------------------------------------
// Pintado por modo (todo en píxeles físicos: lienzo ya escalado por DPR)
// ---------------------------------------------------------------------------

function pintarFeed(ctx, w, h, i, t) {
  ctx.clearRect(0, 0, w, h)
  if (i <= 0) return
  // Barras horizontales de escaneo VHS (tracking): paso y opacidad ∝ nivel.
  const paso = Math.max(2, Math.round(8 - i * 5))
  const offset = Math.floor((t / 24) % paso)
  ctx.fillStyle = `rgba(18, 19, 15, ${0.05 + 0.10 * i})`
  for (let y = offset; y < h; y += paso) ctx.fillRect(0, y, w, 1)
  // Línea glitch ocasional (rareza ∝ nivel): banda + trozo desplazado.
  if (Math.random() < 0.02 + 0.10 * i) {
    const y = Math.random() * h
    const altura = 1 + Math.floor(Math.random() * (1 + i * 2))
    ctx.fillStyle = `rgba(201, 162, 39, ${0.10 + 0.12 * i})` // ocre tenue
    ctx.fillRect(0, y, w, altura)
    ctx.fillStyle = `rgba(44, 74, 82, ${0.10 + 0.10 * i})` // verde noche
    const x = (Math.random() * w * 0.4) | 0
    ctx.fillRect(x, y, w * 0.3, altura)
  }
}

function pintarRadio(ctx, w, h, i, t) {
  ctx.clearRect(0, 0, w, h)
  if (i <= 0) return
  // Lienzo offscreen con el buffer de ruido, construido UNA vez por controlador.
  if (!ctx.__enpRuido) {
    const ruido = obtenerBufferRuido()
    const off = document.createElement('canvas')
    off.width = ruido.ancho
    off.height = ruido.alto
    const rctx = obtenerContexto(off)
    if (!rctx) return
    const img =
      typeof ImageData === 'function' ? new ImageData(ruido.data, ruido.ancho, ruido.alto) : null
    if (img) rctx.putImageData(img, 0, 0)
    ctx.__enpRuido = off
  }
  const off = ctx.__enpRuido
  const desp = (t / 8) % off.width
  // Capa principal escalada a todo el viewport, desplazamiento variable.
  ctx.globalAlpha = 0.10 + 0.32 * i
  ctx.drawImage(off, -desp, 0, w + off.width, h)
  // Segunda capa (densidad) solo en niveles altos.
  if (i > 0.5) {
    ctx.globalAlpha = 0.05 + 0.14 * i
    ctx.drawImage(off, desp * 2 - off.width, -desp, w + off.width, h)
  }
  ctx.globalAlpha = 1
}

function pintarZine(ctx, w, h, i, t) {
  ctx.clearRect(0, 0, w, h)
  if (i <= 0) return
  // Mínima viñeta de borde (el papel y su textura viven en CSS).
  const cx = w / 2
  const cy = h / 2
  const radio = Math.max(w, h) * (0.62 + 0.10 * i)
  const g = ctx.createRadialGradient(cx, cy, radio * 0.45, cx, cy, radio)
  g.addColorStop(0, 'rgba(18, 19, 15, 0)')
  g.addColorStop(1, `rgba(18, 19, 15, ${0.10 + 0.18 * i})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // Mancha sutil en una esquina, más presente con el nivel.
  const mx = w * 0.12
  const my = h * 0.85
  const g2 = ctx.createRadialGradient(mx, my, 0, mx, my, Math.max(w, h) * 0.35)
  g2.addColorStop(0, `rgba(140, 47, 31, ${0.05 + 0.10 * i})`)
  g2.addColorStop(1, 'rgba(140, 47, 31, 0)')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, w, h)
}

// ---------------------------------------------------------------------------
// Controlador
// ---------------------------------------------------------------------------

export function crearLienzoSenal(root, opts = {}) {
  const modo = String(opts.modo ?? 'feed').toLowerCase()
  const contenedor = root ?? document.body
  const lienzo = document.createElement('canvas')
  lienzo.id = 'senal'
  lienzo.className = 'senal-canvas'
  lienzo.setAttribute('aria-hidden', 'true')
  contenedor.appendChild(lienzo)

  const ctx = obtenerContexto(lienzo)
  const reducido = prefiereMovimientoReducido()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  let nivel = Math.max(0, Math.min(3, Math.round(Number(opts.nivel) || 0)))
  let corriendo = false
  let idRaF = 0
  let ultima = 0
  let ultimoPintado = 0
  let tiempo = 0
  let pestañaOculta = false

  function dimensionar() {
    const w = window.innerWidth || document.documentElement.clientWidth || 1
    const h = window.innerHeight || document.documentElement.clientHeight || 1
    lienzo.width = Math.max(1, Math.floor(w * dpr))
    lienzo.height = Math.max(1, Math.floor(h * dpr))
  }

  function pintar(dt) {
    if (!ctx) return
    tiempo += dt
    const i = intensidadPorNivel(nivel)
    const w = lienzo.width
    const h = lienzo.height
    if (modo === 'radio') pintarRadio(ctx, w, h, i, tiempo)
    else if (modo === 'zine') pintarZine(ctx, w, h, i, tiempo)
    else pintarFeed(ctx, w, h, i, tiempo)
  }

  function bucle(ahora) {
    if (pestañaOculta || !corriendo) return
    const dt = Math.min(50, ahora - ultima || 16.67)
    ultima = ahora
    // Throttle ~30fps: no pintar más seguido que PASO_MIN.
    if (ahora - ultimoPintado >= PASO_MIN) {
      pintar(dt)
      ultimoPintado = ahora
    }
    idRaF = rAF(bucle)
  }

  function iniciar() {
    if (corriendo) return
    dimensionar()
    const i = intensidadPorNivel(nivel)
    lienzo.classList.toggle('activo', i > 0) // opacity 0→1 (base.css)
    if (reducido) {
      // GS-032: UN frame estático y sin bucle — mismo mensaje por textura.
      if (i > 0) pintar(0)
      return
    }
    if (i <= 0) return // GS-030: intensidad 0 = sin frames
    corriendo = true
    ultima = 0
    ultimoPintado = 0
    idRaF = rAF(bucle)
  }

  function detener() {
    corriendo = false
    if (idRaF) {
      cAF(idRaF)
      idRaF = 0
    }
  }

  function setNivel(n) {
    nivel = Math.max(0, Math.min(3, Math.round(Number(n) || 0)))
    const i = intensidadPorNivel(nivel)
    lienzo.classList.toggle('activo', i > 0) // opacity 0→1 (base.css)
    if (reducido) {
      if (i > 0) {
        dimensionar()
        pintar(0)
      } else if (ctx) {
        ctx.clearRect(0, 0, lienzo.width, lienzo.height)
      }
      return
    }
    if (i > 0 && !corriendo) iniciar()
    else if (i <= 0 && corriendo) detener()
  }

  function resize() {
    dimensionar()
    if (reducido) {
      if (intensidadPorNivel(nivel) > 0) pintar(0)
    } else if (!corriendo && intensidadPorNivel(nivel) > 0) {
      iniciar()
    }
  }

  function enVisibilidad() {
    pestañaOculta = document.hidden
    if (pestañaOculta) detener()
    else if (!reducido && intensidadPorNivel(nivel) > 0) iniciar()
  }

  function destruir() {
    detener()
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', enVisibilidad)
    if (lienzo.parentNode) lienzo.parentNode.removeChild(lienzo)
  }

  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', enVisibilidad)
  dimensionar()

  return {
    iniciar,
    detener,
    setNivel,
    resize,
    destruir,
    lienzo,
    get nivel() {
      return nivel
    },
  }
}
