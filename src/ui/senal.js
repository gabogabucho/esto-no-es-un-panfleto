// src/ui/senal.js — Integración de La Señal (GS-030/031/032).
//
// Conecta el estado de La Señal (state/signal.js → {valor, nivel}) con la
// capa visual: glitch CSS al contenedor de la escena, nivel al canvas
// decorativo, rasgado al volante ZINE y aria-label del indicador (R1).
// Devuelve una función desconectar() para el ciclo de vida del shell (M4).
//
// API: conectarSenal(estado, opts) → desconectar()
//   opts.contenedor  → contenedor de la escena (recibe .glitch-N)
//   opts.zonaZine    → contenedor .modo-zine (recibe .tear-N)
//   opts.indicador   → elemento con aria-label "Señal: …" a actualizar (R1)
//   opts.lienzo      → controlador de signal/canvas.js (o se crea uno)
//   opts.root        → raíz donde crear el canvas (default document.body)
//   opts.modo        → 'feed' | 'radio' | 'zine' (efecto del canvas)
//
// Con prefers-reduced-motion el canvas solo pinta frames estáticos (GS-032);
// aquí no hay que decidir nada: lo maneja signal/canvas.js.
// También se expone el token --senal-intensidad (0..1) para CSS futuro.

import { aplicarGlitch, quitarGlitch } from '../signal/glitch.js'
import { crearLienzoSenal, intensidadPorNivel } from '../signal/canvas.js'
import { descripcionNivel } from '../state/signal.js'

export const CLASES_TEAR = ['tear-1', 'tear-2', 'tear-3']

/** Clase de rasgado ZINE para un nivel 0-3 (null si nivel 0). Puro. */
export function claseTear(nivel) {
  const n = Math.max(0, Math.min(3, Math.round(Number(nivel) || 0)))
  return n === 0 ? null : 'tear-' + n
}

/**
 * Conecta el estado de La Señal con la capa visual. Devuelve desconectar()
 * que revierte glitch, rasgado, canvas e indicador.
 */
export function conectarSenal(estado, opts = {}) {
  const contenedor = opts.contenedor ?? null
  const zonaZine = opts.zonaZine ?? null
  const indicador = opts.indicador ?? null
  const lienzo =
    opts.lienzo ??
    crearLienzoSenal(opts.root ?? document.body, {
      modo: opts.modo ?? 'feed',
      nivel: estado?.senal?.nivel ?? 0,
    })

  function aplicar(nivel) {
    const n = Math.max(0, Math.min(3, Math.round(Number(nivel) || 0)))
    if (contenedor) aplicarGlitch(contenedor, n)
    if (zonaZine) {
      for (const c of CLASES_TEAR) zonaZine.classList.remove(c)
      const t = claseTear(n)
      if (t) zonaZine.classList.add(t)
    }
    if (lienzo && typeof lienzo.setNivel === 'function') lienzo.setNivel(n)
    if (indicador) indicador.setAttribute('aria-label', `Señal: ${descripcionNivel(n)}`)

    // Token CSS para que cualquier hoja pueda escalar por textura (design §7).
    const raiz = contenedor ?? document.documentElement
    raiz.style.setProperty('--senal-intensidad', intensidadPorNivel(n).toFixed(3))
    raiz.style.setProperty('--senal-nivel', String(n))
  }

  aplicar(estado?.senal?.nivel ?? 0)
  if (lienzo && typeof lienzo.iniciar === 'function') lienzo.iniciar()

  return function desconectar() {
    if (contenedor) quitarGlitch(contenedor)
    if (zonaZine) for (const c of CLASES_TEAR) zonaZine.classList.remove(c)
    if (lienzo && typeof lienzo.destruir === 'function') lienzo.destruir()
    else if (lienzo && typeof lienzo.detener === 'function') lienzo.detener()
    if (indicador) indicador.removeAttribute('aria-label')
  }
}
