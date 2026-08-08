// scripts/generate-pwa-assets.mjs
// Genera iconos y splash screens PWA sin dependencias (PNG encoder puro con zlib).
// Emite a public/: favicon.svg, favicon.png, pwa-192.png, pwa-512.png,
// maskable-512.png, apple-touch-icon.png y apple-splash/*.png (fondo oscuro #12130f).
//
// Reemplazo cero-deps de @vite-pwa/assets-generator: mismo resultado (iconos +
// splash dark #12130f) sin sharp ni binarios nativos.

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(raiz, 'public')
const splashDir = join(publicDir, 'apple-splash')

const NEGRO = '#12130f'
const PAPEL = '#e8ddc4'
const OCRE = '#c9a227'

/* ------------------------------------------------------------------ */
/* PNG encoder puro (RGBA, bit depth 8, filter 0)                     */
/* ------------------------------------------------------------------ */

const tablaCrc = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = tablaCrc[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(tipo, datos) {
  const longitud = Buffer.alloc(4)
  longitud.writeUInt32BE(datos.length, 0)
  const tipoBuf = Buffer.from(tipo, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([tipoBuf, datos])), 0)
  return Buffer.concat([longitud, tipoBuf, datos, crcBuf])
}

function encodePNG(ancho, alto, rgba) {
  const firma = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(ancho, 0)
  ihdr.writeUInt32BE(alto, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  // scanlines: 1 byte de filtro (0) + RGBA
  const filas = Buffer.alloc(alto * (1 + ancho * 4))
  for (let y = 0; y < alto; y++) {
    filas[y * (1 + ancho * 4)] = 0
    filas.set(
      rgba.subarray(y * ancho * 4, (y + 1) * ancho * 4),
      y * (1 + ancho * 4) + 1
    )
  }
  const idat = deflateSync(filas, { level: 9 })
  return Buffer.concat([
    firma,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ------------------------------------------------------------------ */
/* Buffer RGBA y dibujo                                                */
/* ------------------------------------------------------------------ */

function hexARGB(hex) {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
    255,
  ]
}

function crearBuffer(w, h) {
  return { w, h, data: new Uint8Array(w * h * 4) }
}

function pintar(buf, x, y, rgba) {
  if (x < 0 || y < 0 || x >= buf.w || y >= buf.h) return
  const i = (y * buf.w + x) * 4
  buf.data[i] = rgba[0]
  buf.data[i + 1] = rgba[1]
  buf.data[i + 2] = rgba[2]
  buf.data[i + 3] = rgba[3]
}

function rellenar(buf, rgba) {
  for (let y = 0; y < buf.h; y++) {
    for (let x = 0; x < buf.w; x++) {
      pintar(buf, x, y, rgba)
    }
  }
}

function enPoligono(px, py, pts) {
  // ptos convexos en orden; mismo signo en todos los productos cruz
  let signo = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const cruz = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x)
    if (cruz !== 0) {
      const s = Math.sign(cruz)
      if (signo === 0) signo = s
      else if (s !== signo) return false
    }
  }
  return true
}

function fillPoligono(buf, pts, rgba) {
  const minX = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.x))))
  const maxX = Math.min(buf.w - 1, Math.ceil(Math.max(...pts.map((p) => p.x))))
  const minY = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.y))))
  const maxY = Math.min(buf.h - 1, Math.ceil(Math.max(...pts.map((p) => p.y))))
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (enPoligono(x + 0.5, y + 0.5, pts)) pintar(buf, x, y, rgba)
    }
  }
}

/* Volante de papel plegado, centrado en (cx, cy) con tamaño `escala`.
   Es el "panfleto" del logotipo: papel viejo con esquina doblada ocre. */
function dibujarVolante(buf, cx, cy, escala) {
  const pts = [
    { x: cx - 0.24 * escala, y: cy - 0.14 * escala }, // A sup-izq
    { x: cx + 0.22 * escala, y: cy - 0.20 * escala }, // B sup-der (doblada)
    { x: cx + 0.22 * escala, y: cy + 0.20 * escala }, // C inf-der
    { x: cx - 0.24 * escala, y: cy + 0.20 * escala }, // D inf-izq
  ]
  fillPoligono(buf, pts, hexARGB(PAPEL))
  // esquina doblada (triángulo B-F-G) en ocre
  fillPoligono(
    buf,
    [
      { x: cx + 0.22 * escala, y: cy - 0.20 * escala },
      { x: cx + 0.14 * escala, y: cy - 0.12 * escala },
      { x: cx + 0.22 * escala, y: cy - 0.12 * escala },
    ],
    hexARGB(OCRE)
  )
  // líneas de texto en negro concreto (3 barras)
  const negro = hexARGB(NEGRO)
  const lineas = [
    [-0.12, -0.05],
    [-0.12, 0.0],
    [-0.12, 0.05],
  ]
  for (const [lx, ly] of lineas) {
    fillPoligono(
      buf,
      [
        { x: cx + (lx - 0.06) * escala, y: cy + (ly - 0.015) * escala },
        { x: cx + (lx + 0.12) * escala, y: cy + (ly - 0.015) * escala },
        { x: cx + (lx + 0.12) * escala, y: cy + (ly + 0.015) * escala },
        { x: cx + (lx - 0.06) * escala, y: cy + (ly + 0.015) * escala },
      ],
      negro
    )
  }
}

function generarIcono(tam, { mascara = false } = {}) {
  const buf = crearBuffer(tam, tam)
  rellenar(buf, hexARGB(NEGRO))
  // zona segura maskable: logo en el 60% central
  const escala = mascara ? tam * 0.52 : tam * 0.78
  dibujarVolante(buf, tam / 2, tam / 2, escala)
  return encodePNG(tam, tam, buf.data)
}

function generarSplash(w, h) {
  const buf = crearBuffer(w, h)
  rellenar(buf, hexARGB(NEGRO))
  const escala = Math.min(w, h) * 0.3
  dibujarVolante(buf, Math.round(w / 2), Math.round(h * 0.45), escala)
  return encodePNG(w, h, buf.data)
}

/* ------------------------------------------------------------------ */
/* SVG fuente                                                          */
/* ------------------------------------------------------------------ */

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#12130f"/>
  <polygon points="112,166 400,118 400,394 112,394" fill="#e8ddc4"/>
  <polygon points="400,118 352,158 400,158" fill="#c9a227"/>
  <rect x="152" y="210" width="176" height="18" fill="#12130f"/>
  <rect x="152" y="250" width="176" height="18" fill="#12130f"/>
  <rect x="152" y="290" width="176" height="18" fill="#12130f"/>
</svg>
`

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

const iconos = [
  { tam: 64, nombre: 'favicon.png', mascara: false },
  { tam: 192, nombre: 'pwa-192.png', mascara: false },
  { tam: 512, nombre: 'pwa-512.png', mascara: false },
  { tam: 512, nombre: 'maskable-512.png', mascara: true },
  { tam: 180, nombre: 'apple-touch-icon.png', mascara: false },
]

const splashes = [
  [640, 1136],
  [750, 1334],
  [1125, 2436],
  [1170, 2532],
  [1242, 2688],
  [1290, 2796],
  [1180, 2532],
  [1620, 2160],
  [1668, 2224],
  [1668, 2388],
  [2048, 2732],
]

export function generar() {
  mkdirSync(publicDir, { recursive: true })
  mkdirSync(splashDir, { recursive: true })
  writeFileSync(join(publicDir, 'logo.svg'), LOGO_SVG)
  writeFileSync(join(publicDir, 'favicon.svg'), LOGO_SVG)
  const reportados = []
  for (const { tam, nombre, mascara } of iconos) {
    const ruta = join(publicDir, nombre)
    writeFileSync(ruta, generarIcono(tam, { mascara }))
    reportados.push(nombre)
  }
  for (const [w, h] of splashes) {
    const nombre = `apple-splash-${w}x${h}.png`
    writeFileSync(join(splashDir, nombre), generarSplash(w, h))
    reportados.push(`apple-splash/${nombre}`)
  }
  return reportados
}

// CLI
if (import.meta.url === new URL(`file://${process.argv[1].replaceAll('\\', '/')}`).href || process.argv[1]?.endsWith('generate-pwa-assets.mjs')) {
  const emitidos = generar()
  console.log(`PWA assets generados (${emitidos.length}): ${emitidos.join(', ')}`)
}
