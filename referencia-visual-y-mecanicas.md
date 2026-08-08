# Referencia visual y mecánicas
## Juego de decisiones — Resistencia estudiantil venezolana, 2013–2014

Documento complementario al *Brief de investigación y guion*. Este es para quien construya el juego (dev/diseño), no para el agente de investigación histórica.

---

## 1. Los tres modos

El juego no tiene una sola interfaz — cambia de modo según el tipo de escena, porque la resistencia real se vivió en registros distintos: la calle, la asamblea, la pantalla.

### FEED — modo principal
Timeline oscuro, monoespaciado, decisiones como respuestas a notificaciones. Acá vive la mayoría del juego: convocatoria, viralización, comunicación, y también el ataque — desinformación, cuentas falsas, censura.

```
┌─────────────────────────────┐
│ ● señal: ▂▃▅ (regular)       │
├─────────────────────────────┤
│ @vientonorte_mcbo · ahora     │
│ nos vemos en la redoma a      │
│ las 4. traigan lo que puedan  │
│ #12F #Zulia                   │
│                                │
│ ↻ 340   ♥ 812   💬 47         │
├─────────────────────────────┤
│ > ¿qué haces?                 │
│ [ retuiteas y confirmas ]     │
│ [ respondes pidiendo cautela ]│
│ [ no dices nada, vas igual ]  │
└─────────────────────────────┘
```

### ZINE — transiciones y reflexión
Asambleas, decisiones organizativas, casa/familia, cierres de capítulo. Estética de volante fotocopiado: tricolor, tipografía manual, papel gastado, ligera rotación como si estuviera pegado con cinta.

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
   A S A M B L E A
   viernes, facultad de
   [carrera] — 6:30pm
 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  "necesitamos alguien
   para la comisión de
   salud. ¿quién se suma?"

  [ te postulás ]
  [ señalás a alguien ]
  [ te quedás en logística ]
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

### RADIO — acción, alta tensión
Barricada, guarimba nocturna, represión activa. Bitácora de walkie-talkie/dispatch, decisiones urgentes, texto corto.

```
[22:14] viento norte a todos, cambio
[22:14] gnb avanzando por el norte,
        cambio
[22:15] >> _
        [ armar barricada ]
        [ replegarse ]
        [ ayudar a X, está herido ]
```

---

## 2. Mecánica unificadora: La Señal

Los tres modos comparten un mismo indicador visual: **la señal**. Sube tu Riesgo o baja tu Confianza → la señal se degrada en los tres modos a la vez:

- **FEED**: el texto empieza a glitchear, aparecen caracteres corruptos, tuits que no terminan de cargar.
- **RADIO**: estática de fondo, líneas que se cortan a la mitad, "cambio" que no llega respuesta.
- **ZINE**: el papel se ve más rasgado, manchado, como si hubiera pasado por muchas manos con miedo.

Es la única pieza de identidad visual que atraviesa todo el juego — la represión degradando la comunicación, en tiempo real, sin importar el canal.

---

## 3. Sistema de tokens visuales

**Color** (nombrados, no genéricos):
- `#12130f` — negro concreto (fondo base, no negro puro)
- `#e8ddc4` — papel viejo (zine, texto sobre fondo oscuro en momentos de calma)
- `#8c2f1f` — rojo ladrillo apagado (riesgo, alarma, sangre sin ser gráfico)
- `#c9a227` — ocre bandera (coraje, energía, resistencia — no amarillo saturado)
- `#2c4a52` — verde-azul noche (calma, salud, brigada médica)
- `#5b7a63` — verde señal débil (feed activo, conexión funcionando)

**Tipografía:**
- Display (títulos, zine): condensada, trazo grueso, tipo stencil/spray — buscar algo tipo *Anton* o *Oswald Bold* vía Google Fonts, nunca una tipografía "de sistema" para títulos.
- Cuerpo (feed/radio): monoespaciada, tipo *IBM Plex Mono* o *JetBrains Mono* — refuerza el registro "pantalla/transmisión".
- Utilitaria (stats, timestamps): la misma monoespaciada en tamaño menor, sin una tercera familia.

**Layout:** mobile-first, una sola columna, sin sidebars — el jugador nunca ve más de una decisión a la vez, como quien recibe una notificación o una orden por radio: no hay panorama completo, solo el siguiente paso.

**Elemento firma:** la señal (sección 2) es el elemento que hace que este juego no se confunda con ningún otro — no es decoración, es lectura de estado del juego.

---

## 4. Sistema de stats (5 ejes)

Definidos a partir del testimonio primario, no de una plantilla de juego genérica:

| Stat | Qué mide | Sube con | Baja con |
|---|---|---|---|
| **Coraje** | disposición a la acción directa | acciones de calle, barricadas, primera línea | repliegues, silencio |
| **Riesgo** | exposición física/legal | visibilidad, calle, radio en escenas de represión | cautela, bajo perfil |
| **Red** | convocatoria y organización | actividad en Twitter/feed, asambleas, comisiones | inactividad, aislamiento |
| **Confianza** | seguridad interna del grupo frente a infiltración | vetting, comisiones consolidadas, tiempo con el mismo grupo | sumar gente nueva sin verificar, presión/miedo |
| **Percepción pública** | cómo te ve la sociedad civil general, no solo tu red | cobertura favorable, testimonios que llegan bien | trancas que afectan a terceros, cobertura hostil, eventos de infiltración |

**Mecánica clave — evento de infiltración:** si Confianza está baja, hay probabilidad de un evento donde alguien no verificado convierte una acción pacífica en caos. Esto no baja Red (tu gente sigue ahí) pero sí golpea fuerte Percepción pública — mecánicamente representa la brecha real entre intención (defenderse) y cómo te retrataban (violentos).

Ningún stat es "el bueno". Un jugador con Riesgo y Coraje altos pero Confianza baja puede terminar con un final duro aunque haya sido "valiente". Eso es fiel a lo real.

---

## 5. Roles jugables

Afectan stats iniciales y el tono de las primeras escenas del feed:

| Rol | Stats iniciales altos | Base real |
|---|---|---|
| Vocero/a estudiantil | Coraje, Red | testimonio primario — periodismo, vocería, calle, Twitter |
| Brigadista de salud | Confianza, Salud* | comisiones de medicina documentadas |
| Estudiante de derecho | Confianza, Red | recorrido de cárceles/cuarteles por compañeros detenidos |
| Comunicador/a de redes | Red, Riesgo | rol específico de feed/viralización |
| Artista/muralista | Percepción pública, Confianza | estética material de la resistencia (latón, cartón, pintura) |

*Salud puede tratarse como sub-stat de Riesgo en vez de eje propio — a definir en guion si hace falta separarlo.

---

## 6. Estructura narrativa — tres actos, antología cronológica

El juego no tiene un protagonista único viajando por el país (no era realista cruzar zonas militarizadas durante la represión activa) — tiene **tres actos con tres protagonistas ficticios distintos**, cada uno compuesto a partir de investigación y/o testimonio, unidos por la sensación de que es un mismo país resistiendo en simultáneo. El orden es **cronológico real**, siguiendo cómo se expandió el ciclo de protestas en 2014:

**Acto 1 — San Cristóbal, Táchira: "La Chispa"**
Origen del ciclo, enero-febrero 2014. Construido principalmente con investigación de archivo (el cliente no tiene vivencia directa acá). Tono: arranque, improvisación, la sorpresa de que algo pequeño se vuelve nacional.

**Acto 2 — Caracas: "El Frente"**
El epicentro, la mayor escala y densidad de eventos, la mayor concentración de muertes documentadas (12F y siguientes). Construido con investigación de archivo. Tono: más largo que los otros dos actos, más denso, más violento — es donde el juego no suaviza nada.

**Acto 3 — Maracaibo/Zulia: "Viento Norte"**
Basado directamente en el testimonio y los libros del cliente (ver brief, secciones 6.5 y 6.6). Tono: íntimo, de barrio, de comisión pequeña — el acto más corto de los tres pero el de mayor profundidad de detalle real, porque es fuente primaria directa.

**Lo que conecta los tres actos no es el personaje — es la red.** Decisiones tomadas en un acto pueden aparecer como mención, retuit o rumor en el FEED de otro acto, dando la sensación de simultaneidad nacional sin fingir que una sola persona estuvo en los tres lugares.

**Arco interno de cada acto** (mismo patrón de 6-9 escenas del diseño original, pero con peso distinto por acto — Caracas más largo/denso, Zulia más corto/íntimo, San Cristóbal intermedio):
1. Chispa/arranque local (FEED)
2. Asamblea — comisión y resistencia de barrio (ZINE)
3. Primera calle (RADIO)
4. Viralización / primeras señales de infiltración (FEED)
5. Acción de alta tensión — barricada o equivalente (RADIO)
6. Tensión con el entorno — familia, vecinos, apatía social (ZINE)
7. Punto de quiebre — represión fuerte o evento de Confianza baja (RADIO)
8. Refugio/censura (FEED/ZINE)
9. Final del acto — determinado por los 5 stats + inventario del acto

---

## 6.5. Filosofía del final: por qué esto es un juego y no un documental

Principio de diseño explícito, para que quien escriba guion no lo pierda de vista: **el desenlace macro-histórico es fijo** — la represión ganó esa ronda, hubo 43 muertes documentadas, el gobierno siguió en el poder. Eso no lo decide el jugador y no debería poder cambiarlo; hacerlo rompería el rigor histórico de todo el proyecto. Pero **el destino del protagonista ficticio de cada acto es incierto**, porque no es una persona real con un final ya escrito — ahí, y solo ahí, vive la capacidad de decisión del jugador. La diferencia con un documental es exactamente esa: en un documental ya sabés cómo termina todo; acá no sabés cómo termina tu gente.

---

## 6.6. Mecánica de inventario/recursos

Además de los 5 stats (sección 4), cada acto tiene un **inventario chico y tangible** que se gasta y hay que repartir con criterio — no es decorativo, genera fricción real de decisión:

- Máscaras de gas / trapos húmedos
- Agua / suero fisiológico / bicarbonato
- Gasa y material de primeros auxilios
- Contactos de confianza disponibles (ligado al stat Confianza — un contacto "gastado" no se puede volver a usar esa partida)

Ejemplo de decisión con costo real: *"¿Le das la última máscara al que va a la primera línea, o te la guardás?"* — no es una elección de sabor narrativo, es un trade-off de recursos con consecuencia mecánica (afecta Salud/Riesgo de otro personaje del grupo, no solo del jugador).

El inventario es distinto por acto: San Cristóbal y Caracas pueden tener escasez más aguda (recién arrancando, sin red de abastecimiento consolidada); Zulia puede reflejar la logística real que describió el cliente (envíos desde el exterior, redes de barrio ya armadas).

---

## 7. Finales

No hay final "correcto", y cada acto tiene **su propio final personal**, no un final único del juego. Matriz orientativa por acto (ajustar umbrales en guion):

- **Detención/exilio forzado** — Riesgo alto + Confianza baja
- **Voz internacional** — Riesgo alto + Red alta + Percepción pública alta
- **Organización que perdura** — Coraje + Red + Confianza altos, Riesgo moderado
- **Repliegue silencioso** — todos los ejes bajos
- **Emigración** — Percepción pública baja sostenida, independiente del resto (fiel al testimonio: la apatía social fue un factor de irse, no solo la represión)
- **Memoria activa** — perfil equilibrado, sigue organizando en otra forma

El juego es **rejugable por acto**: jugar San Cristóbal de nuevo con otras prioridades de inventario y stats puede terminar en un final distinto — la Chispa no tiene un único destino posible.

Ningún final tiene música triunfal ni fracaso explícito en el copy — tono honesto, no heroico ni derrotista, consistente en los tres actos.

---

## 7.5. Cierre — pantalla final después de los tres actos

Después de completar San Cristóbal, Caracas y Zulia (en cualquier combinación de finales personales), una pantalla final tipo **"mapa nacional"** — no un epílogo que explica qué pasó históricamente (eso ya lo sabe quien jugó), sino una consecuencia visual/textual de las decisiones acumuladas en los tres actos: un pulso colectivo del país esa noche, construido a partir de cómo terminaron los tres protagonistas.

El poema **"Panfleto"** (del libro *Esto no es un panfleto*, ver brief sección 6.6) cierra acá, no al principio — se lo gana el jugador después de haber jugado los tres frentes, no se lo regalás de entrada como epígrafe.

---

## 8. Memorial (pantalla aparte)

Accesible desde el menú principal, fuera de la ficción interactiva. Datos verificados, sin diálogo inventado, formato ficha:

```
BASSIL ALEJANDRO DA COSTA FRÍAS
23 años · estudiante de mercadeo
12 de febrero de 2014 · Caracas
primera víctima fatal del ciclo de protestas
fuente: [cita]
```

Frases reales solo si están documentadas y citadas (ej. Geraldine Moreno). Nunca se redacta diálogo nuevo para una persona real.

---

## 8.5. Fuente literaria como columna vertebral del guion

El guion no parte de cero ni solo de investigación de archivo: parte de los dos libros del cliente (*Alguna vez tuve un país*, *Esto no es un panfleto*), detallados en la sección 6.6 del brief de investigación. Implicaciones para quien escriba el guion final:

- El poema **"Panfleto"** es candidato a texto de apertura o cierre del juego completo — es la tesis del proyecto ya escrita.
- Los relatos *La patrulla*, *¿De Diesel o Gasolina?* y *Armas de difusión masiva* son borradores casi listos de escenas RADIO/FEED — adaptar manteniendo la voz original, no reescribir desde cero.
- El relato de la desaparición de un compañero usa nombre ficticio por decisión del cliente ("Deivis" o el nombre final que confirme) — la persona real sigue viva.
- Los poemas cortos (*Bassil*, *Decálogo del olvido*, *Obituario*, *Receta para la molotov*) son la referencia de registro para todo texto ZINE: crudo, con ironía negra cuando corresponde, nunca solemne ni panfletario — es literalmente el nombre del segundo libro y la advertencia de tono para todo el proyecto.

---

## 9. Plantilla de escena (referencia — detalle completo en el brief de investigación)

```
ID / Modo / Fecha y lugar / Base histórica (fuente) /
Marco ficcional / Decisiones / Deltas de stats /
Nivel de certeza
```

---

## 10. Notas de accesibilidad y mobile

- Una decisión visible a la vez, botones grandes, sin scroll horizontal.
- Respetar `prefers-reduced-motion` — el glitch/estática de la señal debe tener versión reducida (menos movimiento, mismo mensaje por color/textura).
- Foco de teclado visible en todos los botones de decisión.
- Contraste mínimo AA incluso en las paletas oscuras — el negro concreto y el papel viejo están elegidos para cumplir esto, verificar en implementación.
