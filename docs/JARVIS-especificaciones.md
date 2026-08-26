# JARVIS — Asistente Personal de Franco
### Documento de especificaciones · v1.3

---

## 1. Qué es esto

Una aplicación móvil personal (un solo usuario: Franco) que funciona como asistente de voz permanente. No es un chatbot más — es un sistema que te conoce, recuerda tu contexto y actúa sobre tu entorno.

**Principio rector:** cada función debe funcionar rápido y sin fallos antes de añadir la siguiente. La mayoría de estos proyectos mueren por intentar hacerlo todo a la vez.

---

## 2. Arquitectura general

```
┌─────────────────┐
│  App móvil      │  ← micrófono, pantalla, auriculares BT
│  (cliente)      │
└────────┬────────┘
         │ HTTPS / WebSocket
┌────────▼────────┐
│  Backend propio │  ← orquestador: decide qué hacer
│  (Node o Python)│
└────┬───────┬────┘
     │       │
┌────▼──┐ ┌──▼──────────────┐
│ Claude│ │ Integraciones    │
│  API  │ │ (casa, calendario│
└───────┘ │  stock, etc.)    │
          └──────────────────┘
```

**Componentes:**

| Capa | Función | Tecnología sugerida |
|---|---|---|
| Cliente móvil | Captura audio, reproduce voz, UI mínima | React Native o Flutter |
| Wake word | Detecta "JARVIS" sin gastar API | Porcupine (local, en el teléfono) |
| Voz → texto | Transcripción | Whisper API o Deepgram |
| Cerebro | Entiende, decide, responde | Claude API (Sonnet para rapidez, Opus para tareas complejas) |
| Texto → voz | Voz consistente estilo JARVIS | ElevenLabs |
| Memoria | Contexto persistente | SQLite local + Postgres en servidor |
| Puente domótico | Habla con luces, clima, ventanas | Home Assistant |
| Hosting | Servidor del backend | Digital Ocean / Railway / Fly.io |

**Por qué Home Assistant:** en lugar de escribir un driver por cada marca (Philips Hue, TP-Link, Sonoff...), Home Assistant ya los soporta todos y expone una sola API. Te ahorra semanas de trabajo.

---

## 3. Fases de desarrollo

### FASE 1 — La base (no pasar de aquí hasta que sea sólido)

**Objetivo:** hablarle y que responda, rápido y bien.

- [ ] App móvil con botón push-to-talk
- [ ] Captura de audio y envío al backend
- [ ] Transcripción voz → texto
- [ ] Llamada a Claude API con contexto personal inyectado
- [ ] Respuesta hablada con voz fija (nunca cambia)
- [ ] Modo texto como alternativa (para cuando no puedas hablar)
- [ ] Memoria básica: quién eres, tus proyectos, tus preferencias
- [ ] Historial de conversaciones guardado y buscable
- [ ] **Toda función de esta fase accesible solo por voz** (ver sección 5)
- [ ] Enrutamiento de intenciones: Claude decide qué hacer y qué mostrar

**Criterio de éxito:** de pulsar el botón a oír la respuesta, menos de 2 segundos. Si tarda más, optimizar antes de seguir.

---

### FASE 2 — Manos libres

**Objetivo:** usarlo con auriculares Bluetooth sin tocar el teléfono.

- [ ] Wake word local ("JARVIS") — corre en el dispositivo, no gasta API
- [ ] Detección de silencio (saber cuándo terminaste de hablar)
- [ ] Soporte del botón físico del auricular como disparador alternativo
- [ ] Gestión de audio Bluetooth (entrada y salida por el auricular)
- [ ] Modo conversación continua (varios turnos sin repetir la wake word)

**Advertencia técnica:** la wake word siempre activa consume batería. Medir el impacto real antes de comprometerse. Si es excesivo, ofrecer el botón del auricular como modo por defecto.

**Importante:** el diseño de esta fase depende de la plataforma. Ver sección 7 — en iOS la escucha permanente **no está permitida** por el sistema.

---

### FASE 3 — Utilidad diaria

**Objetivo:** que resuelva cosas reales de tu día.

- [ ] Integración con calendario y recordatorios
- [ ] Recordatorios por ubicación ("recuérdame esto cuando llegue a casa")
- [ ] Consulta de tus proyectos (B'Live Manager, stock, etc.)
- [ ] Dictado de notas con archivado automático por proyecto
- [ ] Búsqueda web cuando haga falta
- [ ] "¿Qué me falta hoy?" — resumen de pendientes
- [ ] Registro de decisiones (por qué elegiste tal cosa hace meses)

---

### FASE 4 — Traductor en vivo

**Objetivo:** traducción al oído, en tiempo real.

- [ ] **Modo escucha pasiva:** oye el ambiente, traduce a tu oído
- [ ] **Modo conversación:** tú hablas → sale traducido por el altavoz; el otro responde → te llega traducido al oído
- [ ] Detección automática de idioma de origen
- [ ] Selección rápida de idioma por voz ("JARVIS, traduce del italiano")
- [ ] Latencia objetivo: menos de 1,5 s por frase

**Nota:** este modo consume API de forma continua. Conviene activarlo explícitamente y que se apague solo tras X minutos de inactividad.

---

### FASE 5 — Control del entorno

**Objetivo:** que actúe sobre la casa.

- [ ] Conexión con Home Assistant
- [ ] Control de luces, clima, ventanas motorizadas, enchufes
- [ ] Escenas por comando ("modo noche", "modo trabajo", "me voy")
- [ ] Confirmación obligatoria para acciones sensibles (abrir ventanas, apagar todo, cerraduras)
- [ ] Geofencing: al salir de casa → "¿apago las luces, señor?"

**Regla de seguridad:** ninguna acción física irreversible sin confirmación verbal explícita. Un comando mal transcrito no puede abrir las ventanas de madrugada.

---

### FASE 6 — Cámara y visión

- [ ] Apuntar y preguntar: leer etiquetas, identificar botellas, traducir carteles
- [ ] Diagnóstico de errores en pantalla (le enseñas el error, te lo explica)
- [ ] Reconocimiento de productos para inventario del bar

---

### FASE 7 — El toque JARVIS

- [ ] Briefing matutino automático (agenda, pendientes, tiempo)
- [ ] Alertas contextuales proactivas
- [ ] Modo silencioso automático según hora
- [ ] Modo aprendizaje: explicaciones tipo podcast durante trayectos
- [ ] Modo emergencia: comando de voz que llama a alguien o manda tu ubicación
- [ ] Filtro de ruido: resumen de lo importante si conectas email o mensajes

---

## 4. Personalidad y comportamiento

Esto es lo que separa un chatbot de JARVIS. Va en el system prompt del backend.

**Tono:**
- Formal pero cercano. "Señor Franco" o "Frank" según el momento
- Español natural, con términos técnicos en inglés (como hablas tú)
- Nunca servil, nunca excesivamente entusiasta
- Directo: la respuesta primero, el contexto después

**Verbosidad:**
- Por defecto: corto. Una o dos frases si la pregunta es simple
- Extenso solo si lo pides explícitamente
- En modo manos libres: aún más corto (estás escuchando, no leyendo)

**Proactividad:**
- Puede anticiparse, pero sin interrumpir constantemente
- Si detecta algo relevante, lo menciona una vez y lo deja

**Consistencia:**
- Misma voz siempre, misma personalidad siempre
- La coherencia es lo que hace que se sienta como una entidad y no como una API

---

## 5. Navegación por voz — requisito central

**Todo el sistema debe ser accesible únicamente hablando.** No debe existir ninguna función que solo se pueda alcanzar tocando la pantalla.

Esto no es una función más: es una restricción de diseño que condiciona toda la app.

### 5.1 Consecuencia sobre la interfaz

La barra de navegación inferior deja de ser el camino principal y pasa a ser **respaldo**. Las pantallas ya no son destinos a los que se navega — son el resultado visual de lo que se pidió.

| Enfoque tradicional | Enfoque de este proyecto |
|---|---|
| El usuario navega y luego actúa | El usuario dice qué quiere y la pantalla aparece sola |
| La pantalla es el punto de partida | La pantalla es la confirmación de lo dicho |
| Tocar es lo normal, hablar es un extra | Hablar es lo normal, tocar es el respaldo |

**Regla:** si una función necesita que toques algo para llegar a ella, está mal diseñada.

### 5.2 Enrutamiento de intenciones

El backend debe interpretar lo que dices y decidir tres cosas:

1. **Qué acción ejecutar** (consultar, cambiar, traducir, anotar...)
2. **Sobre qué** (una luz, un proyecto, un idioma, una nota)
3. **Qué mostrar en pantalla**, si es que hay que mostrar algo

Claude hace las tres. No hace falta un motor de intenciones aparte ni una lista cerrada de comandos — esa es justamente la ventaja de usar un modelo de lenguaje en lugar de reglas fijas.

**Implicación técnica:** el backend expone un conjunto de herramientas (encender luz, leer stock, crear nota, traducir...) y Claude elige cuál usar según lo que dijiste. La respuesta que vuelve al teléfono lleva dos partes: lo que hay que decir en voz alta, y opcionalmente qué pantalla mostrar.

### 5.3 Vocabulario — lenguaje natural, no comandos

No hay comandos memorizados. Se habla normal, y estas frases deben funcionar todas igual:

| Lo que se dice | Lo que hace |
|---|---|
| «¿Cómo va el stock?» / «¿Me falta algo en el bar?» | Abre stock, lee lo que está bajo mínimo |
| «Ponme en modo traductor» / «Tradúceme del portugués» | Activa traductor, detecta idioma |
| «Apaga el salón» / «Está muy claro aquí» | Control de luces |
| «Apunta que hay que llamar al proveedor» | Crea nota, la archiva por proyecto |
| «¿Qué decidí sobre la base de datos?» | Busca en el registro de decisiones |
| «¿Qué tengo hoy?» | Resumen de agenda y pendientes |
| «Vuelve» / «Déjalo» / «Cancela» | Deshace o sale del modo actual |

**Importante:** debe entender la intención, no la fórmula exacta. «Está muy claro aquí» y «baja las luces» son la misma orden.

### 5.4 Requisitos que esto añade

- [ ] Toda función accesible por voz, sin excepción
- [ ] Enrutamiento de intenciones vía herramientas de Claude
- [ ] Las pantallas se abren solas según lo pedido
- [ ] Control de navegación por voz: volver, cancelar, salir, repetir
- [ ] Manejo de ambigüedad: si no está claro, preguntar en vez de adivinar
- [ ] Recuperación de errores por voz: «no, me refería a…»
- [ ] Confirmación hablada para acciones irreversibles (ver Fase 5)
- [ ] La barra de navegación se mantiene, pero solo como respaldo

### 5.5 Riesgo asociado

Un sistema donde todo se pide hablando **falla más visiblemente** que uno donde tocas botones. Si transcribe mal o interpreta mal, no hay red de seguridad.

Mitigaciones:
- Repetir en pantalla lo que entendió, siempre
- Preguntar antes de actuar cuando haya ambigüedad
- Deshacer por voz con una sola frase
- Mantener la interfaz táctil funcional como respaldo real, no decorativo

---

## 6. Memoria — el componente más importante

Cualquiera puede montar un asistente de voz. Lo que ninguna app comercial tiene es un sistema que te conozca de verdad tras un año de uso.

**Qué guardar:**

| Tipo | Ejemplo | Persistencia |
|---|---|---|
| Perfil | Nombre, idiomas, horarios, preferencias | Permanente |
| Proyectos | Estado de cada proyecto, decisiones tomadas | Permanente, actualizable |
| Hechos | "El proveedor de X es Y", "la clave del router está en Z" | Permanente |
| Conversaciones | Historial completo | Archivado, buscable |
| Contexto reciente | Últimos días de actividad | Rotativo |

**Diseño:** no metas todo el historial en cada llamada a la API — se dispara el coste y la latencia. Usa un resumen del perfil + búsqueda semántica sobre el archivo histórico, e inyecta solo lo relevante.

---

## 7. Plataformas — iOS vs Android

Sección crítica. Las limitaciones de cada sistema condicionan el diseño de la Fase 2 (manos libres). Leer **antes** de escribir una línea de código.

### 7.1 Resumen comparativo

| Aspecto | iOS (iPhone 17 Pro Max) | Android (Oppo / Tecno) |
|---|---|---|
| Potencia para wake word local | Sobrada, ni lo nota | Depende del modelo; gama entrada va justa |
| Escucha en segundo plano real | **No permitida** | **Sí permitida** |
| Instalación de app propia | Firma gratuita (caduca a 7 días) o cuenta de pago | APK directo, gratis |
| Coste anual de la plataforma | 0 USD gratis / 99 USD opcional | 0 USD |
| ¿Hay que publicar en la tienda? | **No**, en ningún caso | **No** |
| Fiabilidad del proceso en background | N/A | Buena en Android puro, **mala en ColorOS/HiOS** |

### 7.2 iOS — limitaciones concretas

**El teléfono no es el problema.** Un iPhone 17 Pro Max tiene potencia muy por encima de lo necesario. El cuello de botella será siempre la red y las APIs, nunca el dispositivo. La wake word local corre sin esfuerzo.

**Limitación 1 — Apple no permite micrófono siempre activo.**
Una app de terceros no puede escuchar de forma indefinida en segundo plano como hace Siri. Es una restricción del sistema operativo, no algo que se resuelva programando mejor.

Opciones reales en iOS:
- **App en primer plano** con la pantalla encendida — funciona, pero limita el uso
- **Botón físico de los auriculares** como disparador — la opción más práctica
- **Atajo de Siri** — "Oye Siri, JARVIS" abre tu app y activa la escucha

> **Recomendación:** en iOS, el botón del auricular como método por defecto. Evita la pelea con las restricciones del sistema y el consumo de batería.

**Limitación 2 — instalación en el dispositivo.**

La app **no se publica en la App Store**. Es de uso personal y ahí se queda. Los 99 USD/año de Apple no son una cuota de publicación — son el precio de poder firmar apps propias con validez larga. Se puede tener la cuenta y no subir nunca nada a la tienda.

Existen dos vías:

| | Firma gratuita (Apple ID normal) | Cuenta de desarrollador |
|---|---|---|
| Coste | 0 USD | 99 USD/año |
| Caducidad de la app | 7 días | 1 año |
| Apps simultáneas | Máximo 3 | Sin límite práctico |
| Requiere Mac para compilar | Sí | Sí |
| Renovación | Manual, o automatizada con AltStore | No hace falta |

**Sobre la vía gratuita:** la app deja de funcionar a los 7 días y hay que reinstalarla conectando el teléfono. Herramientas como **AltStore** automatizan esa renovación por WiFi, de modo que en la práctica apenas se nota.

> **Recomendación:** empezar con la firma gratuita. Si tras unos meses de uso real la renovación semanal molesta, entonces pagar los 99 USD. No antes.

**Lo que sí funciona perfecto en iOS:** auriculares Bluetooth, traductor en vivo, cámara y visión, control de la casa, memoria — todo lo demás.

### 7.3 Android — ventajas y trampas

**Ventajas frente a iOS:**
- Escucha en segundo plano **real**: con la app cerrada y la pantalla apagada, mediante un *foreground service* con notificación persistente
- Wake word siempre activa, sin trucos ni atajos
- Instalación directa del APK, sin cuota anual
- Acceso más libre al sistema

**Trampa 1 — Oppo y Tecno específicamente.**
ColorOS (Oppo) y HiOS (Tecno) están entre las capas de personalización más agresivas del mercado matando procesos en segundo plano para ahorrar batería. El servicio se puede morir solo a los ~20 minutos aunque esté correctamente programado.

*Solución:* añadir la app manualmente a la lista blanca de optimización de batería en los ajustes del sistema. Es un problema documentado y conocido — consultar `dontkillmyapp.com` para los pasos exactos de cada fabricante.

**Trampa 2 — potencia en gama de entrada.**
Un Tecno de gama básica puede ir justo para ejecutar la wake word en local de forma continua. Lo que el iPhone ni nota, un Tecno básico sí lo acusa en rendimiento y batería.

### 7.4 Decisión recomendada

**Desarrollar multiplataforma desde el día uno.** React Native o Flutter cubren ambos sistemas con una sola base de código. No elegir uno y migrar después — eso es rehacer trabajo.

Estrategia sugerida:
- **iPhone como equipo principal**, con el botón de los auriculares como disparador
- **Si se quiere escucha siempre activa real**, usar un Android de gama media-alta — mejor opción que un Tecno de entrada

---

## 8. Costes estimados

### 8.1 Desarrollo propio (tu caso)

**Coste mensual recurrente:**

| Concepto | Coste mensual |
|---|---|
| Claude API (uso diario moderado) | 5–20 USD |
| Transcripción de voz | 2–8 USD |
| Voz sintética (ElevenLabs) | 5–22 USD |
| Hosting backend | 5–15 USD |
| Integraciones domóticas (Home Assistant) | 0 USD |
| **Subtotal mensual** | **~17–65 USD/mes** |

El rango depende sobre todo de cuánto uses el traductor en vivo y la voz sintética — son las partidas que más escalan.

**Coste anual adicional:**

| Concepto | Coste |
|---|---|
| iOS — firma gratuita con Apple ID (renovar cada 7 días) | 0 USD |
| iOS — cuenta de desarrollador (opcional, evita la renovación) | 99 USD/año |
| Android — instalación de APK | 0 USD |

**Nota:** en ningún caso hay que publicar la app en una tienda. Es de uso personal.

### 8.2 Alternativa: encargarlo a terceros

2.000–5.000 USD mínimo, más si se quiere acabado pulido.

### 8.3 Hardware

Partida aparte. Si aún no tienes dispositivos inteligentes instalados, ese es el gasto grande — de cientos a miles de USD según cuánto quieras automatizar.

---

## 9. Riesgos y decisiones pendientes

**Riesgos identificados:**
1. **Batería** — wake word siempre activa. Medir antes de comprometerse
2. **Latencia** — si supera 2 s se siente lento y dejas de usarlo
3. **Coste variable** — el traductor en vivo puede disparar la factura
4. **Seguridad** — comandos mal interpretados sobre dispositivos físicos
5. **Privacidad** — un micrófono siempre escuchando; decidir qué se envía a la nube y qué se procesa en local
6. **Restricción de iOS** — sin escucha permanente en segundo plano; condiciona el diseño de la Fase 2
7. **Gestión agresiva de batería en ColorOS/HiOS** — mata el servicio en segundo plano
8. **Sin red de seguridad táctil** — si todo se pide hablando, un error de transcripción no tiene alternativa evidente. Mitigar mostrando siempre lo que entendió

**Decisiones que faltan por tomar:**
- [ ] ¿React Native o Flutter?
- [ ] ¿Qué dispositivos inteligentes hay ya en casa?
- [ ] ¿Plataforma principal: iPhone, Android, o ambas desde el inicio?
- [ ] ¿Wake word siempre activa o botón del auricular por defecto?
- [ ] ¿Qué auriculares Bluetooth? (determina qué botón se puede interceptar)
- [ ] ¿Firma gratuita de iOS o cuenta de pago? (recomendado: empezar gratis)
- [ ] ¿Hay acceso a un Mac para compilar para iOS?
- [ ] ¿Qué proveedor de voz? (probar ElevenLabs vs alternativas)
- [ ] ¿Dónde alojar el backend?

---

## 10. Siguiente paso

Cerrar las decisiones pendientes de la sección 9 y arrancar **solo** la Fase 1. Nada más.

Cuando la Fase 1 funcione en menos de 2 segundos y sin fallos durante una semana de uso real, entonces se abre la Fase 2.
