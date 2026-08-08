// src/app.js — Shell del juego (T-039/T-040): máquina de estados de pantallas,
// bucle de escena y resume de sesión.
//
// Dirección de dependencias (design §3): app → ui/state/modes/content. Aquí no
// vive ni una cadena de interfaz: todo el copy está en src/ui/pantallas.js para
// que lo cubra el gate R1 (scripts/check-locale.mjs escanea src/ui).
//
// Flujo: inicio → rol → escena(s) del acto → final de acto → siguiente acto …
// y al cerrar el último acto, las cinco secuencias del cierre (entregable H):
// pulso → desgaste → vaciado → panfleto → cifra → créditos.
//
// El memorial (= la pantalla de vaciado) se abre desde el menú en cualquier
// momento y vuelve exactamente a donde estabas (entregable H §7).
//
// La sesión se guarda en cada transición y en cada decisión; si el guardado
// falla (sin localStorage, cuota llena) el juego sigue: solo se pierde el resume.

import { clear, el } from './lib/dom.js'
import { EJES, dominante } from './state/stats.js'
import { ITEMS } from './state/inventory.js'
import { initEstado, aplicarOpcion, evaluarCondicion } from './state/game-state.js'
import { resolveFinal } from './state/endings.js'
import { intensidadPorNivel, crearLienzoSenal } from './signal/canvas.js'
import { conectarSenal } from './ui/senal.js'
import { anuncia, focusScene, regionConsecuencia } from './ui/a11y.js'
import {
  conectarDesbloqueo,
  detenerAmbiente,
  detenerEstatica,
  ponerAmbiente,
  toggleEstatica,
} from './lib/audio.js'
import * as pantallas from './ui/pantallas.js'
import {
  almacenLocal,
  borrar,
  cargar,
  cierreVisto,
  contarPartidaCompletada,
  contarPartidaIniciada,
  guardar,
  leerConteo,
  marcarCierreVisto,
} from './state/persistencia.js'
import {
  actosJugables,
  escenaPorId,
  primeraEscena,
  siguienteActo,
  siguienteEscena,
} from './content/escenas.js'
import rolesData from './content/roles.json'
import materialesData from './content/materiales.json'
import memorialData from './content/memorial.json'
import cifrasData from './content/cifras.json'
import panfletoData from './content/panfleto.json'

export const PANTALLA = {
  INICIO: 'inicio',
  ROL: 'rol',
  ESCENA: 'escena',
  FINAL: 'final',
  PULSO: 'pulso',
  DESGASTE: 'desgaste',
  VACIADO: 'vaciado',
  PANFLETO: 'panfleto',
  CIFRA: 'cifra',
  CREDITOS: 'creditos',
  MEMORIAL: 'memorial',
  MATERIALES: 'materiales',
  TUTORIAL: 'tutorial',
}

// Orden fijo de las cinco secuencias del cierre (entregable H §1..§6).
export const SECUENCIA_CIERRE = [
  PANTALLA.PULSO,
  PANTALLA.DESGASTE,
  PANTALLA.VACIADO,
  PANTALLA.PANFLETO,
  PANTALLA.CIFRA,
  PANTALLA.CREDITOS,
]

// Pantallas que transcurren dentro de un acto: son las únicas que el pie nombra.
const PANTALLAS_DE_ACTO = [PANTALLA.ROL, PANTALLA.ESCENA, PANTALLA.FINAL]

// Ambiente sonoro por defecto de cada modo, cuando la escena no declara el
// suyo. FEED es la calle de día; ZINE, un interior; RADIO, la madrugada.
const AMBIENTE_POR_MODO = { FEED: 'bullicio', ZINE: 'cuarto', RADIO: 'aire' }

// Modo del lienzo de La Señal por modo de escena (signal/canvas.js).
const MODO_LIENZO = { FEED: 'feed', ZINE: 'zine', RADIO: 'radio' }

/** Ambiente sonoro que le toca a una escena: el suyo, o el de su modo. */
export function ambienteDeEscena(escena) {
  if (!escena) return null
  const propio = escena.ambiente
  if (propio === 'silencio') return null
  return propio || AMBIENTE_POR_MODO[escena.modo] || null
}

/** true si el sistema pide menos movimiento (GS-032). Nunca lanza. */
export function prefiereMovimientoReducido() {
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

/** Sesión limpia: la que se guarda y la que valida state/persistencia.js. */
export function sesionInicial() {
  return {
    version: 1,
    pantalla: PANTALLA.INICIO,
    acto: null,
    rol: null,
    escenaId: null,
    grupoIdx: 0,
    jugados: [],
    revelados: 1,
    consecuencias: [],
    estado: null,
    finales: [],
    materiales: [],
    volverA: null,
    sonido: false,
  }
}

/**
 * Índice del primer grupo desde `desde` cuya condición se cumple contra el
 * estado actual (GS-002). -1 si ya no queda ninguno: la escena está cerrada.
 */
export function proximoGrupo(escena, estado, desde = 0) {
  const grupos = escena?.grupos || []
  for (let i = Math.max(0, desde); i < grupos.length; i++) {
    if (evaluarCondicion(grupos[i].condicion, estado)) return i
  }
  return -1
}

/** Suma ids de material sin repetir y sin mutar la lista de entrada (GS-012). */
export function sumarMateriales(materiales, ...ids) {
  const salida = [...(materiales || [])]
  for (const id of ids) {
    if (typeof id === 'string' && id !== '' && !salida.includes(id)) salida.push(id)
  }
  return salida
}

/** Ejes que se movieron entre dos fotos de stats (peso visual de la decisión). */
export function deltasEntre(antes, despues) {
  const salida = {}
  for (const eje of EJES) {
    const d = (despues?.[eje] || 0) - (antes?.[eje] || 0)
    if (d !== 0) salida[eje] = d
  }
  return salida
}

/** Ítems de inventario que cambiaron entre dos fotos (GS-011, FG-05). */
export function deltasInventarioEntre(antes, despues) {
  const salida = {}
  for (const item of ITEMS) {
    const d = (despues?.[item] || 0) - (antes?.[item] || 0)
    if (d !== 0) salida[item] = d
  }
  return salida
}

/**
 * Crea el shell. Todas las dependencias del entorno son inyectables para poder
 * montar el juego completo en jsdom sin tocar globals.
 *
 * opts: { raiz, botonMenu, pie, almacen, autoFoco }
 */
export function crearApp(opts = {}) {
  const raiz = opts.raiz ?? document.querySelector('#main')
  if (!raiz) throw new Error('crearApp: falta el contenedor raiz')
  const botonMenu = opts.botonMenu ?? document.querySelector('#boton-menu')
  const pie = opts.pie ?? document.querySelector('#pie-texto')
  const almacen = opts.almacen !== undefined ? opts.almacen : almacenLocal()
  const autoFoco = opts.autoFoco !== false

  // Las pantallas viven en un contenedor propio para que el re-render nunca
  // arrastre la región aria-live persistente de consecuencias (GS-022).
  const zona = el('div', { class: 'zona-pantalla' })
  raiz.append(zona)
  regionConsecuencia()

  let sesion = sesionInicial()
  let guardadoPrevio = null
  // Se puede saltar el cierre, pero solo después de haberlo visto entero una
  // vez (entregable H §7). El permiso sobrevive a empezar de nuevo.
  let puedeSaltarCierre = false
  let menuAbierto = false
  let ultimosDeltas = null
  let ultimosDeltasInventario = null
  // El conteo de partidas completadas se suma una sola vez por visita a los
  // créditos; el flag se resetea al empezar (o reanudar) una partida.
  let contadaCompletada = false
  let montado = false

  // La Señal: un solo lienzo por modo de escena, reutilizado entre decisiones.
  let lienzo = null
  let modoLienzo = null
  let desconectarSenal = null
  let desconectarParallax = null

  // ---------------------------------------------------------------------
  // Sesión
  // ---------------------------------------------------------------------

  // En la portada no hay partida que guardar, y escribir allí pisaría el
  // guardado que el jugador todavía puede reanudar.
  function persistir() {
    if (sesion.pantalla === PANTALLA.INICIO) return
    guardar(sesion, almacen)
  }

  function ir(pantalla, cambios = {}) {
    sesion = { ...sesion, ...cambios, pantalla }
    menuAbierto = false
    persistir()
    render()
  }

  function reiniciar() {
    borrar(almacen)
    soltarSenal()
    detenerEstatica()
    detenerAmbiente()
    sesion = sesionInicial()
    guardadoPrevio = null
    menuAbierto = false
    ultimosDeltas = null
    ultimosDeltasInventario = null
    contadaCompletada = false
    render()
  }

  // ---------------------------------------------------------------------
  // La Señal (GS-030/031/032) y sonido (GS-033)
  // ---------------------------------------------------------------------

  /**
   * Parallax de la banda ilustrada. El scroll solo escribe una variable CSS en
   * el contenedor; el movimiento lo resuelve el compositor con transform, y
   * cada capa aplica su propio factor. Con prefers-reduced-motion no se ata
   * nada: el CSS ya deja las capas quietas (GS-032).
   */
  function conectarParallax(contenedor) {
    const capas = contenedor.querySelectorAll('.ilustracion-capa')
    if (capas.length === 0 || prefiereMovimientoReducido()) return null
    const banda = contenedor.querySelector('.ilustracion')
    let pendiente = 0

    // Recorrido máximo de una capa, en px. Tiene que quedar por debajo del
    // margen que las capas sobran por arriba y abajo (inset -8%), o el
    // desplazamiento descubre el borde de la imagen.
    const RECORRIDO = 16

    const pintar = () => {
      pendiente = 0
      const caja = banda.getBoundingClientRect()
      const alto = window.innerHeight || document.documentElement.clientHeight || 1
      // -1 cuando la banda está por debajo de la ventana, +1 cuando ya subió:
      // el desplazamiento es relativo a la banda, no al scroll absoluto de la
      // página, que es lo que hacía que la imagen se fuera del marco.
      const progreso = (alto / 2 - (caja.top + caja.height / 2)) / (alto / 2 + caja.height / 2)
      const acotado = Math.max(-1, Math.min(1, progreso))
      banda.style.setProperty('--parallax', `${(acotado * RECORRIDO).toFixed(2)}px`)
    }
    const alScroll = () => {
      if (!pendiente && typeof requestAnimationFrame === 'function') {
        pendiente = requestAnimationFrame(pintar)
      }
    }

    window.addEventListener('scroll', alScroll, { passive: true })
    pintar()
    return () => {
      if (pendiente) cancelAnimationFrame(pendiente)
      window.removeEventListener('scroll', alScroll)
    }
  }

  function soltarSenal() {
    detenerAmbiente()
    if (desconectarParallax) desconectarParallax()
    desconectarParallax = null
    if (desconectarSenal) desconectarSenal()
    desconectarSenal = null
    if (lienzo) lienzo.destruir()
    lienzo = null
    modoLienzo = null
  }

  /**
   * Envoltorio del lienzo SIN destruir(): conectarSenal() destruye el lienzo al
   * desconectar, y aquí queremos que sobreviva a las decisiones de una misma
   * escena. El ciclo de vida real del canvas lo lleva soltarSenal().
   */
  function lienzoCompartido() {
    return {
      iniciar: () => lienzo && lienzo.iniciar(),
      detener: () => lienzo && lienzo.detener(),
      setNivel: (n) => lienzo && lienzo.setNivel(n),
    }
  }

  function aplicarSenal(contenedor) {
    const modo = MODO_LIENZO[escenaActual()?.modo] || 'feed'
    if (!lienzo || modoLienzo !== modo) {
      if (lienzo) lienzo.destruir()
      lienzo = crearLienzoSenal(document.body, { modo, nivel: sesion.estado?.senal?.nivel ?? 0 })
      modoLienzo = modo
    }
    if (desconectarSenal) desconectarSenal()
    desconectarSenal = conectarSenal(sesion.estado, {
      contenedor,
      zonaZine: contenedor.querySelector('.modo-zine'),
      indicador: contenedor.querySelector('.senal-indicador'),
      lienzo: lienzoCompartido(),
    })
    if (sesion.sonido) {
      toggleEstatica(true, intensidadPorNivel(sesion.estado?.senal?.nivel ?? 0))
      ponerAmbiente(ambienteDeEscena(escenaActual()))
    }
  }

  function alternarSonido() {
    sesion = { ...sesion, sonido: !sesion.sonido }
    toggleEstatica(sesion.sonido, intensidadPorNivel(sesion.estado?.senal?.nivel ?? 0))
    if (sesion.sonido) ponerAmbiente(ambienteDeEscena(escenaActual()))
    else detenerAmbiente()
    persistir()
    render()
  }

  // ---------------------------------------------------------------------
  // Bucle de acto y escena
  // ---------------------------------------------------------------------

  function escenaActual() {
    return sesion.escenaId ? escenaPorId(sesion.escenaId) : null
  }

  function empezarActo(acto) {
    ir(PANTALLA.ROL, {
      acto,
      rol: null,
      estado: null,
      escenaId: null,
      grupoIdx: 0,
      jugados: [],
    })
  }

  function elegirRol(rol) {
    const primera = primeraEscena(sesion.acto)
    if (!primera) return cerrarActo()
    ir(PANTALLA.ESCENA, {
      rol: rol.id,
      estado: initEstado({ rol: rol.id, acto: sesion.acto }),
      escenaId: primera.id,
      grupoIdx: 0,
      jugados: [],
      revelados: 1,
      consecuencias: [],
    })
  }

  /** Descubre el siguiente bloque del relato. El texto llega en dosis. */
  function seguirRelato() {
    const escena = escenaActual()
    if (!escena) return
    const total = (escena.bloques || []).length
    if (sesion.revelados >= total) return
    sesion = { ...sesion, revelados: sesion.revelados + 1 }
    persistir()
    render()
  }

  function elegir(indice, opcion) {
    const escena = escenaActual()
    if (!escena) return
    const idx = proximoGrupo(escena, sesion.estado, sesion.grupoIdx)
    if (idx < 0) return
    const grupo = escena.grupos[idx]

    const antes = sesion.estado
    const resultado = aplicarOpcion(antes, opcion, {
      escenaId: escena.id,
      grupoId: grupo.id,
      autoDeltas: escena.autoDeltas,
    })
    if (!resultado.ok) {
      anuncia(pantallas.MENSAJES.sinInventario)
      return
    }

    const nuevo = resultado.estado
    // GS-013: el colapso de La Señal mata el FEED y no vuelve (flag latch).
    if (nuevo.senal?.nivel === 3) nuevo.flags.feed_muerto = true

    ultimosDeltas = deltasEntre(antes.stats, nuevo.stats)
    ultimosDeltasInventario = deltasInventarioEntre(antes.inventario, nuevo.inventario)
    // La consecuencia entra al relato: hasta ahora solo existía en la región
    // aria-live y ningún jugador que viera la pantalla llegaba a leerla.
    const dichas = [opcion.consecuencia]
    if (resultado.evento?.disparado) dichas.push(pantallas.MENSAJES.infiltracion)
    const eco = { eleccion: opcion.label, texto: dichas.filter(Boolean).join(' ') }
    sesion = {
      ...sesion,
      estado: nuevo,
      jugados: [...sesion.jugados, grupo.id],
      grupoIdx: idx + 1,
      consecuencias: [...sesion.consecuencias, eco],
      materiales: sumarMateriales(sesion.materiales, opcion.desbloquea),
    }
    persistir()
    render()

    anuncia(dichas.filter(Boolean).join(' '))
  }

  function avanzarEscena() {
    const materiales = sumarMateriales(sesion.materiales, escenaActual()?.desbloquea)
    const siguiente = siguienteEscena(sesion.acto, sesion.escenaId)
    ultimosDeltas = null
    ultimosDeltasInventario = null
    if (!siguiente) {
      sesion = { ...sesion, materiales }
      return cerrarActo()
    }
    ir(PANTALLA.ESCENA, {
      escenaId: siguiente.id,
      grupoIdx: 0,
      jugados: [],
      revelados: 1,
      consecuencias: [],
      materiales,
    })
  }

  function cerrarActo() {
    soltarSenal()
    const final = resolveFinal(sesion.acto, sesion.estado)
    const eje = dominante(sesion.estado?.stats || {})
    const registro = {
      acto: sesion.acto,
      rol: sesion.rol,
      final: { id: final.id, nombre: final.nombre },
      dominante: eje,
      intensidad: Number(((sesion.estado?.stats?.[eje] || 0) / 100).toFixed(2)),
    }
    ir(PANTALLA.FINAL, {
      finales: [...sesion.finales.filter((f) => f.acto !== sesion.acto), registro],
    })
  }

  function avanzarActo() {
    const siguiente = siguienteActo(sesion.acto)
    if (siguiente) return empezarActo(siguiente)
    ir(PANTALLA.PULSO)
  }

  function avanzarCierre(desde) {
    const i = SECUENCIA_CIERRE.indexOf(desde)
    const siguiente = SECUENCIA_CIERRE[i + 1]
    ir(siguiente || PANTALLA.CREDITOS)
  }

  function saltarCierre() {
    ir(PANTALLA.CREDITOS)
  }

  /** Callback de saltar solo si el jugador ya se ganó el permiso. */
  function saltoSiCorresponde() {
    return puedeSaltarCierre ? saltarCierre : undefined
  }

  // ---------------------------------------------------------------------
  // Menú
  // ---------------------------------------------------------------------

  function alternarMenu() {
    menuAbierto = !menuAbierto
    render()
  }

  /** Escape cierra el menú y devuelve el foco al botón que lo abrió. */
  function alEscape(ev) {
    if (ev.key !== 'Escape' || !menuAbierto) return
    menuAbierto = false
    render()
    if (botonMenu) botonMenu.focus()
  }

  function abrirMemorial() {
    if (sesion.pantalla === PANTALLA.MEMORIAL) return
    ir(PANTALLA.MEMORIAL, { volverA: sesion.pantalla })
  }

  function abrirTutorial() {
    if (sesion.pantalla === PANTALLA.TUTORIAL) return
    ir(PANTALLA.TUTORIAL, { volverA: sesion.pantalla })
  }

  function abrirMateriales() {
    if (sesion.pantalla === PANTALLA.MATERIALES) return
    ir(PANTALLA.MATERIALES, { volverA: sesion.pantalla })
  }

  /** Créditos desde el pie: se ven sin haber terminado el juego. El flag
   *  volverA distingue esta entrada de la del cierre y evita contar una
   *  partida completada que no ocurrió (FG: contador). */
  function abrirCreditos() {
    if (sesion.pantalla === PANTALLA.CREDITOS) return
    ir(PANTALLA.CREDITOS, { volverA: sesion.pantalla })
  }

  /** Vuelve de una pantalla lateral (memorial, materiales) a donde estabas. */
  function volverDeLateral() {
    const destino = sesion.volverA || PANTALLA.INICIO
    ir(destino, { volverA: null })
  }

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  function pantallaDeSesion() {
    // Un guardado que apunta a una escena que ya no existe (contenido cambiado)
    // o a una partida sin estado vuelve al inicio en vez de romperse.
    const p = sesion.pantalla
    if ((p === PANTALLA.ESCENA || p === PANTALLA.FINAL) && !sesion.estado) return PANTALLA.INICIO
    if (p === PANTALLA.ESCENA && !escenaActual()) return PANTALLA.INICIO
    if (p === PANTALLA.ROL && !sesion.acto) return PANTALLA.INICIO
    return p
  }

  function construir(p) {
    switch (p) {
      case PANTALLA.ROL:
        return pantallas.renderRoles({
          acto: sesion.acto,
          roles: rolesData.roles || [],
          onElegir: elegirRol,
        })

      case PANTALLA.ESCENA: {
        const escena = escenaActual()
        const idx = proximoGrupo(escena, sesion.estado, sesion.grupoIdx)
        const cerrada = idx < 0
        // La transición de modo anuncia la escena que viene; si no hay
        // siguiente escena (cierre de acto) no hay nada que anunciar y el
        // separador "— ZINE —" queda como ruido roto justo antes del final.
        const esUltima = !siguienteEscena(sesion.acto, sesion.escenaId)
        return pantallas.renderEscena(escena, {
          estado: sesion.estado,
          jugados: sesion.jugados,
          grupoActual: cerrada ? null : escena.grupos[idx].id,
          deltas: ultimosDeltas,
          deltasInventario: ultimosDeltasInventario,
          revelados: sesion.revelados,
          consecuencias: sesion.consecuencias,
          onSeguir: seguirRelato,
          onElegir: elegir,
          cerrada,
          esUltima,
          onContinuar: avanzarEscena,
        })
      }

      case PANTALLA.FINAL:
        return pantallas.renderFinalActo({
          acto: sesion.acto,
          final: resolveFinal(sesion.acto, sesion.estado),
          estado: sesion.estado,
          hayMasActos: siguienteActo(sesion.acto) !== null,
          onContinuar: avanzarActo,
        })

      case PANTALLA.PULSO:
        return pantallas.renderPulso({
          finales: sesion.finales,
          onContinuar: () => avanzarCierre(PANTALLA.PULSO),
          onSaltar: saltoSiCorresponde(),
        })

      case PANTALLA.DESGASTE:
        return pantallas.renderDesgaste({
          cifras: cifrasData,
          onContinuar: () => avanzarCierre(PANTALLA.DESGASTE),
          onSaltar: saltoSiCorresponde(),
        })

      case PANTALLA.VACIADO:
        return pantallas.renderVaciado({
          memorial: memorialData,
          onContinuar: () => avanzarCierre(PANTALLA.VACIADO),
          onSaltar: saltoSiCorresponde(),
        })

      case PANTALLA.PANFLETO:
        return pantallas.renderPanfleto({
          panfleto: panfletoData,
          onContinuar: () => avanzarCierre(PANTALLA.PANFLETO),
          onSaltar: saltoSiCorresponde(),
        })

      case PANTALLA.CIFRA:
        return pantallas.renderCifra({
          cifras: cifrasData,
          onContinuar: () => avanzarCierre(PANTALLA.CIFRA),
          onSaltar: saltoSiCorresponde(),
        })

      case PANTALLA.CREDITOS:
        return pantallas.renderCreditos({
          cifras: cifrasData,
          onReiniciar: reiniciar,
          onVolver: sesion.volverA ? volverDeLateral : null,
        })

      case PANTALLA.MEMORIAL:
        return pantallas.renderVaciado({
          memorial: memorialData,
          etiquetaAccion: pantallas.MENSAJES.volver,
          onContinuar: volverDeLateral,
        })

      case PANTALLA.TUTORIAL:
        return pantallas.renderTutorial({
          etiqueta: sesion.volverA === PANTALLA.INICIO ? 'Volver' : pantallas.MENSAJES.volver,
          onVolver: volverDeLateral,
        })

      case PANTALLA.MATERIALES:
        return pantallas.renderMateriales({
          catalogo: materialesData,
          desbloqueados: sesion.materiales,
          onVolver: volverDeLateral,
        })

      case PANTALLA.INICIO:
      default:
        return pantallas.renderInicio({
          hayGuardado: guardadoPrevio !== null,
          conteo: leerConteo(almacen),
          onContinuar: continuarPartida,
          onNueva: empezarPartida,
          onTutorial: abrirTutorial,
        })
    }
  }

  function continuarPartida() {
    if (!guardadoPrevio) return empezarPartida()
    sesion = { ...sesionInicial(), ...guardadoPrevio }
    guardadoPrevio = null
    ultimosDeltas = null
    ultimosDeltasInventario = null
    contadaCompletada = false
    menuAbierto = false
    render()
  }

  function empezarPartida() {
    borrar(almacen)
    sesion = sesionInicial()
    guardadoPrevio = null
    ultimosDeltas = null
    ultimosDeltasInventario = null
    contadaCompletada = false
    contarPartidaIniciada(almacen)
    const primero = actosJugables()[0]
    if (!primero) return ir(PANTALLA.PULSO)
    empezarActo(primero)
  }

  function render() {
    const p = pantallaDeSesion()
    if (p !== PANTALLA.ESCENA) soltarSenal()
    // Los créditos tienen dos entradas: el cierre (partida completada) y el
    // pie (solo lectura). Solo la del cierre marca el final como visto y suma
    // la partida al contador; distinguirlas es el flag volverA que deja el pie.
    const creditosDelCierre = p === PANTALLA.CREDITOS && !sesion.volverA
    // Llegar a los créditos es lo que habilita saltar el cierre la próxima vez.
    if (creditosDelCierre && !puedeSaltarCierre) {
      puedeSaltarCierre = true
      marcarCierreVisto(almacen)
    }
    // Y completa una partida: se cuenta una vez por visita a los créditos.
    if (creditosDelCierre && !contadaCompletada) {
      contadaCompletada = true
      contarPartidaCompletada(almacen)
    }

    clear(zona)
    if (menuAbierto) {
      zona.append(
        pantallas.renderMenu({
          sonido: sesion.sonido,
          onMemorial: abrirMemorial,
          onTutorial: abrirTutorial,
          onMateriales: abrirMateriales,
          materiales: sesion.materiales.length,
          onSonido: alternarSonido,
          onReiniciar: reiniciar,
          onCerrar: alternarMenu,
        }),
      )
    }

    const vista = construir(p)
    zona.append(vista)

    // En escena el marco de página se aparta: la escena ocupa la pantalla.
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('en-escena', p === PANTALLA.ESCENA)
    }
    if (botonMenu) {
      botonMenu.hidden = false
      botonMenu.setAttribute('aria-expanded', menuAbierto ? 'true' : 'false')
    }
    if (pie) {
      pie.textContent = ''
      pie.append(pantallas.textoPie({ acto: sesion.acto, enActo: PANTALLAS_DE_ACTO.includes(p) }))
      // El acceso directo a los créditos vive en el pie, junto a la ubicación
      // (no en el menú, que ya está lleno). Solo fuera del juego y del cierre:
      // en las secuencias del cierre el camino a los créditos ya está marcado.
      const enCierre = SECUENCIA_CIERRE.includes(p)
      if (!PANTALLAS_DE_ACTO.includes(p) && !enCierre) {
        pie.append(' · ', pantallas.enlacePieCreditos(abrirCreditos))
      }
    }

    if (p === PANTALLA.ESCENA) {
      // Sin auto-scroll: la acción es sticky y lo último dicho queda justo
      // encima. Robarle el scroll al jugador era lo que mataba la jugabilidad.
      const panel = vista.querySelector('.escena-panel')
      if (panel) {
        panel.classList.toggle('escena-panel--decidiendo', Boolean(vista.querySelector('.decision-group')))
      }
      aplicarSenal(vista)
      if (desconectarParallax) desconectarParallax()
      desconectarParallax = conectarParallax(vista)
    }
    if (autoFoco && montado) {
      // En escena el foco va a la acción, que es lo único que hay que hacer.
      const objetivo = menuAbierto
        ? zona.firstChild
        : vista.querySelector('.escena-accion') || vista
      focusScene(objetivo)
    }
    montado = true
  }

  // ---------------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------------

  function montar() {
    conectarDesbloqueo()
    // El resume no salta directo a la partida: la portada ofrece continuar o
    // empezar de nuevo, y el guardado queda intacto hasta que el jugador decida.
    puedeSaltarCierre = cierreVisto(almacen)
    guardadoPrevio = cargar(almacen)
    if (guardadoPrevio) {
      sesion = { ...sesionInicial(), sonido: Boolean(guardadoPrevio.sonido) }
    }
    if (botonMenu) botonMenu.addEventListener('click', alternarMenu)
    document.addEventListener('keydown', alEscape)
    render()
    return api
  }

  const api = {
    montar,
    render,
    ir,
    reiniciar,
    alternarMenu,
    get sesion() {
      return sesion
    },
    get menuAbierto() {
      return menuAbierto
    },
    zona,
  }
  return api
}
