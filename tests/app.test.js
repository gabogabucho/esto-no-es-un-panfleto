// @vitest-environment jsdom
// tests/app.test.js — Shell del juego (T-039/T-040).
// Partida completa de punta a punta con las 29 escenas del entregable C:
// portada → rol → escenas → final de acto (×3) → las seis pantallas del cierre.
// Además: resume desde enp-save-v1, memorial y materiales desde el menú, saltar
// el cierre a partir de la segunda vuelta y ciclo de vida de La Señal.

import { describe, it, expect, beforeEach } from 'vitest'
import {
  crearApp,
  deltasEntre,
  deltasInventarioEntre,
  PANTALLA,
  proximoGrupo,
  SECUENCIA_CIERRE,
  sumarMateriales,
  ambienteDeEscena,
} from '../src/app.js'
import { CLAVE_CIERRE, CLAVE_GUARDADO, cargar, leerConteo } from '../src/state/persistencia.js'
import { initEstado } from '../src/state/game-state.js'
import { escenaPorId } from '../src/content/escenas.js'

function almacenFalso(inicial = {}) {
  const datos = new Map(Object.entries(inicial))
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
  }
}

/** Documento con la misma estructura que index.html. */
function montarDocumento() {
  document.documentElement.lang = 'es-VE'
  document.body.innerHTML = `
    <a class="skip-link" href="#main">Saltar al contenido</a>
    <header class="encabezado">
      <nav aria-label="Principal">
        <button type="button" class="boton-menu" id="boton-menu" hidden>Menú</button>
      </nav>
    </header>
    <main id="main" tabindex="-1"></main>
    <footer class="pie"><p id="pie-texto"></p></footer>
  `
}

function arrancar(almacen = almacenFalso()) {
  montarDocumento()
  return crearApp({ almacen, autoFoco: false }).montar()
}

/** Botones jugables: los del grupo en curso (ni oculto ni resuelto). */
const decisionesVisibles = () =>
  [
    ...document.querySelectorAll(
      '.decision-group:not([hidden]):not(.decision-group--resuelto) button.decision',
    ),
  ].filter((b) => !b.hidden && !b.disabled)

const botonPorTexto = (texto) =>
  [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === texto)

const botonSeguir = () => document.querySelector('.boton--seguir')

/** Un paso hacia adelante, sea cual sea la pantalla. */
function avanzar(app) {
  if (app.sesion.pantalla === PANTALLA.ROL) {
    document.querySelector('.opcion--rol').click()
    return
  }
  if (app.sesion.pantalla === PANTALLA.ESCENA) {
    // El relato llega de a un bloque: primero se descubre, después se decide.
    const seguir = botonSeguir()
    if (seguir) {
      seguir.click()
      return
    }
    const opciones = decisionesVisibles()
    if (opciones.length > 0) {
      opciones[0].click()
      return
    }
  }
  const boton =
    document.querySelector('.escena-accion .boton--primario') ||
    document.querySelector('.acciones .boton--primario') ||
    document.querySelector('.acciones .boton')
  boton.click()
}

/** Descubre el relato de la escena en curso hasta que aparezcan las cartas. */
function hastaDecidir(app, tope = 40) {
  let pasos = 0
  while (botonSeguir() && pasos++ < tope) botonSeguir().click()
  return decisionesVisibles()
}

/** Juega hasta la pantalla pedida (o hasta agotar el tope de pasos). */
function jugarHasta(app, destino, tope = 900) {
  const visitadas = [app.sesion.pantalla]
  let pasos = 0
  while (app.sesion.pantalla !== destino && pasos++ < tope) {
    avanzar(app)
    if (app.sesion.pantalla !== visitadas[visitadas.length - 1]) {
      visitadas.push(app.sesion.pantalla)
    }
  }
  return visitadas
}

describe('portada', () => {
  it('sin guardado solo ofrece empezar', () => {
    const app = arrancar()
    expect(app.sesion.pantalla).toBe(PANTALLA.INICIO)
    expect(botonPorTexto('Empezar')).toBeTruthy()
    expect(botonPorTexto('Continuar la partida')).toBeUndefined()
  })

  it('el menú deja de estar oculto al montar', () => {
    arrancar()
    const boton = document.querySelector('#boton-menu')
    expect(boton.hidden).toBe(false)
    expect(boton.getAttribute('aria-expanded')).toBe('false')
  })

  it('no pisa el guardado por estar en la portada', () => {
    const almacen = almacenFalso()
    const primera = arrancar(almacen)
    jugarHasta(primera, PANTALLA.ESCENA)
    const antes = almacen.getItem(CLAVE_GUARDADO)

    arrancar(almacen) // segundo arranque: la portada no debe escribir
    expect(almacen.getItem(CLAVE_GUARDADO)).toBe(antes)
  })
})

describe('partida completa con el banco de escenas del entregable C', () => {
  it('llega a los créditos pasando por los tres actos y el cierre en orden', () => {
    const app = arrancar()
    const visitadas = jugarHasta(app, PANTALLA.CREDITOS)

    expect(app.sesion.pantalla).toBe(PANTALLA.CREDITOS)
    expect(app.sesion.finales.map((f) => f.acto)).toEqual([1, 2, 3])

    // Las seis pantallas del cierre, en el orden del entregable H.
    const cierre = visitadas.filter((p) => SECUENCIA_CIERRE.includes(p))
    expect(cierre).toEqual(SECUENCIA_CIERRE)
  })

  it('empezar cuenta la partida iniciada y llegar a créditos la completa (conteo)', () => {
    const almacen = almacenFalso()
    const app = arrancar(almacen)
    expect(leerConteo(almacen)).toEqual({ iniciadas: 0, completadas: 0 })

    // Desde la portada: Empezar inicia la primera partida.
    botonPorTexto('Empezar').click()
    expect(leerConteo(almacen)).toEqual({ iniciadas: 1, completadas: 0 })

    jugarHasta(app, PANTALLA.CREDITOS)
    expect(leerConteo(almacen)).toEqual({ iniciadas: 1, completadas: 1 })

    // Volver al inicio y empezar de nuevo: otra partida iniciada, y el conteo
    // de completadas no se duplica por estar ya en créditos (flag de sesión).
    botonPorTexto('Volver al inicio').click()
    botonPorTexto('Empezar').click()
    expect(leerConteo(almacen)).toEqual({ iniciadas: 2, completadas: 1 })
  })

  it('cada acto cierra con un final resuelto de la matriz (GS-015)', () => {
    const app = arrancar()
    jugarHasta(app, PANTALLA.CREDITOS)
    for (const registro of app.sesion.finales) {
      expect(typeof registro.final.id).toBe('string')
      expect(typeof registro.final.nombre).toBe('string')
      expect(['CO', 'RI', 'RE', 'CF', 'PP']).toContain(registro.dominante)
    }
  })

  it('desde los créditos, volver al inicio deja la portada limpia', () => {
    const almacen = almacenFalso()
    const app = arrancar(almacen)
    jugarHasta(app, PANTALLA.CREDITOS)

    botonPorTexto('Volver al inicio').click()
    expect(app.sesion.pantalla).toBe(PANTALLA.INICIO)
    expect(botonPorTexto('Continuar la partida')).toBeUndefined()
    expect(almacen.getItem(CLAVE_GUARDADO)).toBeNull()
  })
})

describe('escena', () => {
  let app

  beforeEach(() => {
    app = arrancar()
    jugarHasta(app, PANTALLA.ESCENA)
  })

  it('la escena abre con la ilustración y el relato en dosis, no con todo el texto', () => {
    expect(document.querySelector('.escena-escenario .ilustracion')).toBeTruthy()
    expect(app.sesion.revelados).toBe(1)
    // Con bloques por descubrir, la acción es seguir; todavía no hay cartas.
    expect(botonSeguir()).toBeTruthy()
    expect(decisionesVisibles()).toHaveLength(0)
  })

  it('el cuerpo entra en modo escena para que la página se aparte', () => {
    expect(document.body.classList.contains('en-escena')).toBe(true)
  })

  it('muestra un solo grupo de decisión a la vez (GS-021)', () => {
    hastaDecidir(app)
    const visibles = [...document.querySelectorAll('.decision-group')].filter(
      (g) => !g.hasAttribute('hidden'),
    )
    expect(visibles).toHaveLength(1)
  })

  it('las cartas muestran lo que promete cada opción', () => {
    hastaDecidir(app)
    const carta = document.querySelector('.escena-accion .decision')
    expect(carta.querySelector('.decision-label')).toBeTruthy()
    expect(carta.querySelectorAll('.chip').length).toBeGreaterThan(0)
  })

  it('la consecuencia se VE en el relato, no solo se anuncia', () => {
    const opcion = hastaDecidir(app)[0]
    expect(document.querySelectorAll('.consecuencia')).toHaveLength(0)
    opcion.click()
    const vistas = [...document.querySelectorAll('.escena-relato .consecuencia')]
    expect(vistas.length).toBeGreaterThan(0)
    expect(vistas[0].textContent.trim().length).toBeGreaterThan(0)
    expect(app.sesion.consecuencias.length).toBeGreaterThan(0)
  })

  it('una decisión mueve los stats y anuncia la consecuencia (GS-022)', () => {
    const antes = { ...app.sesion.estado.stats }
    const opcion = hastaDecidir(app)[0]
    const etiqueta = opcion.textContent

    opcion.click()

    expect(app.sesion.estado.stats).not.toEqual(antes)
    expect(app.sesion.historial ?? app.sesion.estado.historial).toBeTruthy()
    expect(etiqueta).toContain(app.sesion.estado.historial.at(-1).opcion)
    expect(document.querySelector('#consecuencia-live').textContent.length).toBeGreaterThan(0)
  })

  it('marca en el HUD los ejes que acaban de moverse', () => {
    hastaDecidir(app)[0].click()
    expect(document.querySelectorAll('.hud .hud-eje-delta').length).toBeGreaterThan(0)
  })

  it('la región aria-live sobrevive al re-render', () => {
    const region = document.querySelector('#consecuencia-live')
    hastaDecidir(app)[0].click()
    expect(document.querySelector('#consecuencia-live')).toBe(region)
  })

  it('La Señal monta su lienzo en la escena y lo suelta al salir', () => {
    expect(document.querySelector('canvas#senal')).toBeTruthy()
    jugarHasta(app, PANTALLA.FINAL)
    expect(document.querySelector('canvas#senal')).toBeNull()
  })

  it('el pie dice en qué acto estás, y lo suelta en el cierre', () => {
    expect(document.querySelector('#pie-texto').textContent).toContain('Acto 1')
    jugarHasta(app, PANTALLA.CREDITOS)
    expect(document.querySelector('#pie-texto').textContent).toBe('Venezuela, 2014')
  })

  it('lista las fuentes de la escena con su nivel de certeza (GS-093)', () => {
    const fuentes = document.querySelector('.fuentes')
    expect(fuentes).toBeTruthy()
    expect(fuentes.querySelectorAll('li').length).toBeGreaterThan(0)
  })
})

describe('resume de sesión', () => {
  it('un guardado válido ofrece continuar y devuelve la partida donde estaba', () => {
    const almacen = almacenFalso()
    const primera = arrancar(almacen)
    jugarHasta(primera, PANTALLA.ESCENA)
    hastaDecidir(primera)[0].click()
    const esperado = cargar(almacen)

    const segunda = arrancar(almacen)
    expect(segunda.sesion.pantalla).toBe(PANTALLA.INICIO)
    botonPorTexto('Continuar la partida').click()

    expect(segunda.sesion.pantalla).toBe(esperado.pantalla)
    expect(segunda.sesion.escenaId).toBe(esperado.escenaId)
    expect(segunda.sesion.estado.stats).toEqual(esperado.estado.stats)
    expect(segunda.sesion.jugados).toEqual(esperado.jugados)
  })

  it('empezar de nuevo borra el guardado anterior', () => {
    const almacen = almacenFalso()
    const primera = arrancar(almacen)
    jugarHasta(primera, PANTALLA.ESCENA)

    const segunda = arrancar(almacen)
    botonPorTexto('Empezar de nuevo').click()
    expect(segunda.sesion.pantalla).toBe(PANTALLA.ROL)
    expect(segunda.sesion.acto).toBe(1)
  })

  it('un guardado corrupto arranca partida nueva sin ofrecer continuar', () => {
    const almacen = almacenFalso({ [CLAVE_GUARDADO]: '{roto' })
    const app = arrancar(almacen)
    expect(app.sesion.pantalla).toBe(PANTALLA.INICIO)
    expect(botonPorTexto('Continuar la partida')).toBeUndefined()
  })

  it('un guardado que apunta a una escena inexistente vuelve a la portada', () => {
    const almacen = almacenFalso()
    const primera = arrancar(almacen)
    jugarHasta(primera, PANTALLA.ESCENA)
    const guardado = cargar(almacen)
    almacen.setItem(CLAVE_GUARDADO, JSON.stringify({ ...guardado, escenaId: 'FIX-99' }))

    const segunda = arrancar(almacen)
    botonPorTexto('Continuar la partida').click()
    expect(segunda.sesion.pantalla).toBe(PANTALLA.ESCENA)
    expect(document.querySelector('.pantalla--inicio')).toBeTruthy()
  })

  it('sin almacén el juego se puede jugar igual', () => {
    montarDocumento()
    const app = crearApp({ almacen: null, autoFoco: false }).montar()
    jugarHasta(app, PANTALLA.CREDITOS)
    expect(app.sesion.pantalla).toBe(PANTALLA.CREDITOS)
  })
})

describe('menú', () => {
  it('abre el memorial en cualquier momento y vuelve a donde estabas', () => {
    const app = arrancar()
    jugarHasta(app, PANTALLA.ESCENA)
    const escenaId = app.sesion.escenaId

    document.querySelector('#boton-menu').click()
    expect(app.menuAbierto).toBe(true)
    botonPorTexto('Memorial').click()

    expect(app.sesion.pantalla).toBe(PANTALLA.MEMORIAL)
    expect(document.querySelectorAll('.capa').length).toBe(4)
    expect(document.querySelectorAll('.ficha').length).toBe(43)

    botonPorTexto('Volver').click()
    expect(app.sesion.pantalla).toBe(PANTALLA.ESCENA)
    expect(app.sesion.escenaId).toBe(escenaId)
  })

  it('el sonido arranca apagado y se puede encender (GS-033)', () => {
    const app = arrancar()
    document.querySelector('#boton-menu').click()
    expect(botonPorTexto('Sonido: apagado')).toBeTruthy()
    botonPorTexto('Sonido: apagado').click()
    expect(app.sesion.sonido).toBe(true)
  })

  it('Escape cierra el menú y devuelve el foco al botón', () => {
    const app = arrancar()
    const boton = document.querySelector('#boton-menu')
    boton.click()
    expect(app.menuAbierto).toBe(true)

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }))
    expect(app.menuAbierto).toBe(false)
    expect(document.activeElement).toBe(boton)
    expect(boton.getAttribute('aria-expanded')).toBe('false')
  })

  it('empezar de nuevo desde el menú devuelve a la portada', () => {
    const app = arrancar()
    jugarHasta(app, PANTALLA.ESCENA)
    document.querySelector('#boton-menu').click()
    botonPorTexto('Empezar de nuevo').click()
    expect(app.sesion.pantalla).toBe(PANTALLA.INICIO)
  })
})

describe('helpers del bucle de escena', () => {
  it('proximoGrupo salta los grupos cuya condición no se cumple (GS-002)', () => {
    // T-07 tiene tres grupos condicionales detrás del primero, y ninguna de
    // esas condiciones se cumple con el estado recién inicializado.
    const escena = escenaPorId('T-07')
    const estado = initEstado({ rol: 'vocero', acto: 1 })
    expect(escena.grupos.length).toBe(4)
    expect(proximoGrupo(escena, estado, 0)).toBe(0)
    expect(proximoGrupo(escena, estado, 1)).toBe(-1)
  })

  it('sumarMateriales acumula sin repetir y sin mutar', () => {
    const base = ['a']
    expect(sumarMateriales(base, 'b', 'a', null, undefined, '')).toEqual(['a', 'b'])
    expect(base).toEqual(['a'])
  })

  it('deltasEntre solo reporta los ejes que se movieron', () => {
    expect(deltasEntre({ CO: 10, RI: 5 }, { CO: 12, RI: 5 })).toEqual({ CO: 2 })
    expect(deltasEntre({ CO: 10 }, { CO: 10 })).toEqual({})
  })

  it('deltasInventarioEntre solo reporta los ítems que cambiaron (FG-05)', () => {
    expect(deltasInventarioEntre({ agua: 1, gasa: 2 }, { agua: 0, gasa: 2 })).toEqual({ agua: -1 })
    expect(deltasInventarioEntre({ agua: 1 }, { agua: 1 })).toEqual({})
  })
})

describe('materiales desbloqueados (GS-012)', () => {
  it('una decisión que desbloquea material lo guarda en la sesión y lo muestra el menú', () => {
    const app = arrancar()
    jugarHasta(app, PANTALLA.ESCENA)
    // T-06 es la escena del acto 1 cuya tercera opción desbloquea material.
    while (app.sesion.escenaId !== 'T-06' && app.sesion.pantalla === PANTALLA.ESCENA) {
      avanzar(app)
    }
    expect(app.sesion.escenaId).toBe('T-06')
    expect(app.sesion.materiales).toEqual([])

    const opciones = hastaDecidir(app)
    opciones[2].click()
    expect(app.sesion.materiales).toEqual(['material-otro-angulo'])

    document.querySelector('#boton-menu').click()
    expect(botonPorTexto('Materiales (1)')).toBeTruthy()
    botonPorTexto('Materiales (1)').click()
    expect(app.sesion.pantalla).toBe(PANTALLA.MATERIALES)
    expect(document.querySelectorAll('.material')).toHaveLength(1)

    botonPorTexto('Volver').click()
    expect(app.sesion.pantalla).toBe(PANTALLA.ESCENA)
  })

  it('sin materiales, la pantalla lo dice en vez de quedar en blanco', () => {
    const app = arrancar()
    document.querySelector('#boton-menu').click()
    botonPorTexto('Materiales').click()
    expect(app.sesion.pantalla).toBe(PANTALLA.MATERIALES)
    expect(document.querySelector('.materiales-vacio')).toBeTruthy()
  })
})

describe('saltar el cierre (entregable H §7)', () => {
  it('la primera vez no se puede saltar ninguna pantalla del cierre', () => {
    const app = arrancar()
    jugarHasta(app, PANTALLA.PULSO)
    for (const pantalla of SECUENCIA_CIERRE.slice(0, -1)) {
      expect(app.sesion.pantalla).toBe(pantalla)
      expect(botonPorTexto('Saltar el cierre')).toBeUndefined()
      avanzar(app)
    }
    expect(app.sesion.pantalla).toBe(PANTALLA.CREDITOS)
  })

  it('haber llegado a los créditos deja constancia en el almacén', () => {
    const almacen = almacenFalso()
    const app = arrancar(almacen)
    expect(almacen.getItem(CLAVE_CIERRE)).toBeNull()
    jugarHasta(app, PANTALLA.CREDITOS)
    expect(almacen.getItem(CLAVE_CIERRE)).toBe('1')
  })

  it('en la segunda partida el cierre se puede saltar, y saltarlo lleva a los créditos', () => {
    const almacen = almacenFalso()
    jugarHasta(arrancar(almacen), PANTALLA.CREDITOS)

    const segunda = arrancar(almacen)
    jugarHasta(segunda, PANTALLA.PULSO)
    const boton = botonPorTexto('Saltar el cierre')
    expect(boton).toBeTruthy()
    boton.click()
    expect(segunda.sesion.pantalla).toBe(PANTALLA.CREDITOS)
  })

  it('el permiso de saltar sobrevive a empezar de nuevo', () => {
    const almacen = almacenFalso()
    const app = arrancar(almacen)
    jugarHasta(app, PANTALLA.CREDITOS)
    botonPorTexto('Volver al inicio').click()
    expect(almacen.getItem(CLAVE_GUARDADO)).toBeNull()
    expect(almacen.getItem(CLAVE_CIERRE)).toBe('1')
  })
})

describe('el banco de escenas se juega entero', () => {
  it('los tres actos recorren sus escenas en orden cronológico', () => {
    const app = arrancar()
    const vistas = []
    let pasos = 0
    while (app.sesion.pantalla !== PANTALLA.CREDITOS && pasos++ < 400) {
      if (app.sesion.pantalla === PANTALLA.ESCENA && !vistas.includes(app.sesion.escenaId)) {
        vistas.push(app.sesion.escenaId)
      }
      avanzar(app)
    }
    expect(vistas.filter((id) => id.startsWith('T-'))).toHaveLength(9)
    expect(vistas.filter((id) => id.startsWith('C-'))).toHaveLength(11)
    expect(vistas.filter((id) => id.startsWith('Z-'))).toHaveLength(9)
    expect(vistas[0]).toBe('T-01')
    expect(vistas.at(-1)).toBe('Z-09')
  })
})

describe('ambiente por escena (GS-033)', () => {
  it('cada modo trae su ambiente por defecto', () => {
    expect(ambienteDeEscena(escenaPorId('T-01'))).toBe('bullicio') // FEED, la calle
    expect(ambienteDeEscena(escenaPorId('T-02'))).toBe('cuarto') // ZINE, interior
    expect(ambienteDeEscena(escenaPorId('Z-05'))).toBe('aire') // RADIO, madrugada
  })

  it('la escena puede pedir el suyo, y «silencio» es silencio de verdad', () => {
    expect(ambienteDeEscena({ modo: 'FEED', ambiente: 'lluvia' })).toBe('lluvia')
    expect(ambienteDeEscena({ modo: 'FEED', ambiente: 'silencio' })).toBeNull()
    expect(ambienteDeEscena(null)).toBeNull()
  })

  it('el sonido sigue apagado por defecto: nada suena sin que el jugador lo pida', () => {
    const app = arrancar()
    jugarHasta(app, PANTALLA.ESCENA)
    expect(app.sesion.sonido).toBe(false)
  })
})
