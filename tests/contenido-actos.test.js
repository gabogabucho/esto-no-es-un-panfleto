// tests/contenido-actos.test.js — El banco de escenas del entregable C.
//
// validate-content ya cubre el schema y check-locale el registro. Aquí van las
// invariantes que ninguno de los dos puede ver y que rompen el juego en
// silencio: bloques que el renderer del modo descarta sin avisar, flags
// referenciados que nadie setea, materiales sin ficha y actos incompletos.

import { describe, it, expect } from 'vitest'
import { ESCENAS, escenasDeActo, escenaPorId, siguienteEscena } from '../src/content/escenas.js'
import materialesData from '../src/content/materiales.json'
import { EJES } from '../src/state/stats.js'
import { urlDeIlustracion } from '../src/lib/archivo.js'

// Qué bloques pinta cada renderer (src/modes/*.js). Un bloque fuera de esta
// lista se omite sin error: el texto existe en el JSON y no llega a la pantalla.
const BLOQUES_POR_MODO = {
  FEED: ['narracion', 'tweet', 'cita'],
  ZINE: ['zineTitulo', 'narracion', 'dialogo', 'cita'],
  RADIO: ['narracion', 'radio', 'dialogo'],
}

const PREFIJO_POR_ACTO = { 1: 'T', 2: 'C', 3: 'Z' }
const CERTEZAS = ['confirmado', 'fuente-unica', 'testimonio-no-verificado']

/** Todos los flags que alguna opción del acto llega a setear. */
function flagsDelActo(acto) {
  const flags = new Set()
  for (const escena of escenasDeActo(acto)) {
    for (const grupo of escena.grupos) {
      for (const opcion of grupo.opciones) {
        for (const flag of Object.keys(opcion.flags || {})) flags.add(flag)
      }
    }
  }
  return flags
}

/** Nombres de flag que aparecen dentro de una condición o un requiere. */
function flagsReferenciados(expresion) {
  if (typeof expresion !== 'string' || expresion.trim() === '') return []
  const entreCorchetes = [...expresion.matchAll(/flags\[['"]([^'"]+)['"]\]/g)].map((m) => m[1])
  const conPunto = [...expresion.matchAll(/flags\.([A-Za-z0-9_-]+)/g)].map((m) => m[1])
  // Un `requiere` puede ser la referencia pelada a un flag (GS-012).
  const pelado = /^[a-zA-Z0-9_-]+$/.test(expresion.trim()) ? [expresion.trim()] : []
  return [...entreCorchetes, ...conPunto, ...pelado]
}

describe('cobertura del banco (entregable C)', () => {
  it('son 29 escenas: 9 en Táchira, 11 en Caracas y 9 en Zulia', () => {
    expect(ESCENAS).toHaveLength(29)
    expect(escenasDeActo(1)).toHaveLength(9)
    expect(escenasDeActo(2)).toHaveLength(11)
    expect(escenasDeActo(3)).toHaveLength(9)
  })

  it('cada acto usa el prefijo de su ciudad y numera sin huecos', () => {
    for (const [acto, prefijo] of Object.entries(PREFIJO_POR_ACTO)) {
      const ids = escenasDeActo(Number(acto)).map((e) => e.id)
      const esperados = ids.map((_, i) => `${prefijo}-${String(i + 1).padStart(2, '0')}`)
      expect(new Set(ids).size).toBe(ids.length)
      expect([...ids].sort()).toEqual(esperados)
    }
  })

  it('las escenas de cada acto van en orden cronológico', () => {
    for (const acto of [1, 2, 3]) {
      const fechas = escenasDeActo(acto).map((e) => e.fechaIso)
      expect(fechas).toEqual([...fechas].sort())
    }
  })

  it('la cadena de siguienteEscena recorre el acto entero y termina en null', () => {
    for (const acto of [1, 2, 3]) {
      const lista = escenasDeActo(acto)
      let actual = lista[0]
      let recorridas = 1
      while (siguienteEscena(acto, actual.id)) {
        actual = siguienteEscena(acto, actual.id)
        recorridas += 1
      }
      expect(recorridas).toBe(lista.length)
      expect(actual.id).toBe(lista.at(-1).id)
    }
  })
})

describe('todo el texto de una escena llega a la pantalla', () => {
  it.each(ESCENAS.map((e) => [e.id, e]))(
    '%s no trae bloques que su modo descarte',
    (_id, escena) => {
      const permitidos = BLOQUES_POR_MODO[escena.modo]
      const descartados = escena.bloques
        .map((b) => b.tipo)
        .filter((tipo) => !permitidos.includes(tipo))
      expect(descartados).toEqual([])
    },
  )

  it('cada escena abre con algo que su renderer sabe pintar', () => {
    for (const escena of ESCENAS) {
      expect(escena.bloques.length).toBeGreaterThan(0)
    }
  })
})

describe('condiciones y requisitos apuntan a flags que existen', () => {
  it('ninguna condición de grupo referencia un flag que nadie setea', () => {
    for (const acto of [1, 2, 3]) {
      const disponibles = flagsDelActo(acto)
      for (const escena of escenasDeActo(acto)) {
        for (const grupo of escena.grupos) {
          for (const flag of flagsReferenciados(grupo.condicion)) {
            expect(disponibles.has(flag), `${escena.id}/${grupo.id} → ${flag}`).toBe(true)
          }
        }
      }
    }
  })

  it('ningún requiere de opción referencia un flag que nadie setea', () => {
    for (const acto of [1, 2, 3]) {
      const disponibles = flagsDelActo(acto)
      for (const escena of escenasDeActo(acto)) {
        for (const grupo of escena.grupos) {
          for (const opcion of grupo.opciones) {
            for (const flag of flagsReferenciados(opcion.requiere)) {
              expect(disponibles.has(flag), `${escena.id}/${opcion.label} → ${flag}`).toBe(true)
            }
          }
        }
      }
    }
  })

  // El final de emigración tiene dos entradas (GS-014/GS-015): el flag
  // `pasaporte` que setea una opción, y el latch automático por PP baja
  // sostenida, que existe en el motor y vale para los tres actos.
  //
  // Táchira y Zulia cierran con la opción explícita porque el entregable C la
  // pide ("Averiguas qué se necesita para irte"). Caracas no la tiene: C-11 es
  // el madrugonazo, cuatro decisiones en segundos, y meter ahí un trámite de
  // pasaporte rompería la escena. En el acto 2 la emigración llega solo por PP
  // baja sostenida, que es la condición que el propio entregable describe.
  it('Táchira y Zulia ofrecen la salida explícita hacia el final de emigración', () => {
    for (const acto of [1, 3]) {
      const ultima = escenasDeActo(acto).at(-1)
      const flags = ultima.grupos.flatMap((g) => g.opciones.flatMap((o) => Object.keys(o.flags || {})))
      expect(flags, `acto ${acto}`).toContain('pasaporte')
    }
  })

  it('Caracas cierra sin opción de pasaporte: allí la emigración es solo por PP baja', () => {
    const flags = escenasDeActo(2)
      .at(-1)
      .grupos.flatMap((g) => g.opciones.flatMap((o) => Object.keys(o.flags || {})))
    expect(flags).not.toContain('pasaporte')
  })
})

describe('trazabilidad y materiales', () => {
  it('cada escena declara fuentes con un nivel de certeza válido (GS-093)', () => {
    for (const escena of ESCENAS) {
      expect(escena.fuentes?.length, escena.id).toBeGreaterThan(0)
      for (const f of escena.fuentes) {
        expect(CERTEZAS, `${escena.id}: ${f.certeza}`).toContain(f.certeza)
      }
    }
  })

  it('cada escena deja una nota de diseño que la ata a su ficha del entregable', () => {
    for (const escena of ESCENAS) {
      expect(typeof escena.notaDiseno, escena.id).toBe('string')
      expect(escena.notaDiseno.length, escena.id).toBeGreaterThan(40)
    }
  })

  it('todo material que el contenido desbloquea tiene ficha en el catálogo', () => {
    const conFicha = new Set(materialesData.materiales.map((m) => m.id))
    for (const escena of ESCENAS) {
      const ids = [
        escena.desbloquea,
        ...escena.grupos.flatMap((g) => g.opciones.map((o) => o.desbloquea)),
      ].filter(Boolean)
      for (const id of ids) {
        expect(conFicha.has(id), `${escena.id} → ${id}`).toBe(true)
      }
    }
  })

  it('cada ficha del catálogo apunta a una escena real del acto que dice', () => {
    for (const m of materialesData.materiales) {
      const escena = escenaPorId(m.escena)
      expect(escena, m.id).toBeTruthy()
      expect(escena.acto, m.id).toBe(m.acto)
    }
  })
})

describe('deltas y decisiones', () => {
  it('los deltas solo tocan los cinco ejes y son números', () => {
    for (const escena of ESCENAS) {
      const conjuntos = [escena.autoDeltas, ...escena.grupos.flatMap((g) => g.opciones.map((o) => o.deltas))]
      for (const deltas of conjuntos.filter(Boolean)) {
        for (const [eje, valor] of Object.entries(deltas)) {
          expect(EJES).toContain(eje)
          expect(Number.isFinite(valor)).toBe(true)
        }
      }
    }
  })

  it('cada opción explica su consecuencia salvo que sea deliberadamente muda', () => {
    const sinConsecuencia = []
    for (const escena of ESCENAS) {
      for (const grupo of escena.grupos) {
        for (const opcion of grupo.opciones) {
          if (!opcion.consecuencia) sinConsecuencia.push(`${escena.id}/${opcion.label}`)
        }
      }
    }
    expect(sinConsecuencia).toEqual([])
  })

  it('cada escena cierra con una consecuencia común (GS-002)', () => {
    for (const escena of ESCENAS) {
      expect(typeof escena.consecuenciaComun, escena.id).toBe('string')
    }
  })
})

describe('ilustraciones de escena', () => {
  const conIlustracion = ESCENAS.filter((e) => e.ilustracion)

  it('las escenas que llevan imagen resuelven todas sus capas', () => {
    expect(conIlustracion.length).toBeGreaterThanOrEqual(23)
    for (const escena of conIlustracion) {
      for (const capa of escena.ilustracion.capas) {
        expect(urlDeIlustracion(capa), `${escena.id} → ${capa}`).toBeTruthy()
      }
    }
  })

  it('cada ilustración describe lo que se ve, sin empezar por «foto de»', () => {
    for (const escena of conIlustracion) {
      const alt = escena.ilustracion.alt
      expect(alt.length, escena.id).toBeGreaterThan(30)
      expect(/^(foto|imagen|ilustraci[óo]n) de/i.test(alt), escena.id).toBe(false)
    }
  })

  it('las escenas de las muertes solo pueden ilustrar la ausencia', () => {
    // Ninguna muerte ocurre en pantalla. Estas seis pueden llevar imagen, pero
    // solo del lugar vacío: nunca gente, nunca el hecho. El texto alternativo
    // es la prueba de que se respetó, y por eso se revisa aquí.
    const prohibido = /(sangre|cuerpo|herid|polic|ambulanc|golpe|dispar)/i
    for (const id of ['C-01', 'C-02', 'C-05', 'C-08', 'T-06', 'T-08']) {
      const ilu = escenaPorId(id).ilustracion
      if (!ilu) continue
      expect(prohibido.test(ilu.alt), `${id}: ${ilu.alt}`).toBe(false)
      expect(/vac[íi]|nadie|no hay|sin nadie/i.test(ilu.alt), id).toBe(true)
    }
  })
})

describe('ambiente sonoro por escena (GS-033)', () => {
  it('el ambiente declarado es uno de los del catálogo', () => {
    const validos = ['bullicio', 'aire', 'lluvia', 'cuarto', 'silencio']
    for (const escena of ESCENAS.filter((e) => e.ambiente)) {
      expect(validos, `${escena.id}: ${escena.ambiente}`).toContain(escena.ambiente)
    }
  })

  it('las escenas vacías no suenan a multitud', () => {
    // Una avenida despejada al amanecer o una sala oficial sin nadie no pueden
    // heredar el bullicio que trae su modo por defecto.
    for (const id of ['T-09', 'C-10', 'Z-09']) {
      expect(escenaPorId(id).ambiente, id).toBeTruthy()
      expect(escenaPorId(id).ambiente, id).not.toBe('bullicio')
    }
  })
})
