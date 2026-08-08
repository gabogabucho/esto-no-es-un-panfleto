// src/state/game-state.js — Orquestador del estado de sesión (GS-010..GS-017).
// Puro, sin DOM. Turn-based: cada elección = un evento (NG-4).
//
// API M1b: initEstado({rol, acto}), aplicarOpcion(estado, opcion, ctx),
// evaluarCondicion(condicionStr, estado, contexto), TIPO_EVENTO.
//
// NOTA de seguridad (evaluarCondicion): el contenido es de confianza —
// fixtures y contenido curado futuro (cambio #2). El sandbox solo expone las
// variables permitidas (estado, decisiones, stats, flags, inventario) vía
// new Function; nunca se evalúa input del usuario.

import { inicialStats, aplicarDeltas, EJES } from './stats.js'
import { inventarioInicial, aplicarInventario } from './inventory.js'
import { calcularSenal, nivelSenal } from './signal.js'

export const TIPO_EVENTO = { INFILTRACION: 'infiltracion' }

// GS-016: deltas extra de infiltración (CF baja, PP golpeada, RE intacta).
export const DELTAS_INFILTRACION = { CF: -3, PP: -2 }
export const FLAG_RUMOR = 'rumor-infiltracion'

// GS-014: umbral de PP baja y cuántas decisiones consecutivas generan el flag.
export const PP_UMBRAL_BAJA = 25
export const PP_CONSECUTIVAS_PASAPORTE = 3

/**
 * Crea el estado inicial de una sesión: stats desde roles.json (rol), inventario
 * desde actos.json (acto), flags vacíos, ppBajaSostenida 0, señal inicial e
 * historial vacío.
 */
export function initEstado({ rol, acto } = {}) {
  const rolId = typeof rol === 'string' ? rol : rol?.id ?? null
  const stats = inicialStats(rolId)
  const senal = { valor: calcularSenal(stats), nivel: nivelSenal(calcularSenal(stats)) }
  return {
    rol: rolId,
    acto,
    stats,
    inventario: inventarioInicial(acto),
    flags: {},
    ppBajaSostenida: 0,
    senal,
    historial: [],
  }
}

/**
 * Historial reducido a decisiones elegidas: [{opcion, escenaId, grupoId}].
 * Alimenta las condiciones string tipo "decisiones[0].opcion === 'X'" (GS-002).
 */
export function decisionesDesdeHistorial(estado) {
  return (estado.historial || [])
    .filter((e) => typeof e.opcion === 'string')
    .map((e) => ({ opcion: e.opcion, escenaId: e.escenaId, grupoId: e.grupoId }))
}

/**
 * Evalúa una condición string (grupos[].condicion) contra el estado post-decisión.
 * Sandbox acotado: solo se exponen estado, decisiones, stats, flags e inventario.
 * Contenido de confianza (fixtures + contenido curado); nunca input de usuario.
 */
export function evaluarCondicion(condicionStr, estado, contexto = {}) {
  if (typeof condicionStr !== 'string' || condicionStr.trim() === '') return true
  const decisiones = contexto.decisiones ?? decisionesDesdeHistorial(estado)
  const stats = estado.stats
  const flags = estado.flags
  const inventario = estado.inventario
  let fn
  try {
    fn = new Function(
      'estado', 'decisiones', 'stats', 'flags', 'inventario',
      `"use strict"; return (${condicionStr});`,
    )
  } catch {
    return false // sintaxis rota → condición no se cumple
  }
  try {
    return Boolean(fn(estado, decisiones, stats, flags, inventario))
  } catch {
    return false // acceso inválido (estado.x.y.z) → false, nunca lanza
  }
}

/**
 * Evalúa `opcion.requiere` (string): referencia simple a flag ("sigue-multitud")
 * o expresión evaluable. true si no hay requisito.
 */
export function cumpleRequiere(estado, requiere) {
  if (typeof requiere !== 'string' || requiere.trim() === '') return true
  const t = requiere.trim()
  // Referencia simple a flag declarado.
  if (/^[a-zA-Z0-9_-]+$/.test(t)) return estado.flags[t] === true
  return evaluarCondicion(t, estado)
}

/**
 * Aplica una opción de decisión al estado. Orden exacto (design §5):
 * 1) deltas de la opción + autoDeltas de la escena (ctx.autoDeltas, GS-010)
 * 2) inventario: validar costo → gastar; aplicar ganancia (GS-011)
 * 3) flags de la opción (GS-012)
 * 4) evento.infiltracion tras deltas (GS-016): CF < siCFBajo → deltas extra
 *    + flag de rumor no borrable + entrada de historial
 * 5) historial += {escenaId, grupoId, opcion, consecuencia}
 * 6) ppBajaSostenida (GS-014): +=1 si PP<umbral, =0 si PP≥umbral;
 *    N consecutivas → flag 'pasaporte'
 * 7) señal recalculada
 *
 * Devuelve {ok:true, estado, evento?, costo?} o {ok:false, razon} si el costo
 * no es satisfacible. Nunca muta el estado de entrada.
 */
export function aplicarOpcion(estado, opcion, ctx = {}) {
  const autoDeltas = ctx.autoDeltas || {}
  const costo = opcion?.inventario?.costo || null

  // 2) Inventario primero: si el costo no se puede pagar, no se aplica nada.
  const invResult = aplicarInventario(estado.inventario, opcion?.inventario || {})
  if (!invResult.ok) {
    return { ok: false, razon: invResult.razon, costo }
  }

  // 1) Deltas de la opción + autoDeltas de la escena (GS-010).
  const deltas = { ...(opcion.deltas || {}) }
  for (const eje of EJES) {
    if (typeof autoDeltas[eje] === 'number') {
      deltas[eje] = (deltas[eje] || 0) + autoDeltas[eje]
    }
  }
  let stats = aplicarDeltas(estado.stats, deltas)

  // 3) Flags de la opción (GS-012).
  const flags = { ...estado.flags, ...(opcion.flags || {}) }

  // 4) Evento de infiltración (GS-016) tras los deltas.
  let evento = null
  if (opcion?.evento?.tipo === TIPO_EVENTO.INFILTRACION) {
    const disparado = stats.CF < opcion.evento.siCFBajo
    evento = { tipo: TIPO_EVENTO.INFILTRACION, disparado, siCFBajo: opcion.evento.siCFBajo }
    if (disparado) {
      stats = aplicarDeltas(stats, DELTAS_INFILTRACION)
      flags[FLAG_RUMOR] = true // flag de rumor NO borrable del acto
    }
  }

  // 5) Historial (GS-017).
  const historial = [
    ...(estado.historial || []),
    {
      escenaId: ctx.escenaId ?? null,
      grupoId: ctx.grupoId ?? null,
      opcion: opcion.label,
      consecuencia: opcion.consecuencia ?? null,
      deltas,
      inventario: opcion?.inventario || null,
    },
  ]
  if (evento?.disparado) {
    historial.push({
      escenaId: ctx.escenaId ?? null,
      evento: TIPO_EVENTO.INFILTRACION,
      detalle: 'rumor de infiltración',
    })
  }

  // 6) Contador ppBajaSostenida (GS-014).
  let ppBajaSostenida = stats.PP < PP_UMBRAL_BAJA ? estado.ppBajaSostenida + 1 : 0
  if (ppBajaSostenida >= PP_CONSECUTIVAS_PASAPORTE) {
    flags.pasaporte = true
  }

  // 7) Señal recalculada.
  const senal = { valor: calcularSenal(stats), nivel: nivelSenal(calcularSenal(stats)) }

  const nuevo = {
    ...estado,
    stats,
    inventario: invResult.inventario,
    flags,
    ppBajaSostenida,
    senal,
    historial,
  }
  return { ok: true, estado: nuevo, evento, costo }
}
