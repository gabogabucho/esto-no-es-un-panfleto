#!/usr/bin/env python3
"""Prepara las ilustraciones de escena para el juego.

    python scripts/preparar-ilustracion.py [nombre ...]

Toma los PNG que deja el generador en assets-wip/ y escribe los WebP que
consume el juego en src/assets/ilustracion/. Sin argumentos procesa todo lo que
haya en assets-wip/; con argumentos, solo esos nombres (con o sin extensión).

Qué hace y por qué:

1. **Pasa a escala de grises.** El color lo pone el CSS con los tokens del acto
   (mezcla `color` sobre el degradado). Así las escenas comparten paleta exacta
   aunque el generador haya devuelto cada una de un tono distinto, y cambiar la
   paleta del juego no obliga a regenerar una sola imagen.

2. **Levanta solo lo que no se lee.** La banda mide ~234 px de alto y una escena
   nocturna se apaga entera ahí dentro. Se sube con una curva de gamma —que abre
   los medios tonos sin aplastar los negros— y SOLO si la media queda por debajo
   del piso legible. Nunca oscurece nada: igualar el brillo de las 29 borraría la
   diferencia entre el mediodía de San Cristóbal y las cuatro de la mañana en
   Viento Norte, y esa diferencia es dramaturgia, no un defecto.

3. **Ajusta el peso.** El juego funciona sin conexión y precachea todo, en un
   proyecto que trata justamente sobre gente a la que le cortaron el internet.
   Presupuesto: ~100 KB por imagen.

Requiere Pillow. No es parte de CI: es una herramienta de autoría.
"""

import math
import os
import sys

try:
    from PIL import Image, ImageEnhance, ImageOps, ImageStat
except ImportError:
    sys.exit('Falta Pillow. Instalalo con: pip install Pillow')

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(RAIZ, 'assets-wip')
DESTINO = os.path.join(RAIZ, 'src', 'assets', 'ilustracion')

ANCHO = 1152          # ~2x del ancho de la banda en móvil; de sobra para retina
CALIDAD = 46
CONTRASTE = 1.08
PISO_LEGIBLE = 84     # media por debajo de la cual una escena no se lee en banda
AVISO_PESO_KB = 110


def legible(im):
    """Sube la noche lo justo para que se lea. Devuelve (imagen, gamma)."""
    media = ImageStat.Stat(im).mean[0]
    if media >= PISO_LEGIBLE or media <= 1:
        return im, 1.0
    gamma = max(0.62, min(1.0, math.log(PISO_LEGIBLE / 255) / math.log(media / 255)))
    tabla = [min(255, int(round(255 * (v / 255) ** gamma))) for v in range(256)]
    return im.point(tabla), gamma


def preparar(nombre):
    base = os.path.splitext(os.path.basename(nombre))[0]
    src = os.path.join(ORIGEN, base + '.png')
    if not os.path.exists(src):
        print(f'  FALTA  {base}.png')
        return 0

    im = Image.open(src).convert('L')
    im = ImageOps.autocontrast(im, cutoff=1)
    antes = ImageStat.Stat(im).mean[0]
    im, gamma = legible(im)
    im = ImageEnhance.Contrast(im).enhance(CONTRASTE)
    im = im.resize((ANCHO, round(im.height * ANCHO / im.width)), Image.LANCZOS)

    os.makedirs(DESTINO, exist_ok=True)
    out = os.path.join(DESTINO, base + '.webp')
    im.save(out, 'WEBP', quality=CALIDAD, method=6)

    kb = os.path.getsize(out) / 1024
    marca = '  <-- pesada' if kb > AVISO_PESO_KB else ''
    curva = f'gamma {gamma:.2f}' if gamma != 1.0 else 'sin levantar'
    print(f'  {base}.webp  {kb:5.0f} KB  media {antes:3.0f} -> '
          f'{ImageStat.Stat(im).mean[0]:3.0f}  ({curva}){marca}')
    return os.path.getsize(out)


def main(argv):
    nombres = argv or sorted(
        f for f in os.listdir(ORIGEN) if f.lower().endswith('.png')
    )
    if not nombres:
        sys.exit(f'No hay PNG en {ORIGEN}')

    print(f'Preparando {len(nombres)} ilustración(es):')
    total = sum(preparar(n) for n in nombres)
    if total:
        print(f'\nTotal {total / 1024 / 1024:.2f} MB en {len(nombres)} archivo(s) · '
              f'media {total / len(nombres) / 1024:.0f} KB')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
