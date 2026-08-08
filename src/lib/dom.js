// src/lib/dom.js — helpers DOM mínimos para los renderers (M2).
// Sin framework ni dependencias. Base de la dirección de dependencias:
// nada de state importa desde lib (design §3).
//
// API M1b: el(tag, props, children), clear(node), qsa(sel, root).

// Claves peligrosas que el() SIEMPRE ignora (seguridad: sin XSS por props).
const DENY_PROPS = new Set([
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
  'textContent',
  'style',
])

/**
 * Crea un elemento con props (atributos o propiedades) y children
 * (string | Node | array). Props con valor null/undefined/false se omiten,
 * y las claves peligrosas (innerHTML/textContent/style/…) SIEMPRE se ignoran.
 * - `class` setea className.
 * - `dataset` copia al dataset.
 * - `on*` (función) registra addEventListener.
 * - `aria-*` se setea como atributo.
 * - cualquier clave existente en el nodo se asigna como propiedad; el resto
 *   cae como atributo HTML.
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false || DENY_PROPS.has(k)) continue
    if (k === 'class') node.className = v
    else if (k === 'dataset') Object.assign(node.dataset, v)
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v)
    } else if (k.startsWith('aria-')) {
      node.setAttribute(k, String(v))
    } else if (k in node) {
      node[k] = v
    } else {
      node.setAttribute(k, String(v))
    }
  }
  const lista = Array.isArray(children) ? children : [children]
  for (const child of lista) {
    if (child == null || child === false) continue
    node.append(child instanceof Node ? child : document.createTextNode(String(child)))
  }
  return node
}

/** Vacía un nodo y lo devuelve (para re-render limpio). */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild)
  return node
}

/** querySelectorAll con resultado como array. */
export function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel))
}
