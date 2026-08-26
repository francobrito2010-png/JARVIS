# Bitácora de JARVIS

Cuaderno de a bordo del proyecto, escrito para alguien sin experiencia en backend.
Si te pierdes, empieza por la sección 1.

---

## 1. CÓMO USAR JARVIS CADA DÍA

JARVIS son dos cosas trabajando a la vez: un **motor** encendido (el servidor) y **tú
hablándole** desde otra ventana. Por eso usarás **dos ventanas de PowerShell**.

> Abrir PowerShell: tecla **Windows** → escribe `PowerShell` → Enter.

### Encender el motor  (ventana 1)
```powershell
cd "C:\Users\franc\Desktop\jarvis-backend"
```
```powershell
npm start
```
- `cd` = entrar en la carpeta del proyecto. La terminal siempre abre en tu carpeta de
  usuario, así que esto es SIEMPRE lo primero.
- `npm start` = encender el servidor.
- **Cómo sé que funcionó:** aparece `[JARVIS] Escuchando en http://localhost:3000`.
- **Aviso:** la ventana se queda "quieta". NO está colgada — es el motor encendido.
  Déjala abierta.

### Hablarle  (ventana 2, una nueva)
```powershell
curl.exe -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{"mensaje":"Hola JARVIS, preséntate"}'
```
- `curl.exe` = mandar un mensaje al motor y enseñar lo que responda.
  (En PowerShell tiene que ser `curl.exe` con el `.exe`, no `curl` a secas.)
- **Cómo sé que funcionó:** devuelve algo como
  `{"respuesta":"Buenas, señor Franco...","pantalla":null,"_meta":{"ms":1200,...}}`.
  El número `ms` es lo que tardó en milisegundos (1200 ms = 1,2 s).

### Hablarle POR VOZ (lo más cómodo)
Con el motor encendido, abre en **Chrome**: <http://localhost:3000>
- La primera vez, el navegador pide permiso para el **micrófono**: acéptalo.
- **Mantén pulsado** el círculo azul, habla, y suéltalo. JARVIS te contesta hablando.
- Si prefieres, escribe en el campo de abajo. (La voz solo va bien en **Chrome**.)

### Comprobar que está vivo (opcional, sin comandos)
Abre en el navegador: <http://localhost:3000/health> → verás `{"ok":true,...}`.

### Apagar el motor  (ventana 1)
En la ventana del motor, pulsa **Ctrl + C**. Vuelve a aparecer la línea normal: apagado.

---

## 2. QUÉ HAY EN CADA ARCHIVO

| Archivo | Para qué sirve |
|---|---|
| `server.js` | El motor: enciende el servidor y atiende el endpoint `POST /chat`. |
| `system-prompt.js` | La personalidad de JARVIS (cómo habla y se comporta). |
| `memory.js` | La memoria: guarda y recupera perfil, hechos y conversaciones en SQLite. |
| `public/index.html` | La página de voz: te escucha, manda al backend y te contesta hablando. |
| `data/jarvis.db` | El archivo de la base de datos (tu memoria). **Secreto, no se sube.** |
| `package.json` | La ficha del proyecto: su nombre y qué piezas necesita. |
| `package-lock.json` | Las versiones exactas de esas piezas. No se toca a mano. |
| `.env` | Tu llave de Claude. **Secreto. No se comparte ni se sube nunca.** |
| `.env.example` | Plantilla de ejemplo del `.env`, sin la llave, para saber qué va dentro. |
| `.gitignore` | Lista de lo que nunca se sube a internet. Lo primero: `.env`. |
| `node_modules/` | Las piezas descargadas. Se regeneran solas con `npm install`. |
| `README.md` | Guía corta de arranque. |
| `CLAUDE.md` | Manifiesto del proyecto: reglas, stack y personalidad. |
| `docs/` | El plan, las especificaciones, la maqueta visual y esta bitácora. |

---

## 3. QUÉ HICE Y POR QUÉ  (decisiones, no código)

- **Node + Express con JavaScript sencillo (CommonJS).** Es lo más simple y sin
  configuración extra; encaja con la regla del proyecto de "JS plano, sin librerías de más".
- **Modelo `claude-sonnet-5`.** Lo pide el plan para el Paso 1: buen equilibrio entre
  calidad de conversación y velocidad.
- **Sin "pensamiento extendido" y esfuerzo bajo.** El plan pone la latencia por encima de
  todo. Hacer que "piense de más" añadiría segundos que aquí no queremos.
- **La personalidad en su propio archivo (`system-prompt.js`).** Para afinar el tono sin
  tocar la lógica del motor. El tono se afina en el Paso 1 porque después es más caro.
- **`max_tokens` = 1024.** Respuestas cortas por defecto, que además van más rápidas.
- **Prompt caching en la personalidad.** Barato dejarlo puesto; ahorrará cuando en el
  Paso 2 se sume el perfil. Hoy el texto es corto y todavía no se activa: inofensivo.
- **La llave fuera del repositorio desde el minuto uno** (`.env` en `.gitignore`). Una
  llave nunca debe viajar ni subirse a ningún sitio.
- **Documentos movidos dentro del proyecto** (`CLAUDE.md` en la raíz, resto en `docs/`).
  Así las referencias `@docs/...` del manifiesto son correctas y todo viaja junto.
- **Comprobado que el Escritorio NO sincroniza con OneDrive.** Por eso el `.env` con tu
  llave no se está subiendo a la nube, y no hizo falta mover el proyecto de sitio.

### Paso 2 — Memoria

- **SQLite en un archivo local, NO Firestore** (decisión de Franco). Motivo: es un
  proyecto de un solo usuario; SQLite da **menor latencia** y **menos piezas que puedan
  fallar**, y no necesita sincronización en la nube. (Esto se aparta del `CLAUDE.md`, que
  proponía Firestore; se hace a propósito y por buen motivo.)
- **SQLite que ya trae Node** (`node:sqlite`), sin instalar ninguna librería nueva —
  fiel a la regla de "sin librerías de más".
- **Tres cosas guardadas:** `perfil` (quién eres, preferencias, idiomas, horarios),
  `hechos` (datos sueltos con fecha) y `conversaciones` (el historial completo).
- **Qué se inyecta en cada llamada:** el perfil completo (es corto) + los **últimos 10
  turnos**. Nunca todo el historial — dispararía coste y latencia.
- **Prompt caching sobre el system prompt + el perfil**, que no cambian entre llamadas.
- **Al desplegar en Railway:** montar un **volumen persistente** y apuntar la variable
  `JARVIS_DB_PATH` a él, para que `jarvis.db` NO se pierda al reiniciar el contenedor.

### Paso 4 — Que haga cosas (herramientas)

- **Dos herramientas, ambas sobre el SQLite que ya tiene** (sin datos externos):
  `crear_nota` (guarda notas/recordatorios) y `buscar_memoria` (busca en notas, hechos y
  conversaciones). Claude **elige** cuál usar según lo que digas; no hay lista de comandos.
- **`leer_stock` de B'Live NO se hizo, a propósito:** es la única del plan que necesita
  **datos reales de stock** que solo tiene Franco. Cuando los pase, se añade igual que las
  otras (mismo patrón).
- **Latencia:** las respuestas con herramienta tardan ~3,3 s porque son **dos llamadas** a
  Claude (decidir la herramienta + contestar). Es lo normal en tool use.

---

## 4. SI ALGO FALLA

| Señal que ves | Qué pasa | Cómo se arregla |
|---|---|---|
| `{"error":"API key invalida o ausente."}` (401) | El `.env` no tiene la llave o está mal escrita. | Abre `.env`, que tenga `ANTHROPIC_API_KEY=sk-ant-...` en una línea. Apaga (Ctrl+C) y `npm start` otra vez. |
| La ventana parece **colgada** tras `npm start` | No lo está: es el motor encendido. | Es normal. Para hablarle usa OTRA ventana. Para apagar, Ctrl+C. |
| `npm : término no reconocido` o `node : ...` | Node no está instalado, o la terminal no lo ve todavía. | Instala Node (o cierra y abre PowerShell de nuevo) y repite. |
| `curl` devuelve un error raro de comillas | Usaste `curl` en vez de `curl.exe`, o comillas mal. | Usa `curl.exe` y el JSON entre comillas simples `'{"mensaje":"..."}'`. |
| `EADDRINUSE` / `address already in use` al arrancar | Ya hay un motor encendido en otra ventana ocupando el puerto 3000. | Usa esa ventana, o apágala con Ctrl+C y vuelve a arrancar. |
| `{"error":"Falta \"mensaje\"..."}` (400) | El mensaje iba vacío o el JSON mal escrito. | Revisa las comillas del `-d '{"mensaje":"..."}'`. |

---

## 5. DÓNDE ESTAMOS

**Paso 1 — El cerebro (endpoint `/chat`): TERMINADO y probado.**

Tiempos reales medidos con `curl` (no estimados):

| Llamada | Tiempo | ¿Cumple < 1,5 s? |
|---|---|---|
| 1ª del arranque (en frío) | ~3,0 s | — (es normal la primera) |
| Respuesta corta (`"51."`) | ~1,2 s | ✅ sí |
| Respuesta más larga (un saludo) | ~2,4 s | ⚠️ no |

- **Tono:** suena a JARVIS (formal, "señor Franco", al grano). ✅
- **Latencia:** cumple en respuestas cortas; se pasa en las largas porque cuantas más
  palabras genera, más tarda. Se afinará de verdad en el Paso 3 con *streaming*.

**Paso 2 — Memoria (SQLite local): TERMINADO y probado.**

Prueba del criterio de salida ("le dices algo hoy, lo recuerda mañana"):
1. Se le dijo: *"mi bar se llama B'Live y está en Odivelas"*.
2. Se **apagó y reencendió** el servidor entero (simulando el paso de un día).
3. Se preguntó *"¿cómo se llama mi bar y dónde está?"* sin recordárselo →
   respondió **"B'Live, en Odivelas"** (cargó 2 turnos previos desde SQLite). ✅

**Paso 3 — Voz en el navegador: CLIENTE CONSTRUIDO, a falta de medir y desplegar.**

- Página de voz (`public/index.html`) servida por el propio backend en
  <http://localhost:3000>. Botón de mantener-pulsado-para-hablar, escucha en español
  (Web Speech API del navegador), respuesta hablada (voz del navegador) y campo de texto
  de respaldo. Funciona en **Chrome**.
- Verificado: el backend arranca y sirve la página; los controles cargan.
- **Falta para cerrar su criterio (< 2 s de voz a voz, medido):**
  1. Probarlo tú en Chrome y **medir con cronómetro** el ciclo completo.
  2. **Desplegarlo** para usarlo en el móvil: backend en **Railway** (con volumen
     persistente para `data/jarvis.db`) y la página en **GitHub Pages**, apuntando
     `BACKEND` en `index.html` a la URL de Railway. Ambos necesitan tus cuentas.
- La página trae un **selector de voz** (recuerda tu elección) y baja el tono para sonar
  más serio. En el equipo de Franco hay 3 voces ES; por defecto se elige **Microsoft
  Pablo** (masculina), lo más parecido a JARVIS entre las gratis.
- **Voz elegida (gratis): "Microsoft Andrés Online (Natural)", español de Guatemala,**
  masculina y natural. Solo aparece en **Microsoft Edge** (Chrome no la trae), y necesita
  **internet** (es neuronal en la nube de Microsoft, pero gratis). Por eso, para hablarle
  por voz, **usar Edge**. La página la deja preseleccionada y recuerda la elección.
- Con esto, **ElevenLabs (Paso 6) queda aparcado**: no hace falta pagar salvo que en el
  futuro se quiera aún más calidad o una voz a medida.

**Paso 4 — Que haga cosas (notas + búsqueda): TERMINADO y probado.**

Prueba (todo hablando normal, sin comandos):
1. *"apunta que tengo que llamar al proveedor de cristalería el lunes"* → usó `crear_nota`,
   la nota quedó guardada (visible en <http://localhost:3000/notas>).
2. *"recuérdame qué tenía que hacer con el proveedor"* → usó `buscar_memoria`, la encontró
   y la leyó. ✅

**Lo que viene (pendiente de ti):**
- **Subir a la nube** (Railway + GitHub Pages) para usarlo en el **móvil**. Necesita tus
  cuentas. Es lo que faltaba para cerrar del todo el Paso 3.
- **`leer_stock` de B'Live**, cuando pases los datos reales de stock.
- **Voz premium (ElevenLabs, Paso 6)**, opcional — de momento resuelto gratis con la voz
  Andrés (Natural) en Edge.

_Última actualización: 2026-08-25._
