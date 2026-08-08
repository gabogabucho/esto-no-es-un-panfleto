# Entregable H — Pantalla final
## Cierre del juego completo, después de los tres actos

Corresponde a la §7.5 del documento de mecánicas. Es lo último que ve el jugador.
**Duración total: menos de tres minutos.** Es la pieza más corta del proyecto y la que decide qué queda.

---

## 0. Qué es y qué no es

**No es un epílogo que explica qué pasó históricamente.** Quien jugó tres actos ya lo sabe. Cualquier cartel de "y así terminó el ciclo de protestas de 2014" desperdicia lo único que el juego se ganó: que el jugador entienda sin que se lo digan.

**No hay música triunfal ni fracaso explícito en el copy.** Regla ya establecida para los finales de acto y vale doble acá.

**Es una consecuencia, no un resumen.** Cinco secuencias encadenadas, sin interacción salvo una pausa al final de cada una:

1. **El pulso** — los tres actos a la vez
2. **El desgaste** — julio a diciembre en treinta segundos
3. **El vaciado** — el memorial que no da abasto
4. **Panfleto**
5. **La cifra** — créditos

---

## 1. El pulso

**Qué es.** Un mapa de Venezuela, mínimo, en `#12130f` sobre el que aparecen **tres puntos**: San Cristóbal, Caracas, Maracaibo. Nada más — sin fronteras de estado, sin nombres de ciudad, sin leyenda.

Cada punto se enciende con **el color del stat dominante** con el que terminó ese acto:

| Stat dominante | Color | Token |
|---|---|---|
| Coraje | ocre bandera | `#c9a227` |
| Riesgo | rojo ladrillo | `#8c2f1f` |
| Red | verde señal | `#5b7a63` |
| Confianza | verde-azul noche | `#2c4a52` |
| Percepción pública | papel viejo | `#e8ddc4` |

Y **late** —una pulsación lenta— con la intensidad del stat. Un acto terminado con todo bajo apenas se ve.

Debajo, una línea por acto. Solo el final personal, sin adjetivos:

```
SAN CRISTÓBAL      volvió a clase
CARACAS            detenido el 8 de mayo
MARACAIBO          se fue en octubre
```

**Y después, la única frase de la secuencia:**

> *No se conocieron.*

**Nota de diseño.** Es la carga entera de la estructura de antología. Tres personas, tres ciudades, el mismo semestre, ninguna supo de la existencia de las otras — y sin embargo el jugador las vive como una sola cosa, porque lo son. Si el juego dijera "juntos resistieron" mentiría. Diciendo que no se conocieron dice la verdad y produce el mismo efecto.

**Variante si el jugador jugó un solo acto:** los otros dos puntos aparecen apagados, sin línea de texto. El mapa queda casi negro. Eso también es información.

---

## 2. El desgaste

**Qué es.** Julio a diciembre de 2014 en **treinta segundos**. Modo FEED degradado — la última vez que se ve la interfaz.

Seis meses en seis tarjetas, con fecha, sin comentario, apareciendo cada cinco segundos:

```
7 de julio
Quince jóvenes levantan un ayuno de diecisiete días
en la iglesia La Chiquinquirá. Deshidratación severa.

16 de julio
Entregan un documento en doce embajadas.
Lo rechazan Brasil y Cuba.

22 al 28 de julio
Los padres de los detenidos duermen a la intemperie
frente al PNUD. Siete días. No les permiten poner un toldo.
Llueve.

21 de agosto
Gerardo Carrero inicia una huelga de hambre en el SEBIN.
Es torturado.
La denuncia se presenta el 26 de agosto
y se ratifica el 19 de noviembre.
La jueza no la notifica a la Defensoría del Pueblo.

20 de diciembre
Un grupo se encadena en la Plaza Francia de Altamira
hasta fin de año.
Hay más de cien presos políticos.

31 de diciembre
Gerardo Carrero sigue aislado en una celda
que sus custodios llaman "la tumba".
Manda un mensaje de fin de año.
```

**Y entonces la única cifra de la secuencia, sola en pantalla:**

```
En estos seis meses no murió ningún manifestante.
```

**Nota de diseño — esta es la secuencia que justifica todo el proyecto.**
Seis meses de país en treinta segundos, después de que tres actos cubrieran cinco meses. **Que ocupen menos que una sola noche de febrero es el argumento, no una limitación de presupuesto.** No pasa nada, y eso es lo que pasa.

La frase final tiene que caer sin énfasis. No dice "pero". No dice "sin embargo". Dice el hecho, y el jugador acaba de leer seis tarjetas que lo contradicen sin contradecirlo. **La libertad se siguió perdiendo con la tasa de mortalidad en cero.**

**Detalle de La Señal.** Durante esta secuencia la interfaz se degrada hasta que la última tarjeta aparece sin marco, sin barra de señal, sin nada. El FEED muere acá y no vuelve.

---

## 3. El vaciado

**Qué es.** El memorial, pero por capas — y cada capa tiene menos datos que la anterior.

Cuatro pantallas. El jugador baja con scroll o toca para avanzar.

**Capa 1 — los que tienen ficha**
```
43
nombre · edad · ciudad · fecha · causa · fuente
```
Se muestran los 43 nombres completos, en una lista que se puede recorrer. Es el memorial que ya está especificado en el entregable D.

**Capa 2 — los que tienen expediente**
```
más de 800 torturados
183 denuncias formales ante la fiscalía
```
Sin nombres. Solo las categorías documentadas por Foro Penal: descargas eléctricas, asfixia con bolsas plásticas, fracturas de cráneo, perdigones a quemarropa, corte de cabello como castigo. **Sin descripciones.** La lista de categorías, seca, y las cifras al lado.

**Capa 3 — los que tienen número**
```
miles de detenidos
```
Y debajo, la nota honesta:
> *El Ministerio Público publicó dos cifras que no coinciden: 1.854 y 3.306.*

Nada más. No hay nombres, no hay categorías, y ni siquiera hay acuerdo sobre cuántos fueron.

**Capa 4 — los que no tienen nada**
```
los que se fueron
```
La pantalla está vacía. No hay cifra. No hay lista. Solo esas cuatro palabras, y después de unos segundos, una línea abajo:

> *En 2014 había unos 800.000 venezolanos fuera del país.*
> *En 2018, 3,4 millones.*
> *Nadie contó cuántos de ellos habían estado en la calle.*

**Nota de diseño — por qué el memorial tiene que vaciarse.**
El cliente lo dijo así: *"el memorial no da abasto"*. La respuesta de diseño no es hacer un memorial más grande — es **hacer uno que muestre su propio límite**. Por cada muerto con ficha hay ~18 torturados y ~71 detenidos, y una cantidad indeterminada de gente que simplemente se fue. La pantalla se queda sin datos a medida que baja, y ese vaciado *es* el argumento.

Los muertos son la única parte de la pérdida que el Estado estuvo obligado a registrar. Hay forense, hay acta, hay cuerpo. Por eso hay lista. Todo lo demás no dejó ficha, y un juego sobre lo que no se documenta tiene que terminar mostrando exactamente dónde se acaba la documentación.

---

## 4. Panfleto

**Qué es.** El poema completo, de *Esto no es un panfleto*, **con atribución a Gabriel Urrutia**. Aparece verso por verso sobre negro, sin ilustración y sin sonido.

> Esto podría ser un panfleto
>
> Y podría distribuirse en las esquinas
>
> Lanzarse cada una de las letras de un piso quinto
>
> Y sin embargo
>
> No te encuentras entre líneas
>
> Porque esto podría ser un panfleto
>
> Si no fuera porque no hay celdas
>
> Porque ya están ocupadas
>
> Porque ya tienes suficiente espalda sobre los muertos
>
> Y se te cae la autoridad
>
> Son dinosaurios
>
> Están extintos
>
> Están golpeando su cabeza como bisonte en celos
>
> Y les retumba la horrible idea del final.

```
"Panfleto"
Gabriel Urrutia, Esto no es un panfleto
```

**Nota de diseño — por qué acá y no al principio.**
Ya estaba decidido en §7.5 de mecánicas y conviene dejar escrito el motivo: **el poema es la tesis del proyecto y el jugador tiene que ganársela.** De epígrafe sería una declaración de intenciones; de cierre es una conclusión.

Y hay una coincidencia que no es coincidencia: el verso *"si no fuera porque no hay celdas / porque ya están ocupadas"* llega **treinta segundos después** de que el jugador leyó que había más de cien presos políticos el 20 de diciembre y que Gerardo Carrero seguía en "la tumba" el 31. El poema deja de ser una imagen y pasa a ser una descripción.

⚠️ **Atribución obligatoria.** Es obra propia del cliente, no fuente externa, pero se cita con precisión y sin alterar el texto (brief §6.6).

---

## 5. La cifra

**Qué es.** Lo último. Una sola pantalla antes de los créditos.

```
Entre enero y diciembre de 2014
se registraron 9.286 protestas en Venezuela.
26 por día.

El gobierno sostuvo que todas eran violentas
y tenían un objetivo insurreccional.

El Observatorio Venezolano de Conflictividad Social
contó las violentas.

Fueron 510.
El ocho por ciento.
```

**Nota de diseño — por qué el juego termina con una estadística.**
Porque es la única respuesta que este proyecto necesita dar y no la da un personaje. Si alguien acusa al juego de romantizar guarimberos, **la respuesta no es un argumento: es que una ONG independiente contó protesta por protesta durante seis meses y encontró un 8%.**

Es también lo contrario de un panfleto: no pide que le creas, te da el número y la fuente y se calla.

---

## 6. Créditos

Después: fuentes completas, con enlaces, y la nota que el proyecto se debe a sí mismo.

```
Los personajes de este juego son ficticios.
Los hechos, las fechas, los lugares y las cifras no lo son.

Las personas que murieron no son personajes.
No tienen diálogo en este juego
porque nadie tiene derecho a ponerles palabras.

La trazabilidad completa de cada dato
está disponible en [enlace].
```

Y al final, sin comentario:

```
para los que no aparecen en ninguna lista
```

---

## 7. Notas de implementación

- **Sin interacción**, salvo avanzar. El jugador ya decidió todo lo que tenía que decidir.
- **Se puede saltar**, pero solo después de la primera vez. Nunca bloquear a alguien en una pantalla de muertos.
- **`prefers-reduced-motion`:** el latido del mapa (§1) pasa a intensidad estática por opacidad; el degradado de La Señal (§2), a diferencia de textura sin movimiento.
- **El memorial (§3) debe ser accesible también desde el menú principal**, en cualquier momento, sin haber terminado el juego. La versión del cierre es la misma pantalla.
- **Contraste AA** verificado en las cuatro capas del vaciado, incluida la capa 4 sobre negro.

---

## 8. Pendientes

1. **Confirmar con el cliente el uso del poema completo** y la forma exacta de la atribución (brief §6.6, pregunta abierta).
2. **Verificar la fecha del encadenamiento en Plaza Altamira** (20 de diciembre) contra una segunda fuente; hoy solo está el blog de Jóvenes Venezolanos.
3. **Decidir si la capa 3 del vaciado muestra la discrepancia de cifras oficiales.** Yo la dejaría: que el Estado publique dos cifras distintas de sus propios detenidos dice más que cualquiera de las dos.
4. **Faltan las 17 entradas del blog** de agosto, octubre y noviembre, que podrían aportar una o dos tarjetas más al desgaste (§2).

---

## Fuentes

- [Blog Jóvenes Venezolanos / CalleSinRetorno — archivo 2014](https://callesinretorno.blogspot.com/2014/) *(fuente primaria de las seis tarjetas del desgaste)*
- [Gerardo Carrero envía mensaje a todos los venezolanos, 31 dic 2014](https://callesinretorno.blogspot.com/2014/12/gerardo-carrero-envia-mensaje-todos-los.html)
- [Encadenados por la libertad en Plaza Altamira, 20 dic 2014](https://callesinretorno.blogspot.com/2014/12/ultima-hora-encadenados-por-la-libertad.html)
- [Heridas que no se borran — Foro Penal](https://foropenal.com/articulo/heridas-que-no-se-borran)
- [Conflictividad en Venezuela 2014 — OVCS](https://www.observatoriodeconflictos.org.ve/oc/wp-content/uploads/2015/01/Conflictividad-en-Venezuela-2014.pdf) *(las cifras de §5)*
- [Jóvenes y electores ausentes: el impacto demográfico del éxodo venezolano — The Conversation](https://theconversation.com/jovenes-y-electores-ausentes-el-impacto-demografico-del-exodo-masivo-venezolano-234984)
- *Esto no es un panfleto*, Gabriel Urrutia — poema "Panfleto"
- Entregables A, D, G de este proyecto.
