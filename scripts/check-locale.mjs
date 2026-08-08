#!/usr/bin/env node
// scripts/check-locale.mjs — Gate R1 (HARD): español venezolano, no rioplatense.
// Node >= 18, cero dependencias.
//
// Recorre por defecto:
//   - src/content/**/*.json   (escenas y datos; "acto" por escena)
//   - src/ui/**/*.js          (strings del shell; sin acto → reglas estrictas)
//   - src/**/*.md             (cualquier markdown con copy del juego)
//   (override con --paths=ruta1,ruta2 o --paths repetidos)
//
// Listas negras y reglas: ver spec GS-040/GS-041 y design §8. La lista negra
// es la ÚNICA fuente de R1 (design §11). Soporta:
//   --json                salida JSON para CI
//   --require-register    convierte en fail los warnings de registro por acto
//   --allowlist <ruta>    archivo extra de exenciones (además del default)
//   --paths a,b,c         override de directorios raíz a escanear
//   --self-test           ejecuta fixtures inline (mal/bien/literal/maracucho/
//                         falsos positivos) y verifica que se comportan como
//                         se espera. Exit 0 solo si TODAS las expectativas se
//                         cumplen; exit 1 si alguna falla.
//
// Exit 1 = violación o allowlist muerta; exit 0 = limpio.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative, dirname, extname, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const RAIZ = resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Listas negras — única fuente de R1 (design §11). Con y sin acento.
//
// NOTA: usamos límites Unicode ((?<![\p{L}\p{N}_]) / (?![...])) en vez de \b
// porque \b en JS es ASCII-only: \bmir[aá]\b NUNCA matchea "Mirá" (la "á" no
// es \w, así que no hay borde entre "á" y la coma siguiente).
// ---------------------------------------------------------------------------

const B = (re) => `(?<![\\p{L}\\p{N}_])${re}(?![\\p{L}\\p{N}_])`

// DOS FAMILIAS, y la diferencia importa (corregido en M4):
//
// (a) Verbos donde la forma venezolana se escribe DISTINTO (tenés/tienes,
//     podés/puedes, salís/sales…). Ahí se acepta el match con y sin tilde:
//     "tenes" no es palabra española, así que cazarla solo atrapa un
//     rioplatanismo mal acentuado.
//
// (b) Verbos donde la forma rioplatense y el tuteo venezolano se escriben
//     IGUAL salvo la tilde (hacés/haces, sabés/sabes, publicás/publicas,
//     pasás/pasas, señalás/señalas). Ahí la tilde es OBLIGATORIA en el patrón:
//     sin ella el gate prohibía "haces" y "sabes", que son justo las formas
//     que R1.1 exige. La versión sin tilde es correcta y queda permitida; un
//     rioplatanismo escrito sin tildes es indistinguible del tuteo correcto y
//     lo atrapa la revisión humana, no el script (R1: chequeo + revisión).
export const FORMAS_GLOBALES = [
  { regex: new RegExp(B('ten[eé]s'), 'iu'), forma: 'tenés' },
  { regex: new RegExp(B('sos'), 'iu'), forma: 'sos' },
  { regex: new RegExp(B('pod[eé]s'), 'iu'), forma: 'podés' },
  { regex: new RegExp(B('quer[eé]s'), 'iu'), forma: 'querés' },
  { regex: new RegExp(B('sabés'), 'iu'), forma: 'sabés' },
  { regex: new RegExp(B('hacés'), 'iu'), forma: 'hacés' },
  { regex: new RegExp(B('publicás'), 'iu'), forma: 'publicás' },
  { regex: new RegExp(B('sal[ií]s'), 'iu'), forma: 'salís' },
  { regex: new RegExp(B('eleg[ií]s'), 'iu'), forma: 'elegís' },
  { regex: new RegExp(B('pasás'), 'iu'), forma: 'pasás' },
  { regex: new RegExp(B('empez[aá]s'), 'iu'), forma: 'empezás' },
  { regex: new RegExp(B('encontr[aá]s'), 'iu'), forma: 'encontrás' },
  { regex: new RegExp(B('abr[ií]s'), 'iu'), forma: 'abrís' },
  { regex: new RegExp(B('br[ií]s'), 'iu'), forma: 'brís' },
  { regex: new RegExp(B('se[nñ]alás'), 'iu'), forma: 'señalás' },
  { regex: new RegExp(B('ac[aá]'), 'iu'), forma: 'acá (usar "aquí")' },
  { regex: new RegExp(B('b[aá]squet'), 'iu'), forma: 'básquet (usar "baloncesto")' },
]

// Imperativos rioplatenses (GS-040): ban en narración (todos los actos) y en
// diálogo de acto 1/2. PERMITIDOS solo en `dialogo` del acto 3 (voseo
// maracucho los comparte).
//
// Todos son familia (b): el imperativo venezolano de tú es "mira", "deja",
// "toma" — sin tilde — y además coinciden con la tercera persona ("él pone",
// "ella trae"). Solo la forma acentuada es rioplatense; "vení" y "decí" llevan
// las dos grafías porque "veni" y "deci" no son palabras.
export const IMPERATIVOS = [
  { regex: new RegExp(B('mirá'), 'iu'), forma: 'mirá' },
  { regex: new RegExp(B('ven[ií]'), 'iu'), forma: 'vení' },
  { regex: new RegExp(B('dejá'), 'iu'), forma: 'dejá' },
  { regex: new RegExp(B('traé'), 'iu'), forma: 'traé' },
  { regex: new RegExp(B('andá'), 'iu'), forma: 'andá' },
  { regex: new RegExp(B('poné'), 'iu'), forma: 'poné' },
  { regex: new RegExp(B('tomá'), 'iu'), forma: 'tomá' },
  { regex: new RegExp(B('buscá'), 'iu'), forma: 'buscá' },
  { regex: new RegExp(B('llamá'), 'iu'), forma: 'llamá' },
  { regex: new RegExp(B('esperá'), 'iu'), forma: 'esperá' },
  { regex: new RegExp(B('dec[ií]'), 'iu'), forma: 'decí' },
  { regex: new RegExp(B('contá'), 'iu'), forma: 'contá' },
]

// Voseo maracucho (acto 3): permitido en `dialogo`, PROHIBIDO en narración
// del acto 3. En acto 1/2, "vos" solo genera warning (revisión humana).
export const MARACUCHO = [
  new RegExp(B('vos'), 'iu'),
  new RegExp(B('ten[eé]is'), 'iu'),
  new RegExp(B('sois'), 'iu'),
  new RegExp(B('pod[eé]is'), 'iu'),
  new RegExp(B('sab[eé]is'), 'iu'),
  new RegExp(B('quer[eé]is'), 'iu'),
]

// Claves técnicas que NUNCA se chequean (GS-040). "hablante" es nombre propio
// (como autor/fuente): no es copy del juego.
const CLAVES_TECNICAS = new Set([
  'id', 'acto', 'modo', 'src', 'url', 'handle', 'hora', 'medio', 'certeza',
  'autor', 'fuente', 'hablante', 'fechaIso', 'deltas', 'opacidad', 'min', 'eje',
  'flag', 'flags', 'inventario', 'costo', 'ganancia', 'requiere', 'evento',
  'condicion', 'tipo', 'siCFBajo', 'rt', 'fav', 'replies', 'transicionEn',
  'modoFinal', 'ppBajaSostenida', 'historial', 'escenaIdx', 'gActual', 'stats',
])

// Campos de escena ya procesados específicamente (no re-arrastrar en lo genérico).
const CAMPOS_ESCENA = new Set([
  'epigrafe', 'lugar', 'fecha', 'consecuenciaComun', 'notaDiseno', 'bloques',
  'grupos',
])

// Falsos positivos verificados que NO deben matchear NUNCA (GS-040).
// El segundo bloque son formas venezolanas correctas que el patrón sin tilde
// prohibía por error: tuteo de R1.1 e imperativos de tú.
export const FALSOS_POSITIVOS = [
  'estás', 'después', 'además', 'demás', 'nomás', 'país', 'autobús',
  'haces', 'sabes', 'publicas', 'pasas', 'señalas',
  'mira', 'deja', 'toma', 'busca', 'llama', 'espera', 'trae', 'anda', 'pone', 'cuenta',
]

// ---------------------------------------------------------------------------
// Recorrido de archivos
// ---------------------------------------------------------------------------

// matchAll exige regex global; clonamos sin mutar las constantes.
function globalizar(r) {
  return r.global ? r : new RegExp(r.source, r.flags + 'g')
}

export function expandirRutas(raices) {
  const archivos = []
  const visitar = (dir) => {
    let entradas
    try {
      entradas = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entrada of entradas) {
      const ruta = join(dir, entrada.name)
      if (entrada.isDirectory()) {
        // src/assets no es contenido del juego (fonts/archive).
        if (/[\\/]src[\\/]assets[\\/]/.test(ruta + '\\')) continue
        if (entrada.name === 'node_modules') continue
        visitar(ruta)
      } else {
        archivos.push(ruta)
      }
    }
  }
  for (const raiz of raices) {
    const abs = resolve(RAIZ, raiz)
    if (!existsSync(abs) || !statSync(abs).isDirectory()) continue
    visitar(abs)
  }
  return archivos.sort()
}

export function filtrarPorExtension(archivos, exts) {
  return archivos.filter((a) => exts.includes(extname(a).toLowerCase()))
}

// ---------------------------------------------------------------------------
// Chequeo de texto
// ---------------------------------------------------------------------------

export function chequeaString(texto, ctx, registro, violaciones, warnings) {
  if (typeof texto !== 'string' || texto.trim() === '') return
  const base = { archivo: ctx.archivo, escena: ctx.escena, acto: ctx.acto, bloque: ctx.bloque, campo: ctx.campo }

  const permisivo = ctx.tipo === 'dialogo' && ctx.acto === 3

  for (const f of FORMAS_GLOBALES) {
    for (const m of texto.matchAll(globalizar(f.regex))) {
      violaciones.push({ ...base, forma: f.forma, match: m[0] })
    }
  }

  if (!permisivo) {
    for (const f of IMPERATIVOS) {
      for (const m of texto.matchAll(globalizar(f.regex))) {
        violaciones.push({ ...base, forma: f.forma + ' (imperativo rioplatense)' })
      }
    }
  }

  // Maracucho fuera de diálogo en acto 3 → fail.
  if (ctx.acto === 3 && ctx.tipo !== 'dialogo') {
    for (const r of MARACUCHO) {
      for (const m of texto.matchAll(globalizar(r))) {
        violaciones.push({
          ...base,
          forma: `${m[0]} (voseo maracucho solo en diálogo del acto 3)`,
        })
      }
    }
  }

  // "vos" en acto 1/2 → warning semántico (¿rioplatense?).
  if ((ctx.acto === 1 || ctx.acto === 2) && /\bvos\b/i.test(texto)) {
    warnings.push({ ...base, forma: 'vos (¿rioplatense?) en acto ' + ctx.acto, match: 'vos' })
  }

  // Semántica que requiere revisión humana (warning, no fail).
  for (const m of texto.matchAll(/\bchic[oa]s?\b/gi)) {
    warnings.push({ ...base, forma: 'chico/chica (¿adjetivo pequeño?)', match: m[0] })
  }
  for (const m of texto.matchAll(/\bcolectivos?\b/gi)) {
    warnings.push({ ...base, forma: 'colectivo (¿vehículo o grupo armado?)', match: m[0] })
  }

  // Registro por acto (GS-041): reporte, no fail (salvo --require-register).
  if (ctx.tipo === 'dialogo') {
    registro.contar(ctx.acto, {
      dialogo: true,
      conUsted: /\busted(es)?\b/i.test(texto),
      conMaracucho: MARACUCHO.some((r) => r.test(texto)),
    })
  }
}

// ---------------------------------------------------------------------------
// Análisis por tipo de archivo
// ---------------------------------------------------------------------------

export function analizaJSON(texto, archivo, registro, violaciones, warnings) {
  let datos
  try {
    // Se tolera BOM (UTF-8) por robustez en Windows.
    datos = JSON.parse(texto.replace(/^\uFEFF/, ''))
  } catch (e) {
    violaciones.push({ archivo, escena: null, bloque: null, forma: `JSON inválido: ${e.message}` })
    return
  }
  const lista = Array.isArray(datos) ? datos : [datos]
  for (const item of lista) {
    if (!item || typeof item !== 'object') continue
    const ctx = {
      archivo,
      escena: typeof item.id === 'string' ? item.id : null,
      acto: typeof item.acto === 'number' ? item.acto : null,
    }
    const esEscena = Array.isArray(item.bloques)

    if (esEscena) {
      // Campos de texto de la escena (GS-001/GS-003).
      chequeaCampos(item, ctx, registro, violaciones, warnings)

      if (Array.isArray(item.bloques)) {
        item.bloques.forEach((bloque, i) => {
          if (!bloque || typeof bloque !== 'object') return
          if (bloque.literal === true) return // GS-003: literal exento de TODO
          const bctx = { ...ctx, bloque: `bloques[${i}] (${bloque.tipo || '?'})` }
          for (const [k, v] of Object.entries(bloque)) {
            if (k === '_notas' || k === 'literal') continue
            if (CLAVES_TECNICAS.has(k)) continue
            if (typeof v === 'string') chequeaString(v, { ...bctx, tipo: bloque.tipo, campo: k }, registro, violaciones, warnings)
            else if (Array.isArray(v)) v.forEach((s, j) => typeof s === 'string' && chequeaString(s, { ...bctx, tipo: bloque.tipo, campo: `${k}[${j}]` }, registro, violaciones, warnings))
          }
        })
      }

      if (Array.isArray(item.grupos)) {
        item.grupos.forEach((grupo, gi) => {
          if (!grupo || typeof grupo !== 'object') return
          const gctx = { ...ctx, bloque: `grupos[${gi}]` }
          if (typeof grupo.titulo === 'string' && grupo.titulo !== null) {
            chequeaString(grupo.titulo, { ...gctx, tipo: 'zineTitulo', campo: 'titulo' }, registro, violaciones, warnings)
          }
          if (Array.isArray(grupo.opciones)) {
            grupo.opciones.forEach((op, oi) => {
              if (!op || typeof op !== 'object') return
              const octx = { ...gctx, bloque: `grupos[${gi}].opciones[${oi}]` }
              chequeaString(op.label, { ...octx, tipo: 'opcion', campo: 'label' }, registro, violaciones, warnings)
              chequeaString(op.consecuencia, { ...octx, tipo: 'opcion', campo: 'consecuencia' }, registro, violaciones, warnings)
            })
          }
        })
      }
    }

    // Barrido genérico: alcanza actos.json, roles.json, finales.json,
    // memorial.json, panfleto.json, cifras.json (M1) y cualquier campo de la
    // escena que no se haya procesado específicamente.
    for (const [k, v] of Object.entries(item)) {
      if (CLAVES_TECNICAS.has(k) || CAMPOS_ESCENA.has(k) || k === '_notas') continue
      recorreGenerico(v, { ...ctx, tipo: 'narracion' }, registro, violaciones, warnings, k)
    }
  }
}

// Recorrido recursivo genérico: cada string hoja se chequea como narración.
function recorreGenerico(obj, ctx, registro, violaciones, warnings, prefijo) {
  if (obj === null || obj === undefined) return
  if (typeof obj === 'string') {
    chequeaString(obj, { ...ctx, campo: prefijo }, registro, violaciones, warnings)
    return
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => recorreGenerico(v, ctx, registro, violaciones, warnings, `${prefijo}[${i}]`))
    return
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (CLAVES_TECNICAS.has(k) || k === '_notas') continue
      recorreGenerico(v, ctx, registro, violaciones, warnings, `${prefijo}.${k}`)
    }
  }
}

function chequeaCampos(item, ctx, registro, violaciones, warnings) {
  const campos = ['epigrafe', 'lugar', 'fecha', 'consecuenciaComun', 'notaDiseno']
  for (const c of campos) {
    if (typeof item[c] === 'string') {
      chequeaString(item[c], { ...ctx, tipo: 'narracion', campo: c }, registro, violaciones, warnings)
    }
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

export function main(argv = process.argv.slice(2)) {
  const opciones = { json: false, requireRegister: false, selfTest: false, allowlist: [], paths: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--json') opciones.json = true
    else if (a === '--require-register') opciones.requireRegister = true
    else if (a === '--self-test') opciones.selfTest = true
    else if (a === '--allowlist') opciones.allowlist.push(argv[++i])
    else if (a === '--paths') opciones.paths = argv[++i]
    else if (a.startsWith('--paths=')) opciones.paths = a.slice(8)
    else if (a.startsWith('--allowlist=')) opciones.allowlist.push(a.slice(12))
  }

  if (opciones.selfTest) return ejecutarSelfTest(opciones)

  const raices = opciones.paths
    ? opciones.paths.split(',').filter(Boolean).map((p) => ({ dir: p, exts: ['.json', '.js', '.md'] }))
    : [
        { dir: 'src/content', exts: ['.json', '.md'] },
        { dir: 'src/ui', exts: ['.js'] },
        { dir: 'src', exts: ['.md'] },
      ]
  const archivos = []
  for (const r of raices) {
    archivos.push(...filtrarPorExtension(expandirRutas([r.dir]), r.exts))
  }
  archivos.sort()

  const registro = nuevoRegistro()
  const violaciones = []
  const warnings = []
  const allowlist = cargarAllowlist([join(__dirname, 'allowlist-locale.txt'), ...opciones.allowlist.map((p) => resolve(RAIZ, p))])
  const usados = new Set()

  for (const ruta of archivos) {
    const rel = relative(RAIZ, ruta).split('\\').join('/')
    const texto = readFileSync(ruta, 'utf8')
    const ext = extname(ruta).toLowerCase()
    const ctxBase = { archivo: rel }

    if (ext === '.json') {
      analizaJSON(texto, rel, registro, violaciones, warnings)
    } else if (ext === '.js') {
      // Strings del shell (src/ui): extracción simple de literales.
      const strings = extraerStrings(texto)
      strings.forEach((s, i) => {
        chequeaString(s.valor, { ...ctxBase, escena: null, bloque: `string[${i}]`, campo: 'string', tipo: 'string', acto: null, linea: s.linea }, registro, violaciones, warnings)
      })
    } else if (ext === '.md') {
      texto.split(/\r?\n/).forEach((linea, i) => {
        chequeaString(linea, { ...ctxBase, escena: null, bloque: `línea ${i + 1}`, campo: 'linea', tipo: 'linea', acto: null, linea: i + 1 }, registro, violaciones, warnings)
      })
    }
  }

  // Exención por allowlist (archivo:escena:forma o archivo:linea:forma).
  // El archivo puede darse con ruta completa o solo con el nombre base
  // (cómodo para árboles fuera del repo vía --paths).
  const violacionesFinales = []
  for (const v of violaciones) {
    const claveEscena = v.escena ? `${v.escena}:${v.forma}` : null
    const claveLinea = v.linea ? `${v.linea}:${v.forma}` : null
    const entradas = allowlist.filter(
      (e) =>
        (e.archivo === v.archivo || basename(e.archivo) === basename(v.archivo)) &&
        (e.clave === claveEscena || e.clave === claveLinea)
    )
    if (entradas.length > 0) {
      entradas.forEach((e) => usados.add(e.original))
    } else {
      violacionesFinales.push(v)
    }
  }

  const muertas = allowlist.filter((e) => !usados.has(e.original)).map((e) => e.original)
  const registroReporte = registro.informe()

  const failRegistro = opciones.requireRegister && registroReporte.some((r) => r.nivel === 'fail')
  const fail = violacionesFinales.length > 0 || muertas.length > 0 || failRegistro

  const resultado = {
    exit: fail ? 1 : 0,
    violaciones: violacionesFinales,
    warnings,
    allowlistMuerta: muertas,
    registro: registroReporte,
    requireRegister: opciones.requireRegister,
  }

  if (opciones.json) {
    console.log(JSON.stringify(resultado, null, 2))
  } else {
    for (const v of violacionesFinales) {
      console.error(`FALLO  ${v.archivo} > ${v.acto ? 'acto ' + v.acto : 'sin acto'}${v.escena ? ' > ' + v.escena : ''} > ${v.bloque} > ${v.campo} > ${v.forma}`)
    }
    for (const m of muertas) {
      console.error(`FALLO  entrada de allowlist sin uso: ${m}`)
    }
    for (const w of warnings) {
      console.warn(`AVISO  ${w.archivo} > ${w.escena || '?'} > ${w.bloque} > ${w.forma}`)
    }
    if (registroReporte.length) {
      console.warn('--- Registro lingüístico por acto (GS-041) ---')
      for (const r of registroReporte) {
        console.warn(`  ${r.mensaje}${opciones.requireRegister && r.nivel === 'fail' ? ' [REQUERIDO]' : ''}`)
      }
    }
    if (fail) {
      console.error(`check-locale: ${violacionesFinales.length} violación(es), ${muertas.length} entrada(s) muertas de allowlist${failRegistro ? ', registro no conforme' : ''}.`)
    } else {
      console.log(`check-locale OK: ${archivos.length} archivo(s) escaneado(s), ${violacionesFinales.length} violación(es), ${warnings.length} aviso(s).`)
    }
  }

  return resultado
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

export function extraerStrings(js) {
  const resultados = []
  // Comillas simples, dobles y template literales (sin anidar).
  const re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g
  let m
  while ((m = re.exec(js)) !== null) {
    const raw = m[1]
    const linea = js.slice(0, m.index).split(/\r?\n/).length
    const valor = raw
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\`/g, '`')
    if (valor.trim()) resultados.push({ valor, linea })
  }
  return resultados
}

export function nuevoRegistro() {
  const actos = {}
  const contar = (acto, datos) => {
    if (!acto) return
    const a = (actos[acto] ??= { dialogos: 0, conUsted: 0, conMaracucho: 0 })
    a.dialogos += 1
    if (datos.conUsted) a.conUsted += 1
    if (datos.conMaracucho) a.conMaracucho += 1
  }
  const informe = () => {
    const out = []
    if (actos[1]) {
      const n = actos[1]
      out.push({
        acto: 1,
        nivel: n.dialogos > 0 && n.conUsted === 0 ? 'fail' : 'ok',
        mensaje: `acto 1: ${n.dialogos} diálogo(s), ${n.conUsted} con "usted"${n.dialogos > 0 && n.conUsted === 0 ? ' — se espera "usted" en acto 1 (R1)' : ''}`,
      })
    }
    if (actos[3]) {
      const n = actos[3]
      out.push({
        acto: 3,
        nivel: n.dialogos > 0 && n.conMaracucho === 0 ? 'fail' : 'ok',
        mensaje: `acto 3: ${n.dialogos} diálogo(s), ${n.conMaracucho} con voseo maracucho${n.dialogos > 0 && n.conMaracucho === 0 ? ' — se espera "vos" + tenéis/sois/... en acto 3 (R1)' : ''}`,
      })
    }
    return out
  }
  return { contar, informe }
}

export function cargarAllowlist(rutas) {
  const entradas = []
  for (const ruta of rutas) {
    if (!existsSync(ruta)) continue
    const texto = readFileSync(ruta, 'utf8')
    texto.split(/\r?\n/).forEach((linea) => {
      const limpia = linea.trim()
      if (!limpia || limpia.startsWith('#')) return
      const [archivo, ...resto] = limpia.split(':')
      const clave = resto.join(':').trim()
      if (archivo && clave) entradas.push({ original: limpia, archivo, clave })
    })
  }
  return entradas
}

// ---------------------------------------------------------------------------
// Self-test (fixtures inline): verifica que el gate se comporta como debe.
// ---------------------------------------------------------------------------

const SELF_TEST = [
  {
    nombre: 'mal-tenés-narracion-acto1',
    esperado: 'fail',
    json: {
      id: 'A1-SELFTEST', acto: 1, modo: 'FEED', epigrafe: 'Prueba.',
      bloques: [{ tipo: 'narracion', texto: 'Tenés que entender lo que pasó.' }],
    },
  },
  {
    nombre: 'bien-falsos-positivos',
    esperado: 'pass',
    json: {
      id: 'A1-SELFTEST', acto: 1, modo: 'FEED', epigrafe: 'Prueba.',
      bloques: [{
        tipo: 'narracion',
        texto: 'Estás en la calle. Después de la protesta, además de todo, el país hierve. Y nomás queda seguir. El autobús pasa.',
      }],
    },
  },
  {
    // Tuteo venezolano de R1.1: estas formas DEBEN pasar. El patrón sin tilde
    // las prohibía y dejaba el gate en contra de su propia regla.
    nombre: 'bien-tuteo-venezolano',
    esperado: 'pass',
    json: {
      id: 'A1-SELFTEST', acto: 1, modo: 'FEED', epigrafe: 'Prueba.',
      bloques: [{
        tipo: 'narracion',
        texto: 'Haces lo que sabes. Publicas el hilo, pasas la lista en limpio y señalas la hora.',
      }],
    },
  },
  {
    nombre: 'mal-mismas-formas-con-tilde',
    esperado: 'fail',
    json: {
      id: 'A1-SELFTEST', acto: 1, modo: 'FEED', epigrafe: 'Prueba.',
      bloques: [{ tipo: 'narracion', texto: 'Hacés lo que sabés y publicás el hilo.' }],
    },
  },
  {
    nombre: 'bien-imperativo-venezolano',
    esperado: 'pass',
    json: {
      id: 'A1-SELFTEST', acto: 1, modo: 'ZINE', epigrafe: 'Prueba.',
      bloques: [{
        tipo: 'dialogo', hablante: 'Yajaira',
        texto: 'Usted mira la esquina, deja el morral aquí y toma agua antes de salir.',
      }],
    },
  },
  {
    nombre: 'mal-imperativo-rioplatense-narracion',
    esperado: 'fail',
    json: {
      id: 'A1-SELFTEST', acto: 1, modo: 'FEED', epigrafe: 'Prueba.',
      bloques: [{ tipo: 'narracion', texto: 'Mirá la esquina y dejá el morral.' }],
    },
  },
  {
    nombre: 'bien-usted-acto1',
    esperado: 'pass',
    json: {
      id: 'A1-SELFTEST', acto: 1, modo: 'FEED', epigrafe: 'Prueba.',
      bloques: [{ tipo: 'dialogo', hablante: 'Profe', texto: 'Usted no puede pasar por aquí.' }],
    },
  },
  {
    nombre: 'literal-exento',
    esperado: 'pass',
    json: {
      id: 'A1-SELFTEST', acto: 1, modo: 'FEED', epigrafe: 'Prueba.',
      bloques: [{
        tipo: 'cita', literal: true, autor: 'X', fuente: 'Y',
        texto: 'Tenés que venir, sos necesario.', // texto exacto del cliente
      }],
    },
  },
  {
    nombre: 'maracucho-dialogo-acto3',
    esperado: 'pass',
    json: {
      id: 'Z-SELFTEST', acto: 3, modo: 'RADIO', epigrafe: 'Prueba.',
      bloques: [{ tipo: 'dialogo', hablante: 'Primo', texto: 'Vos tenéis razón, queréis ir mañana por aquí.' }],
    },
  },
  {
    nombre: 'maracucho-narracion-acto3',
    esperado: 'fail',
    json: {
      id: 'Z-SELFTEST', acto: 3, modo: 'RADIO', epigrafe: 'Prueba.',
      bloques: [{ tipo: 'narracion', texto: 'Vos tenéis que ver lo que pasó.' }],
    },
  },
  {
    nombre: 'imperativo-narracion-acto1',
    esperado: 'fail',
    json: {
      id: 'A1-SELFTEST', acto: 1, modo: 'FEED', epigrafe: 'Prueba.',
      bloques: [{ tipo: 'narracion', texto: 'Mirá, la policía avanza.' }],
    },
  },
  {
    nombre: 'imperativo-rioplatense-dialogo-acto1',
    esperado: 'fail',
    json: {
      id: 'A1-SELFTEST', acto: 1, modo: 'FEED', epigrafe: 'Prueba.',
      bloques: [{ tipo: 'dialogo', hablante: 'Profe', texto: 'Vení acá y contá qué pasó.' }],
    },
  },
  {
    nombre: 'lexico-acá',
    esperado: 'fail',
    json: {
      id: 'A1-SELFTEST', acto: 1, modo: 'FEED', epigrafe: 'Prueba.',
      bloques: [{ tipo: 'narracion', texto: 'El grupo se junta acá a las seis.' }],
    },
  },
  {
    nombre: 'chico-warning',
    esperado: 'pass', // warning semántico, no fail
    json: {
      id: 'A1-SELFTEST', acto: 1, modo: 'FEED', epigrafe: 'Prueba.',
      bloques: [{ tipo: 'narracion', texto: 'Un colectivo pequeño pasa por la avenida.' }],
    },
  },
]

export function ejecutarSelfTest(opciones) {
  let fallos = 0
  for (const caso of SELF_TEST) {
    const violaciones = []
    const warnings = []
    const registro = nuevoRegistro()
    const ctx = { archivo: 'tests/fixtures-locale/selftest.json', escena: caso.json.id, acto: caso.json.acto }
    analizaJSON(JSON.stringify(caso.json), ctx.archivo, registro, violaciones, warnings)
    const esperado = caso.esperado === 'fail'
    const obtuvo = violaciones.length > 0
    const ok = esperado === obtuvo
    if (!ok) fallos++
    console.log(`${ok ? 'OK  ' : 'FALLO'} [${caso.nombre}] esperado=${caso.esperado} obtuvo=${obtuvo ? 'fail' : 'pass'}${violaciones.length ? ' → ' + violaciones[0].forma : ''}`)
  }
  // Falsos positivos explícitos: ninguno debe matchear ninguna lista, ni la
  // global ni la de imperativos (ahí viven "mira", "deja", "toma"…).
  for (const fp of FALSOS_POSITIVOS) {
    const global = FORMAS_GLOBALES.find((f) => f.regex.test(fp))
    const imperativo = IMPERATIVOS.find((f) => f.regex.test(fp))
    if (global || imperativo) {
      fallos++
      console.log(`FALLO falso positivo "${fp}" matcheó ${global ? 'la lista global' : 'los imperativos'}`)
    } else {
      console.log(`OK   falso positivo "${fp}" sin match`)
    }
  }
  console.log(`self-test: ${SELF_TEST.length} casos + ${FALSOS_POSITIVOS.length} falsos positivos, ${fallos} fallo(s).`)
  if (fallos > 0 && !opciones.json) console.error('check-locale --self-test: exit 1')
  return { exit: fallos > 0 ? 1 : 0, fallos }
}

// CLI
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const resultado = main()
  process.exit(resultado.exit)
}
