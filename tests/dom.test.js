// @vitest-environment jsdom
// tests/dom.test.js — GS-015: helpers DOM de src/lib/dom.js.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { el, clear, qsa } from '../src/lib/dom.js'

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('el', () => {
  it('crea un elemento con etiqueta y texto', () => {
    const n = el('p', { class: 'x' }, 'Hola')
    expect(n.tagName).toBe('P')
    expect(n.textContent).toBe('Hola')
    expect(n.className).toBe('x')
  })

  it('aplica className, dataset, aria y eventos (addEventListener)', () => {
    const fn = vi.fn()
    const n = el('button', {
      class: 'btn principal',
      dataset: { accion: 'avanzar' },
      'aria-label': 'Avanzar',
      onClick: fn,
    })
    expect(n.classList.contains('btn')).toBe(true)
    expect(n.classList.contains('principal')).toBe(true)
    expect(n.dataset.accion).toBe('avanzar')
    expect(n.getAttribute('aria-label')).toBe('Avanzar')
    n.dispatchEvent(new MouseEvent('click'))
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('ignora claves peligrosas (sin XSS por props)', () => {
    const n = el('div', { innerHTML: '<b>x</b>', textContent: 'y', style: 'color:red' })
    expect(n.innerHTML).toBe('')
    expect(n.textContent).toBe('')
    expect(n.getAttribute('style')).toBeNull()
  })

  it('acepta hijos como nodos o strings', () => {
    const span = el('span', null, 'A')
    const n = el('div', null, [span, 'B'])
    expect(n.children).toHaveLength(1)
    expect(n.childNodes).toHaveLength(2)
    expect(n.textContent).toBe('AB')
  })

  it('soporta propiedades booleanas y atributos regulares', () => {
    const n = el('input', { type: 'checkbox', checked: true })
    expect(n.type).toBe('checkbox')
    expect(n.checked).toBe(true)
    const m = el('div', { 'data-x': '1' })
    expect(m.getAttribute('data-x')).toBe('1')
  })
})

describe('clear', () => {
  it('vacía un nodo', () => {
    const n = el('ul', null, [el('li'), el('li')])
    clear(n)
    expect(n.childNodes).toHaveLength(0)
  })
})

describe('qsa', () => {
  it('busca dentro de un root', () => {
    const root = el('div', null, [el('p', { class: 'a' }), el('p', { class: 'a' }), el('span')])
    expect(qsa('.a', root)).toHaveLength(2)
    expect(qsa('p', root)).toHaveLength(2)
  })
})
