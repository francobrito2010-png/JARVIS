# JARVIS — Plan de arranque
### Orden de construcción · complemento del documento de especificaciones

---

## La idea clave antes de empezar

**No empieces por la app móvil.** Empieza por una PWA en tu stack de siempre: HTML/JS en un solo archivo, Firestore, GitHub Pages. Es exactamente lo que ya sabes hacer.

Motivo: el navegador móvil ya te da micrófono, voz, audio Bluetooth y pantalla. En un fin de semana tienes JARVIS funcionando y hablando. Con React Native tardarías tres semanas en llegar al mismo punto — y aún no sabrías si la latencia es aceptable.

La app nativa viene después, cuando la PWA te quede pequeña. No antes.

---

## PASO 0 · Decisiones — 1 hora

Antes de tocar código, cierra esto:

- [ ] ¿Tienes acceso a un Mac? (define si iOS entra en el plan o no)
- [ ] ¿Qué auriculares Bluetooth usas?
- [ ] Inventario de dispositivos inteligentes en casa, si hay alguno
- [ ] Crear cuenta en `platform.claude.com` y generar API key

<cite index="8-1">Al registrarte recibes 5 USD en créditos gratuitos sin necesidad de tarjeta</cite> — suficiente para todo el desarrollo inicial.

---

## PASO 1 · El cerebro, sin interfaz — 1 o 2 tardes

Un backend mínimo que reciba texto y devuelva texto. Nada de voz todavía.

**Qué construir:**
```
POST /chat
  entrada:  { mensaje, historial }
  proceso:  llamada a Claude API con system prompt de JARVIS
  salida:   { respuesta, pantalla? }
```

**Stack:** Node + Express. Despliegue en Railway o Fly.io (plan gratuito sirve de sobra al principio).

**El system prompt** sale directo de la sección 4 del documento de especificaciones: tono formal, "señor Franco", respuestas cortas, español con términos técnicos en inglés.

**Modelo:** empieza con `claude-sonnet-5`. Es el equilibrio correcto para conversación. <cite index="6-1">Haiku 4.5 cuesta 1/5 USD por millón de tokens de entrada/salida y Sonnet 5 está en 2/10 USD</cite> — más adelante puedes enrutar las preguntas simples a Haiku para abaratar.

**Cómo probarlo:** con `curl` desde el terminal. Sin interfaz.

> **Criterio de salida:** responde en menos de 1,5 segundos y suena a JARVIS, no a chatbot genérico. Si el tono no está afinado, arréglalo aquí — luego es más caro.

---

## PASO 2 · Memoria — 1 tarde

Usa **Firestore**, que ya lo dominas.

**Tres colecciones:**

| Colección | Contiene |
|---|---|
| `perfil` | Un solo documento: quién eres, preferencias, idiomas, horarios |
| `hechos` | Datos sueltos que le vas diciendo, con fecha |
| `conversaciones` | Historial completo, para buscar después |

**Cómo inyectar la memoria en cada llamada:** perfil completo (es corto) + últimos 10 turnos. No mandes todo el historial nunca — dispara el coste y la latencia.

**Truco de coste importante:** el perfil y el system prompt no cambian entre llamadas. Usa **prompt caching** de la API. <cite index="6-1">Cada lectura de caché cuesta el 10% de la tarifa base de entrada</cite>, así que es la diferencia entre pagar 20 USD al mes o 5.

> **Criterio de salida:** le dices algo hoy, lo recuerda mañana.

---

## PASO 3 · Voz en la PWA — 1 fin de semana

Aquí es donde empieza a sentirse real.

**Un solo archivo HTML** con:
1. Botón grande de push-to-talk
2. Captura de audio del micrófono
3. Transcripción → tu backend → respuesta
4. Reproducción de la respuesta hablada

**Para la transcripción, dos opciones:**
- **Web Speech API** — gratis, va en el navegador, latencia bajísima. Empieza aquí.
- **Whisper API** — más preciso con acentos y ruido de fondo. Cambia a esto si el primero falla en el bar.

**Para la voz:** usa `speechSynthesis` del navegador de momento. Suena regular, pero es gratis y te sirve para medir. ElevenLabs viene en el paso 6.

**Súbelo a GitHub Pages** y añádelo a la pantalla de inicio del teléfono. Ya tienes JARVIS en el bolsillo.

> **Criterio de salida:** hablas, responde, y todo el ciclo tarda menos de 2 segundos. **Mide esto de verdad, con cronómetro.** Si no llegas, optimiza antes de seguir. Es el punto donde mueren estos proyectos.

---

## PASO 4 · Que haga cosas, no solo hablar — 2 o 3 tardes

Aquí nace la navegación por voz de la sección 5.

**Define herramientas (tool use) en la llamada a la API.** Claude elige cuál usar según lo que digas. No hay lista de comandos.

**Empieza con dos, no más:**

```
leer_stock(categoria?)     → consulta Firestore de B'Live
crear_nota(texto, proyecto) → escribe en Firestore
```

Prueba diciendo cosas distintas para lo mismo: «¿cómo va el stock?», «¿me falta algo?», «¿qué hay que reponer?». Las tres deben funcionar. Si no, ajusta la descripción de la herramienta — ahí está el 90% del trabajo.

**Luego añade, de una en una:**
```
buscar_memoria(consulta)
resumen_del_dia()
```

> **Criterio de salida:** puedes hacer algo útil de verdad sin tocar la pantalla.

---

## PASO 5 · Manos libres — 2 tardes

- Botón del auricular Bluetooth como disparador
- Detección de silencio: saber cuándo terminaste de hablar
- Modo conversación continua: varios turnos seguidos sin volver a pulsar

Aún **sin wake word**. Esa viene con la app nativa, porque en navegador no se puede hacer bien.

> **Criterio de salida:** lo usas caminando por Lisboa, con el teléfono en el bolsillo.

---

## PASO 6 · La voz de verdad — 1 tarde

Cambia `speechSynthesis` por **ElevenLabs**. Elige una voz y no la cambies nunca más — la consistencia es lo que hace que se sienta una entidad.

**Optimización obligatoria:** genera el audio en streaming, no esperes a tener la frase completa. Si no, añades un segundo de espera y arruinas el trabajo del paso 3.

> **Criterio de salida:** suena a JARVIS y no a GPS.

---

## PASO 7 · Punto de decisión

Aquí paras y evalúas con datos reales, no con ganas.

**Pregúntate:**
- ¿Lo estás usando de verdad a diario, o se te olvida que existe?
- ¿Qué te falta más: wake word, control de casa, o traductor?
- ¿La PWA te está limitando en algo concreto?

**Si la PWA aún te sirve:** sigue añadiendo funciones ahí. Es más rápido.

**Si te limita:** entonces sí, app nativa. React Native, porque vienes de React. El backend ya está hecho — solo cambias el cliente.

---

## PASO 8 en adelante · Por prioridad, de uno en uno

| | Qué | Requiere |
|---|---|---|
| **A** | Wake word «Jarvis» | App nativa + Porcupine |
| **B** | Traductor en vivo | Nada nuevo, solo trabajo |
| **C** | Control de la casa | Home Assistant instalado |
| **D** | Cámara y visión | Nada nuevo |
| **E** | Briefing matutino | Calendario conectado |

**Ninguno de estos antes del paso 7.** Y uno cada vez.

---

## Errores que matan este tipo de proyecto

1. **Empezar por la app nativa.** Tres semanas de configuración antes de oír la primera respuesta. Se abandona.
2. **Añadir funciones antes de arreglar la latencia.** Si tarda 4 segundos, no lo vas a usar, por muchas funciones que tenga.
3. **Construir el control de la casa primero.** Es lo más vistoso y lo menos útil a diario.
4. **Mandar todo el historial en cada llamada.** Se dispara la factura y la lentitud.
5. **Cambiar la voz o el tono cada semana.** La consistencia es la mitad del efecto JARVIS.
6. **Saltarse los criterios de salida.** Cada paso tiene uno. Si no se cumple, no se avanza.

---

## Esta semana concretamente

- [ ] Cuenta en `platform.claude.com` + API key
- [ ] Repo nuevo en GitHub: `jarvis`
- [ ] Backend con un solo endpoint `/chat` desplegado en Railway
- [ ] System prompt de JARVIS escrito y afinado
- [ ] Probado con `curl` hasta que el tono sea el correcto

Nada más. Con eso hecho, el paso 3 llega solo.
