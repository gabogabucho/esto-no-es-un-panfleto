// tests/metadata.test.js — Valida la forma de los metadatos M1b
// (roles, finales, actos, panfleto) y que pasen validate-content.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import roles from '../src/content/roles.json'
import finales from '../src/content/finales.json'
import actos from '../src/content/actos.json'
import panfleto from '../src/content/panfleto.json'
import { EJES } from '../src/state/stats.js'

describe('roles.json', () => {
  it('tiene los 5 roles con stats completos y únicos', () => {
    const ids = roles.roles.map((r) => r.id)
    expect(ids).toEqual(['vocero', 'brigadista-salud', 'derecho', 'comunicador-redes', 'artista-muralista'])
    expect(new Set(ids).size).toBe(5)
    for (const r of roles.roles) {
      expect(typeof r.nombre).toBe('string')
      expect(typeof r.descripcion).toBe('string')
      for (const eje of EJES) {
        expect(typeof r.statsIniciales[eje]).toBe('number')
      }
    }
  })
})

describe('finales.json', () => {
  it('tiene un orden de 6 finales y config por acto (objeto por id)', () => {
    expect(finales.orden).toEqual([
      'detencion-exilio',
      'voz-internacional',
      'organizacion-perdura',
      'repliegue-silencioso',
      'emigracion',
      'memoria-activa',
    ])
    for (const acto of ['1', '2', '3']) {
      const cfg = finales.actos[acto]
      expect(Object.keys(cfg)).toEqual(finales.orden)
    }
  })

  it('memoria-activa es el comodín en los tres actos', () => {
    for (const acto of ['1', '2', '3']) {
      const ultimo = finales.actos[acto]['memoria-activa']
      expect(ultimo.nombre).toBe('Memoria activa')
      expect(typeof ultimo.descripcion).toBe('string')
      expect(typeof ultimo.umbrales.min).toBe('number')
    }
  })
})

describe('actos.json', () => {
  it('define los 3 actos con inventario inicial', () => {
    expect(actos.actos).toHaveLength(3)
    expect(actos.actos.map((a) => a.id)).toEqual([1, 2, 3])
    for (const a of actos.actos) {
      expect(typeof a.nombre).toBe('string')
      expect(typeof a.ciudad).toBe('string')
      expect(typeof a.inventarioInicial.mascaras).toBe('number')
      expect(typeof a.inventarioInicial.agua).toBe('number')
      expect(typeof a.inventarioInicial.gasa).toBe('number')
      expect(typeof a.inventarioInicial.contactos).toBe('number')
    }
  })
})

describe('panfleto.json', () => {
  it('es el poema completo de Gabriel Urrutia, literal y atribuido', () => {
    expect(panfleto.titulo).toBe('Panfleto')
    expect(panfleto.literal).toBe(true)
    expect(panfleto.atribucion).toBe('Gabriel Urrutia, Esto no es un panfleto')
    expect(panfleto.versos).toHaveLength(14)
    // Primer y último verso, y la tesis del proyecto (§4 del entregable H).
    expect(panfleto.versos[0]).toBe('Esto podría ser un panfleto')
    expect(panfleto.versos[13]).toBe('Y les retumba la horrible idea del final.')
    expect(panfleto.versos.join('\n')).toContain('Porque ya tienes suficiente espalda sobre los muertos')
  })
})

describe('validate-content.mjs acepta los metadatos (no son escenas)', () => {
  it('los metadatos no tienen el campo bloques', () => {
    for (const doc of [roles, finales, actos, panfleto]) {
      expect(doc.bloques).toBeUndefined()
    }
  })
})

describe('tarjeta de compartir y descargas (index.html + public/)', () => {
  // vitest corre con el cwd en la raíz del repo.
  const raiz = process.cwd()
  const leer = (rel) => readFileSync(join(raiz, rel), 'utf8')

  it('index.html declara Open Graph con imagen y descripción', () => {
    const html = leer('index.html')
    for (const prop of ['og:title', 'og:description', 'og:image', 'og:image:alt', 'og:type']) {
      expect(html, prop).toContain(`property="${prop}"`)
    }
    expect(html).toContain('name="twitter:card"')
    expect(html).toContain('content="summary_large_image"')
  })

  it('la imagen de compartir y el poemario existen en public/', () => {
    expect(existsSync(join(raiz, 'public/og.jpg'))).toBe(true)
    expect(existsSync(join(raiz, 'public/esto-no-es-un-panfleto.pdf'))).toBe(true)
  })

  it('el PDF no entra en el precache del service worker', () => {
    // El juego funciona sin conexión, pero un libro no tiene por qué viajar en
    // la instalación de todo el mundo: se descarga cuando alguien lo pide.
    const vite = leer('vite.config.js')
    const patrones = vite.match(/globPatterns:\s*\[([^\]]*)\]/)
    expect(patrones).toBeTruthy()
    expect(patrones[1]).not.toContain('pdf')
  })
})
