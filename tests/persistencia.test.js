// tests/persistencia.test.js — Resume de sesión (T-040).
// Un guardado corrupto, viejo o incompleto NUNCA debe dejar al jugador
// atrapado: cargar() devuelve null, borra el guardado y el shell arranca
// partida nueva. Sin almacén (Safari privado) el juego sigue sin persistir.

import { describe, it, expect } from 'vitest'
import {
  CLAVE_CONTEO,
  CLAVE_GUARDADO,
  VERSION_GUARDADO,
  borrar,
  cargar,
  contarPartidaCompletada,
  contarPartidaIniciada,
  esEstadoValido,
  esSesionValida,
  guardar,
  hayGuardado,
  leerConteo,
} from '../src/state/persistencia.js'
import { initEstado } from '../src/state/game-state.js'
import { sesionInicial, PANTALLA } from '../src/app.js'

/** localStorage de mentira: mismo contrato, sin navegador. */
function almacenFalso(inicial = {}) {
  const datos = new Map(Object.entries(inicial))
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
    claves: () => [...datos.keys()],
  }
}

/** Almacén que lanza al escribir: cuota llena o modo privado. */
function almacenSinCuota() {
  return {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError')
    },
    removeItem: () => {},
  }
}

function sesionJugando() {
  return {
    ...sesionInicial(),
    pantalla: PANTALLA.ESCENA,
    acto: 2,
    rol: 'vocero',
    escenaId: 'FIX-01',
    grupoIdx: 0,
    estado: initEstado({ rol: 'vocero', acto: 2 }),
  }
}

describe('guardar / cargar (enp-save-v1)', () => {
  it('una sesión en curso vuelve igual del almacén', () => {
    const almacen = almacenFalso()
    const sesion = sesionJugando()
    expect(guardar(sesion, almacen)).toBe(true)

    const recuperada = cargar(almacen)
    expect(recuperada.pantalla).toBe(PANTALLA.ESCENA)
    expect(recuperada.acto).toBe(2)
    expect(recuperada.escenaId).toBe('FIX-01')
    expect(recuperada.estado.stats).toEqual(sesion.estado.stats)
    expect(recuperada.version).toBe(VERSION_GUARDADO)
  })

  it('usa una sola clave versionada', () => {
    const almacen = almacenFalso()
    guardar(sesionJugando(), almacen)
    expect(almacen.claves()).toEqual([CLAVE_GUARDADO])
  })

  it('sella la marca de tiempo en cada escritura', () => {
    const almacen = almacenFalso()
    guardar(sesionJugando(), almacen)
    expect(typeof cargar(almacen).actualizado).toBe('string')
  })

  it('sin almacén no lanza: guardar devuelve false y cargar null', () => {
    expect(guardar(sesionJugando(), null)).toBe(false)
    expect(cargar(null)).toBeNull()
    expect(borrar(null)).toBe(false)
    expect(hayGuardado(null)).toBe(false)
  })

  it('con la cuota llena el juego sigue: guardar devuelve false sin lanzar', () => {
    expect(guardar(sesionJugando(), almacenSinCuota())).toBe(false)
  })

  it('borrar deja el almacén sin partida reanudable', () => {
    const almacen = almacenFalso()
    guardar(sesionJugando(), almacen)
    expect(hayGuardado(almacen)).toBe(true)
    expect(borrar(almacen)).toBe(true)
    expect(hayGuardado(almacen)).toBe(false)
  })
})

describe('guardados que no se pueden reanudar', () => {
  it('JSON roto: null y se borra', () => {
    const almacen = almacenFalso({ [CLAVE_GUARDADO]: '{no es json' })
    expect(cargar(almacen)).toBeNull()
    expect(almacen.getItem(CLAVE_GUARDADO)).toBeNull()
  })

  it('versión distinta: null y se borra (migración futura)', () => {
    const viejo = JSON.stringify({ ...sesionJugando(), version: 0 })
    const almacen = almacenFalso({ [CLAVE_GUARDADO]: viejo })
    expect(cargar(almacen)).toBeNull()
    expect(almacen.getItem(CLAVE_GUARDADO)).toBeNull()
  })

  it('estado sin los cinco ejes: null', () => {
    const roto = sesionJugando()
    delete roto.estado.stats.PP
    const almacen = almacenFalso({ [CLAVE_GUARDADO]: JSON.stringify({ ...roto, version: VERSION_GUARDADO }) })
    expect(cargar(almacen)).toBeNull()
  })

  it('estado sin inventario: null', () => {
    const roto = sesionJugando()
    roto.estado.inventario = null
    const almacen = almacenFalso({ [CLAVE_GUARDADO]: JSON.stringify({ ...roto, version: VERSION_GUARDADO }) })
    expect(cargar(almacen)).toBeNull()
  })

  it('almacén vacío: null sin ruido', () => {
    expect(cargar(almacenFalso())).toBeNull()
  })
})

describe('validadores de forma', () => {
  it('esEstadoValido exige stats, inventario, flags, historial y contador', () => {
    const estado = initEstado({ rol: 'vocero', acto: 1 })
    expect(esEstadoValido(estado)).toBe(true)
    expect(esEstadoValido(null)).toBe(false)
    expect(esEstadoValido({ ...estado, historial: 'no' })).toBe(false)
    expect(esEstadoValido({ ...estado, flags: null })).toBe(false)
    expect(esEstadoValido({ ...estado, ppBajaSostenida: 'dos' })).toBe(false)
  })

  it('esSesionValida acepta la sesión de portada (todavía sin estado)', () => {
    expect(esSesionValida({ ...sesionInicial(), version: VERSION_GUARDADO })).toBe(true)
  })

  it('esSesionValida rechaza un acto fuera de 1-3 y una pantalla vacía', () => {
    const base = { ...sesionInicial(), version: VERSION_GUARDADO }
    expect(esSesionValida({ ...base, acto: 7 })).toBe(false)
    expect(esSesionValida({ ...base, pantalla: '' })).toBe(false)
    expect(esSesionValida({ ...base, finales: null })).toBe(false)
    expect(esSesionValida({ ...base, grupoIdx: 'cero' })).toBe(false)
  })
})

describe('conteo de partidas (enp-conteo-v1)', () => {
  it('sin almacén ni contador previo devuelve ceros', () => {
    expect(leerConteo(null)).toEqual({ iniciadas: 0, completadas: 0 })
    expect(leerConteo(almacenFalso())).toEqual({ iniciadas: 0, completadas: 0 })
  })

  it('empezar suma iniciadas y completar suma completadas', () => {
    const almacen = almacenFalso()
    contarPartidaIniciada(almacen)
    contarPartidaIniciada(almacen)
    contarPartidaCompletada(almacen)
    expect(leerConteo(almacen)).toEqual({ iniciadas: 2, completadas: 1 })
  })

  it('sobrevive a borrar el guardado de sesión (es independiente)', () => {
    const almacen = almacenFalso()
    guardar(sesionJugando(), almacen)
    contarPartidaIniciada(almacen)
    borrar(almacen)
    expect(hayGuardado(almacen)).toBe(false)
    expect(leerConteo(almacen)).toEqual({ iniciadas: 1, completadas: 0 })
  })

  it('un contador corrupto no lanza: vuelve a ceros', () => {
    const almacen = almacenFalso({ [CLAVE_CONTEO]: '{roto' })
    expect(leerConteo(almacen)).toEqual({ iniciadas: 0, completadas: 0 })
    expect(contarPartidaIniciada(almacen)).toBe(true)
    expect(leerConteo(almacen)).toEqual({ iniciadas: 1, completadas: 0 })
  })
})
