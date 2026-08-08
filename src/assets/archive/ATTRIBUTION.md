# Atribución de archivos — `src/assets/archive/`

Este directorio alberga las fotos de archivo del juego (cambio #2). **R3 (hard):**
todo archivo que viva aquí DEBE tener su ficha en la tabla de abajo, y toda
escena que referencie una `foto.src` debe apuntar a un archivo con ficha
completa (`scripts/check-attribution.mjs` lo verifica en CI, GS-050).

Nunca hotlink: las fotos se copian aquí, no se enlazan desde internet.

## Cómo se pinta una foto (M4)

El motor ya sabe mostrarlas. Para colgar una foto en una escena hacen falta
**tres cosas**, y si falta cualquiera la escena se pinta sin foto, con los
tokens visuales — que es la prioridad (c) de R3, no un error:

1. **El archivo** en este directorio. `src/lib/archivo.js` lo resuelve por
   nombre con `import.meta.glob`; nunca resuelve una URL remota.
2. **La ficha completa** en la tabla de abajo (medio, fecha, autor, licencia).
   `scripts/check-attribution.mjs` falla el build si falta.
3. **El bloque `foto`** en la escena: `{ "src", "opacidad", "alt" }`, con
   `opacidad ≤ 0.35`. El shell además la topea en 0.35 en tiempo de ejecución.

**La atribución visible viaja en `escena.fuentes`** (R3.2). No hay un campo
aparte para el crédito: la escena ya pinta su lista de fuentes en pantalla, y
ahí es donde va el medio y el autor de la foto. Una escena con foto y sin su
crédito en `fuentes` está incompleta aunque el gate pase.

## Cómo se consigue una foto

El procedimiento completo —descartes, semáforo de licencia, verificación de
procedencia, lista de encargo por escena y plantilla de pedido de permiso— está
en [`guia-fotos-archivo.md`](../../../guia-fotos-archivo.md), en la raíz del
repo. Está escrita para que la ejecute alguien con un explorador delante.

## Fichas

| Archivo | Medio | Fecha | Autor | Licencia | Estado |
|---|---|---|---|---|---|
<!-- Tabla vacía a propósito: ninguna foto de archivo tiene todavía procedencia
     y licencia verificadas. R3.3 es explícito — si no se puede verificar la
     fuente, NO se usa. La curaduría es del cliente; el motor ya la espera. -->

## Descartes

Una línea por candidata rechazada, con el motivo. Sirve para no volver a
buscarla. Formato: `escena | URL | motivo`.

<!-- vacío -->

## Candidatas de agencia

Fotos usables pero de pago (AP, Reuters, AFP, EFE, Getty). El agente no compra:
las deja anotadas para que el cliente decida. Formato:
`escena | agencia e ID | fecha | tipo de licencia y precio`.

<!-- vacío -->
