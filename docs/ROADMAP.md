# JARVIS — Hoja de ruta hasta la mejor versión

Orden recomendado para llegar al JARVIS completo de las especificaciones, **sin morir en
el intento**. Regla de oro (de tu propio documento): *una función funcionando y rápida
antes de empezar la siguiente*. Nada de hacerlo todo a la vez.

Leyenda de lo que hace falta:
🟢 se puede en la web, sin cuentas · 🔑 necesita una cuenta gratis · 📱 necesita app
nativa · 🏠 necesita hardware o tus datos · ⏱️ objetivo de latencia < 2 s siempre.

---

## ✅ Hito 0 — Los cimientos (HECHO)

Le hablas, te entiende con personalidad, **recuerda** (memoria SQLite), te **contesta con
voz** (Andrés, gratis) y sabe **tomar notas y buscar** en su memoria. Corre en tu PC.
→ *Esto ya está probado y funcionando.*

---

## 🔑 Hito 1 — Sacarlo al bolsillo (desplegar) · EL SALTO CLAVE

Poner JARVIS en internet para usarlo en el **móvil** desde cualquier sitio, no solo en el PC.
- Backend en **Railway** (con volumen persistente, para que la memoria no se borre).
- Página en **GitHub Pages**, apuntando al backend de Railway.
- **Necesita:** cuenta de Railway + cuenta de GitHub (ambas gratis; te guío clic a clic).
- **Por qué va primero:** convierte la demo en un asistente real en tu bolsillo. Todo lo
  demás se disfruta ya en el teléfono.
- **Terminado cuando:** le hablas desde el móvil, en la calle, y responde.

---

## 🟢 Hito 2 — Rematar la Fase 1 al 100%

Cerrar los flecos de la base para que sea sólida de verdad.
- **Que las pantallas "se abran solas"** con el resultado de lo que pides (sección 5): la
  respuesta trae "qué mostrar" y la página lo pinta (p.ej. la lista de notas).
- Mostrar siempre lo que entendió, y **control por voz**: "repite", "cancela", "vuelve".
- **Medir la latencia real en el móvil** y optimizar con *streaming* de la respuesta. ⏱️
- **Terminado cuando:** < 2 s de voz a voz y una semana de uso sin fallos.

---

## 🟢 Hito 3 — Utilidad diaria, lo que no necesita cuentas (Fase 3, parte 1)

- **"¿Qué tengo hoy?"** — resumen de tus notas y pendientes.
- **Registro de decisiones** — "¿qué decidí sobre X?" (buscable).
- **Búsqueda web** cuando haga falta (herramienta de búsqueda de Claude).
- Afinar el **dictado de notas por proyecto** (ya existe).

---

## 🔑 Hito 4 — Conectar tu vida (Fase 3, parte 2)

- **Google Calendar:** agenda y recordatorios ("¿qué tengo mañana?", "recuérdame X").
- Recordatorios por ubicación (limitado en web; pleno con la app nativa del Hito 7).
- **Necesita:** conectar tu cuenta de Google (permiso puntual).

---

## 🟢 Hito 5 — Cámara y visión (Fase 6)

Apuntar con el móvil y preguntar: leer etiquetas, **identificar botellas** para el bar,
traducir carteles, o enseñarle un error de pantalla y que te lo explique.
- Funciona en el **navegador del móvil** (cámara + visión de Claude).
- Va aquí, adelantado, porque aporta mucho y **no espera a la app nativa**.

---

## 🔑 Hito 6 — Voz de película y traductor (Fases 4 y voz premium)

- **ElevenLabs**: voz tipo JARVIS de verdad, con streaming (opcional; hoy Andrés cumple).
- **Modo traductor en vivo**: tú hablas → sale traducido; el otro responde → te llega
  traducido. ⏱️ objetivo < 1,5 s por frase.
- **Necesita:** cuenta de ElevenLabs (plan gratis limitado; de pago ~5–22 USD/mes).

---

## 📱 Hito 7 — El salto a app nativa (Fase 2: manos libres)

**Solo cuando la web se te quede pequeña** (regla del plan). Aquí se vuelve de verdad
manos libres:
- **Wake word "Jarvis"** (sin tocar nada), **botón del auricular**, escucha en segundo
  plano, conversación continua.
- En una web —sobre todo en iPhone— esto **no se puede**; requiere **React Native**.
- **Necesita:** para iPhone, un **Mac** para compilar; y cerrar las decisiones de la
  sección 9 (React Native vs Flutter, auriculares, firma gratis vs cuenta de pago…).

---

## 🏠 Hito 8 — Control de la casa (Fase 5)

- **Home Assistant** + dispositivos inteligentes: luces, clima, enchufes, escenas
  ("modo noche", "me voy").
- **Regla de seguridad:** ninguna acción física irreversible sin confirmación hablada.
- **Necesita:** comprar/instalar hardware (gasto aparte, de cientos a miles según cuánto).

---

## 🟢/🔑 Hito 9 — El toque JARVIS (Fase 7)

- **Briefing matutino** (agenda + pendientes + tiempo), alertas proactivas, modo silencioso
  por hora, **modo emergencia**, filtro de email/mensajes.
- **Necesita:** calendario y/o email conectados (Hito 4).

---

## Reglas que se respetan en TODOS los hitos

1. **Latencia < 2 s** de voz a voz. Si una función la empeora, se optimiza o no entra.
2. **Una cosa a la vez**, funcionando antes de la siguiente.
3. **Voz y personalidad siempre iguales** — la consistencia es media magia de JARVIS.
4. **Confirmación hablada** para cualquier acción irreversible.
5. **Tu llave y tus datos** nunca salen a sitios que no controles.

## Sobre el coste (para que no haya sorpresas)

Con uso diario, el documento estima **~17–65 USD/mes** cuando esté todo (Claude API + voz +
hosting), según cuánto uses el traductor y la voz premium. Hoy, en local, solo pagas los
céntimos de cada conversación con Claude.

_Escrito: 2026-08-26. Siguiente hito recomendado: **Hito 1 (desplegar al móvil).**_
