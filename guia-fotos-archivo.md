# Guía de curaduría — fotografía de archivo

## Para un agente con control de explorador

Procedimiento para conseguir, verificar y montar las fotos de archivo del juego
(R3 / GS-050). Está escrita para que la ejecute alguien —persona o agente— que
puede navegar, y para que el resultado entre al repo sin que nadie tenga que
revisar a mano si la licencia existe.

**El motor ya está listo.** No hay que tocar código: `src/lib/archivo.js`
resuelve las fotos empaquetadas, `src/ui/pantallas.js` pinta la capa y
`scripts/check-attribution.mjs` falla el build si falta una ficha. Lo único que
falta son fotos con procedencia y licencia verificadas, que es justamente lo que
un script no puede decidir.

**Regla que ordena todo lo demás:** *si no se puede verificar la fuente de una
foto, NO se usa* (R3.3). Una escena sin foto se pinta con tokens visuales y se
ve bien. Una escena con una foto mal atribuida arruina el proyecto entero,
porque el argumento del juego es la trazabilidad.

---

## 1. Descarte inmediato — no hace falta seguir mirando

Si la candidata cae en cualquiera de estos casos, se descarta y se anota en el
registro de descartes (§9). No se pregunta, no se guarda "por si acaso".

| # | Descarte | Por qué |
|---|---|---|
| D1 | **Cuerpos, heridos sangrando, momento de la muerte** | Brief §4.3. Los muertos no son contenido. |
| D2 | **Cualquier imagen de tortura, detenidos esposados, personas sometidas** | Entregable G §3.2: el juego nunca muestra la tortura, muestra el después. |
| D3 | **Caras identificables de manifestantes que no son figuras públicas** | Muchos fueron procesados. Una cara en un juego es una cara en un expediente. |
| D4 | **Menores de edad identificables** | Sin excepción. |
| D5 | **Fotos de las 43 víctimas fatales fuera del memorial** | Brief §4. Y en el memorial, solo con datos verificados y origen familiar o de ONG. |
| D6 | **Cualquier cosa relacionada con la compañera del 4 de febrero** | Regla dura del Acto 1. No existe visualmente. |
| D7 | **Sin autor rastreable, o con el rastro terminando en un agregador** | Pinterest, Taringa, un tuit sin crédito, un blog que copió. No es fuente. |
| D8 | **Con marca de agua de banco de imágenes** | Es la prueba de que no está licenciada. |
| D9 | **Recorte o captura de video** | Otro titular de derechos, otra licencia, y casi siempre sin permiso. |
| D10 | **Generada o recreada con IA, o puesta en escena** | El juego afirma que los hechos no son ficticios. |

**Preferencia positiva, en este orden:** planos generales y de espaldas ·
objetos y calles sin gente · barricadas, humo, carteles, colas · fachadas y
lugares hoy. La capa va al 12–35% de opacidad y en escala de grises: **una foto
de textura funciona mejor que una foto de acción.**

---

## 2. Semáforo de licencia

Registrar siempre **la evidencia**, no la impresión. La evidencia es una URL que
muestra la licencia, o un correo.

### 🟢 Verde — se puede usar hoy

- **Dominio público** declarado (PD, CC0, obra de organismo público cuya
  legislación lo libere). Guardar la URL de la página que lo declara.
- **Creative Commons BY o BY-SA** con autor identificado. Se usa citando autor y
  licencia exactos en la ficha.
- **Wikimedia Commons**, verificando en la propia página del archivo: licencia,
  campo *source*, campo *author*, y que **no tenga plantilla de borrado ni
  disputa de derechos**. Commons aloja archivos subidos por error; la licencia
  que vale es la del original, no la que puso quien subió.

### 🟡 Ámbar — se puede usar con un correo de por medio

- **Archivos de ONG**: PROVEA, Foro Penal, OVCS, Espacio Público. Suelen ceder
  para uso documental sin fines de lucro si se pide con contexto. Plantilla en §10.
- **Medios venezolanos independientes**: Runrun.es, Efecto Cocuyo, El Pitazo,
  Crónica Uno, Panorama, La Patilla. Igual: se pide.
- **Fuente primaria del proyecto**: el blog *Jóvenes Venezolanos /
  CalleSinRetorno*, que es la fuente de C-09, C-10 y C-11 y del desgaste entero.
  **Es el primer correo que hay que mandar**, porque además de fotos puede
  aportar las 17 entradas que faltan (entregable H, pendiente 4).
- **CC BY-NC**: solo si el cliente confirma por escrito que la distribución no
  es comercial. Hasta entonces, ámbar.

### 🔴 Rojo — el agente no lo resuelve solo

- **Agencias**: AP, Reuters, AFP, EFE, Getty. Son licenciables y son caras.
  El agente **no compra nada**: anota la foto como candidata con su URL, su ID de
  agencia y el precio si es visible, y la deja en la lista de decisiones del
  cliente (§9).
- Esto incluye la foto del **partido de fútbol sobre la barricada del 8 de marzo**
  (BBC / Getty), que es la mejor imagen del Acto 1 y la que más falta hace.
  Tratarla como compra, no como hallazgo.

---

## 3. Procedimiento por foto

Diez pasos. Si uno falla, se descarta y se pasa a la siguiente candidata.

1. **Leer la fila de encargo** en §8: fecha, lugar, qué debe verse, qué no.
2. **Buscar** por los términos de la fila, en las fuentes de §2 antes que en un
   buscador general. Un resultado de búsqueda de imágenes **nunca** es la fuente:
   es un puntero a la página donde hay que entrar.
3. **Llegar a la publicación original.** Abrir la página, no la miniatura.
4. **Búsqueda inversa obligatoria** (TinEye, Google Lens, Yandex) para encontrar
   la aparición más antigua. Ver §4: es el paso que más candidatas mata.
5. **Verificar fecha y lugar** contra la cronología del proyecto
   (`entregable-A-cronologia-maestra.md`). Si el pie de foto dice una fecha que
   la cronología contradice, gana la cronología y la foto se descarta.
6. **Pasar los diez descartes** de §1, mirando la imagen completa a tamaño real.
   Las caras se ven al 100%, no en la miniatura.
7. **Determinar la licencia** con evidencia (§2). Sin URL de licencia o sin
   correo de permiso, no hay foto.
8. **Descargar y preparar** el archivo según §5. Nunca hotlink: el archivo se
   copia al repo.
9. **Registrar**: fila en `ATTRIBUTION.md`, bloque `foto` en la escena y crédito
   en `escena.fuentes`. Los tres. Ver §6.
10. **Verificar** con los comandos de §7 antes de dar la foto por puesta.

---

## 4. El chequeo que no se puede saltar: fotos mal atribuidas

Venezuela 2014 es un caso conocido de circulación masiva de imágenes falsas o
mal fechadas: fotos de Egipto, de Chile, de Siria y de protestas venezolanas de
2007 e incluso de 1989 circularon como si fueran de febrero de 2014, en las dos
direcciones políticas. Varias siguen indexadas hoy con el pie equivocado.

**Por eso el paso 4 es obligatorio y no es una formalidad.** Una foto que entre
a este juego con la fecha cambiada le da la razón a quien diga que el proyecto
es un panfleto.

Señales de alarma:
- La aparición más antigua es **posterior** a los hechos y no es un medio.
- Aparece con **dos pies distintos** en dos sitios.
- El paisaje, los uniformes, la señalética o las matrículas no son venezolanos.
- Circula sobre todo en cuentas militantes y no en medios.
- El buscador inverso la encuentra en un banco de imágenes con otra descripción.

Si algo de esto pasa: descarte, con el motivo anotado.

---

## 5. Especificación del archivo

| Parámetro | Valor |
|---|---|
| Directorio | `src/assets/archive/` |
| Formato | `.webp` preferido · `.avif` · `.jpg` como último recurso |
| Ancho máximo | 1600 px (la capa es fondo, no se mira de cerca) |
| Peso por archivo | **≤ 120 KB** |
| Presupuesto total | **≤ 1,5 MB** para todas las fotos juntas |
| Nombre | `<escena-en-minúsculas>-<descriptor>.webp` — p. ej. `t07-barricada-futbol.webp` |

El presupuesto no es capricho: la PWA precachea todo para funcionar sin
conexión (hoy el build entero pesa ~540 KB), y este juego trata sobre gente a la
que le cortaron el internet. Que pese poco es parte del argumento.

**No hace falta editar color ni contraste.** El CSS ya aplica
`grayscale(0.6) contrast(1.1)` y la opacidad de la escena. Solo redimensionar y
comprimir.

**Elegir la opacidad** según lo cargada que esté la imagen:

| La foto es… | `opacidad` |
|---|---|
| Muy detallada, con mucha gente o texto | 0.12 – 0.18 |
| Media: una calle, humo, una fachada | 0.18 – 0.26 |
| Muy vacía: cielo, pared, asfalto | 0.26 – 0.35 |

El tope duro es **0.35** y el shell lo aplica igual en tiempo de ejecución. Si
hay que subir de 0.35 para que la foto se note, la foto no sirve para esta capa.

---

## 6. Cómo se registra — los tres lugares

Faltando cualquiera de los tres, la foto no se muestra o no pasa CI.

**(a) Ficha en `src/assets/archive/ATTRIBUTION.md`**

```
| t07-barricada-futbol.webp | El Nacional | 2014-03-08 | Nombre del autor | CC BY-SA 4.0 | verificada 2026-08-07, permiso por correo |
```

Las cuatro columnas del medio son obligatorias para el gate. En *Estado* va la
fecha de verificación y **cómo** se verificó: la URL de la licencia, o «permiso
por correo de <persona>, <fecha>».

**(b) Bloque `foto` en la escena**, en su JSON de `src/content/actos/`:

```json
"foto": {
  "src": "t07-barricada-futbol.webp",
  "opacidad": 0.2,
  "alt": "Calle bloqueada con escombros y neumáticos en San Cristóbal, con un grupo de personas de espaldas en la acera."
}
```

El `alt` describe **lo que se ve**, no la procedencia. Nunca nombra a una
persona no pública. No empieza con «Foto de» ni con «Imagen de».

**(c) Crédito en `escena.fuentes`** — es la atribución visible que exige R3.2,
y la escena ya la pinta en pantalla:

```json
{ "fuente": "Fotografía: <autor>, <medio>, 8 de marzo de 2014 (CC BY-SA 4.0)", "certeza": "confirmado" }
```

---

## 7. Verificación

```bash
npm run check:attribution   # existe el archivo, ficha completa, opacidad ≤ 0.35, sin hotlink
npm run validate:content    # la escena sigue validando contra el schema
npm test                    # los gates completos y los 314 tests
npm run build               # confirma que el peso del precache sigue razonable
```

Y una comprobación visual, que ningún script hace: levantar `npm run dev`,
entrar a la escena y confirmar que **el texto se lee sin esfuerzo encima de la
foto**. Si compite, bajar la opacidad o descartar.

---

## 8. Lista de encargo

Ordenada por lo que más aporta al juego. «Difícil» no significa que no se
intente: significa que probablemente termine en un correo o en una compra.

| Escena | Fecha y lugar | Qué debe verse | Qué NO puede verse | Términos de búsqueda | Dificultad |
|---|---|---|---|---|---|
| **T-07** | 8 mar 2014, avenida cortada, San Cristóbal | Barricada de día, gente jugando o esperando, vida cotidiana sobre la calle tomada | Caras identificables | `barricada San Cristóbal marzo 2014 fútbol`, `estudiantes juegan barricada Táchira` | 🔴 Getty/BBC — compra |
| **C-04** | 18 feb 2014, plaza Brión, Chacaíto | Multitud vista de lejos o desde arriba, la estatua, la plaza llena | Primeros planos | `plaza Brión Chacaíto 18 febrero 2014`, `Chacaíto multitud 2014` | 🟢 revisar Commons |
| **C-09** | mar–may 2014, acera del PNUD, Caracas | Carpas en la acera, el campamento Conciencia Nacional | Caras de los huelguistas | Blog *Jóvenes Venezolanos / CalleSinRetorno*, archivo 2014 | 🟡 fuente primaria, pedir |
| **Z-08** | 25 mar 2014, CNE-Zulia, av. El Milagro | Fachada del edificio quemado, de día, después | Nada con personas | `CNE Zulia incendio 25 marzo 2014`, `sede CNE El Milagro quemada` | 🟡 Panorama, pedir |
| **T-09** | abr 2014, avenidas de San Cristóbal | Avenida despejada y limpia, maquinaria, calle vacía | — | `San Cristóbal avenidas despejadas abril 2014`, `Padrino López operativo Táchira` | 🟡 BBC/agencias |
| **C-06** | 24 feb 2014, este de Caracas | Barricada de calle residencial, escombros, un paso abierto | Caras | `barricada este de Caracas febrero 2014 vecinos` | 🟡 |
| **T-05** | 20–21 feb 2014, San Cristóbal | Volantes fotocopiados, carteles en postes, papel | — | `volantes protesta Táchira 2014`, `carteles postes San Cristóbal 2014` | 🟡 difícil de fechar |
| **Z-01** | 10 feb 2014, LUZ, Maracaibo | Cierre de Cecilio Acosta o avenida Guajira, plano general | Caras | `LUZ Cecilio Acosta 10 febrero 2014`, `estudiantes LUZ protesta febrero 2014` | 🟡 La Patilla, pedir |
| **C-03** | 13 feb 2014 | Pantalla de teléfono con la imagen que no carga, o cartel sobre censura | — | Captura de época, o recrear con material propio del cliente | 🟢 alternativa propia |
| **Z-05** | feb–mar 2014, Maracaibo | Calle de madrugada, ramas cortadas, tranca improvisada | Personas | `tranca ramas Maracaibo 2014`, `barricada madrugada Zulia 2014` | 🟡 |
| **T-04** | 17 feb 2014, San Cristóbal / Rubio | Humo de basura quemada en una esquina, cacerolas en ventanas | Caras, GNB en acción | `Táchira 17 febrero 2014 quema basura`, `cacerolazo San Cristóbal 2014` | 🟡 |
| **C-11** | 8 may 2014, PNUD, Caracas | La acera vacía después, carpas desarmadas | Detenidos | Blog *Jóvenes Venezolanos*, comunicados de mayo | 🟡 fuente primaria |

**Escenas que se quedan sin foto a propósito:** C-01, C-02, C-05, C-08 y T-06 y
T-08 son las de los muertos. El juego dice que ninguna muerte ocurre en pantalla
y una foto de esa noche la pone en pantalla. **Van sin foto.** El memorial
también: los 43 se cuentan con nombre y ficha, no con cara.

---

## 9. Qué se anota siempre

Dos listas, ambas al final de `ATTRIBUTION.md`, para que nadie repita trabajo.

**Descartes** — una línea por candidata rechazada:

```
- t07 | <URL> | descartada D7: el rastro más antiguo es un tuit sin crédito de 2016
- c04 | <URL> | descartada §4: aparición más antigua en 2011, es de otra protesta
```

**Candidatas de agencia** — lo que el cliente tiene que decidir y pagar:

```
- t07 | Getty Images ID 123456789 | 8 mar 2014 | licencia editorial web, precio visible: USD xx
```

---

## 10. Plantilla de pedido de permiso

Para ONG, medios independientes y la fuente primaria. Corta, concreta y honesta
sobre qué es el proyecto.

> **Asunto:** Permiso de uso de una fotografía de 2014 para un proyecto documental
>
> Buenos días:
>
> Estoy trabajando en *Esto no es un panfleto*, un juego narrativo documental
> sobre el ciclo de protestas venezolano de 2014. Es un proyecto de memoria: los
> personajes son ficticios, y los hechos, las fechas, los lugares y las cifras
> están documentados y con fuente citada en pantalla.
>
> Quisiera pedirles permiso para usar la fotografía publicada en <URL>, del
> <fecha>, como capa de fondo de una escena. Se mostraría en escala de grises y
> a menos del 35% de opacidad, con crédito visible en la propia pantalla
> (autor, medio y fecha) y ficha completa en el repositorio del proyecto.
>
> Si prefieren una formulación específica del crédito, la uso tal cual. Y si la
> respuesta es que no, no hay problema: la escena se publica sin foto.
>
> ¿Me confirman si es posible y bajo qué condiciones?
>
> Gracias por el trabajo de archivo, que es lo que hace posible este proyecto.

Guardar la respuesta. La columna *Estado* de la ficha tiene que poder apuntar a
un correo con fecha.

---

## 11. Definición de terminado

Una foto está puesta cuando las seis cosas son ciertas:

1. El archivo está en `src/assets/archive/` y pesa menos de 120 KB.
2. Tiene ficha completa en `ATTRIBUTION.md` con evidencia de licencia.
3. La escena tiene su bloque `foto` con `alt` escrito y opacidad elegida.
4. El crédito está en `escena.fuentes` y se ve en pantalla.
5. `npm test` y `npm run build` pasan.
6. Alguien miró la escena en el navegador y el texto se lee sin esfuerzo.

Con cinco de seis, la foto no está puesta.
