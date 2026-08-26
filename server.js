// JARVIS - Backend
//   Paso 1: el cerebro (endpoint /chat)
//   Paso 2: memoria persistente en SQLite local (perfil + hechos + conversaciones)
//
//   POST /chat     { mensaje }            -> { respuesta, pantalla }
//   GET  /health                          -> estado del servidor
//   GET  /perfil                          -> ver el perfil guardado
//   POST /perfil   { clave, valor }       -> anadir/actualizar un dato del perfil
//   GET  /hechos                          -> ver los hechos guardados
//   POST /hecho    { texto }              -> anadir un hecho
//
// Se prueba con curl. Sin interfaz. (Paso 3 trae la voz; Paso 4, las herramientas.)

require("dotenv").config();
const path = require("node:path");
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const { SYSTEM_PROMPT } = require("./system-prompt");
const memoria = require("./memory");

// --- Configuracion ---
const PORT = process.env.PORT || 3000;
// Modelo: claude-sonnet-5, el equilibrio correcto para conversacion.
const MODELO = process.env.JARVIS_MODEL || "claude-sonnet-5";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "[JARVIS] Aviso: ANTHROPIC_API_KEY no esta definida. " +
      "Crea un archivo .env con tu key antes de llamar a /chat."
  );
}

const anthropic = new Anthropic(); // lee ANTHROPIC_API_KEY del entorno (.env)
const app = express();
app.use(express.json({ limit: "8mb" })); // 8mb: las fotos del movil pesan

// CORS: permite que la pagina de voz hable con el backend aunque esten en
// origenes distintos (p.ej. la pagina en GitHub Pages y el backend en Railway).
// Para una herramienta personal de un solo usuario, permitir todo es suficiente.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Sirve la pagina de voz (public/index.html) en http://localhost:3000/
app.use(express.static(path.join(__dirname, "public")));

// --- Salud ---
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    modelo: MODELO,
    key: Boolean(process.env.ANTHROPIC_API_KEY),
    db: memoria.DB_PATH,
    volumen_persistente: Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH),
    volumen_ruta: process.env.RAILWAY_VOLUME_MOUNT_PATH || null,
  });
});

// --- Perfil y hechos (para rellenar la memoria a mano o desde el Paso 4) ---
app.get("/perfil", (_req, res) => res.json({ perfil: memoria.getPerfil() }));

app.post("/perfil", (req, res) => {
  const { clave, valor } = req.body || {};
  if (typeof clave !== "string" || typeof valor !== "string" || !clave.trim()) {
    return res.status(400).json({ error: 'Falta "clave" y "valor" (strings).' });
  }
  memoria.setPerfil(clave.trim(), valor);
  res.json({ ok: true, perfil: memoria.getPerfil() });
});

app.get("/hechos", (_req, res) => res.json({ hechos: memoria.listHechos() }));

app.post("/hecho", (req, res) => {
  const { texto } = req.body || {};
  if (typeof texto !== "string" || !texto.trim()) {
    return res.status(400).json({ error: 'Falta "texto" (string no vacio).' });
  }
  const id = memoria.addHecho(texto.trim());
  res.json({ ok: true, id });
});

app.get("/notas", (_req, res) => res.json({ notas: memoria.listNotas() }));

// --- Voz: genera el audio en el servidor (voz Andres de Guatemala) ---
// Asi suena igual en TODOS los dispositivos, movil incluido: los navegadores
// moviles bloquean la voz del navegador, pero un audio normal si se reproduce.
// Usa el servicio gratuito de Edge (Microsoft), sin llave.
let _ttsMod = null;
async function cargarTTS() { if (!_ttsMod) _ttsMod = await import("msedge-tts"); return _ttsMod; }
const VOZ = process.env.JARVIS_VOZ || "es-GT-AndresNeural";

// Reutilizamos la conexion por voz: evita el saludo (handshake) en cada turno,
// que era lo que anadia latencia. Si la conexion murio, se recrea al vuelo.
const _ttsCache = new Map();
async function obtenerTTS(voz) {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await cargarTTS();
  if (!_ttsCache.has(voz)) {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voz, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    _ttsCache.set(voz, tts);
  }
  return _ttsCache.get(voz);
}

app.get("/voz", async (req, res) => {
  const texto = String(req.query.t || "").slice(0, 1200).trim();
  if (!texto) return res.status(400).end();
  // Voz elegida por el cliente (?v=), validada; si no encaja, la de por defecto.
  let voz = String(req.query.v || "").trim();
  if (!/^es-[A-Z]{2}-[A-Za-z]+Neural$/.test(voz)) voz = VOZ;
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-store");
  try {
    let audioStream;
    try {
      audioStream = (await obtenerTTS(voz)).toStream(texto).audioStream;
    } catch (e1) {
      _ttsCache.delete(voz); // conexion muerta: recrear una vez
      audioStream = (await obtenerTTS(voz)).toStream(texto).audioStream;
    }
    audioStream.pipe(res);
    audioStream.on("error", () => { try { res.end(); } catch (e) {} });
  } catch (e) {
    console.error("[JARVIS] Error de voz:", e.message);
    if (!res.headersSent) res.status(502).end(); else res.end();
  }
});

// --- Herramientas: Claude elige cual usar segun lo que diga Franco ---
const TOOLS = [
  // Busqueda web (servidor de Anthropic): datos actuales, noticias, precios...
  { type: "web_search_20260209", name: "web_search", max_uses: 3 },
  {
    name: "crear_nota",
    description:
      "Guarda una nota o recordatorio del senor Franco. Usala cuando pida apuntar, " +
      "anotar, recordar o dejar constancia de una tarea, idea o decision.",
    input_schema: {
      type: "object",
      properties: {
        texto: { type: "string", description: "El contenido de la nota, en las palabras del senor Franco." },
        proyecto: { type: "string", description: "Proyecto al que pertenece si lo menciona (p.ej. B'Live). Opcional." },
      },
      required: ["texto"],
    },
  },
  {
    name: "buscar_memoria",
    description:
      "Busca en la memoria de JARVIS (notas, hechos y conversaciones pasadas). Usala cuando " +
      "el senor Franco pregunte que dijo, que decidio, o que habia apuntado sobre algo.",
    input_schema: {
      type: "object",
      properties: {
        consulta: { type: "string", description: "Palabras clave de lo que se busca." },
      },
      required: ["consulta"],
    },
  },
];

function ejecutarHerramienta(nombre, input) {
  try {
    if (nombre === "crear_nota") {
      const id = memoria.addNota(input.texto, input.proyecto || null);
      return `Nota guardada correctamente (id ${id}).`;
    }
    if (nombre === "buscar_memoria") {
      const encontrado = memoria.buscarMemoria(input.consulta);
      if (encontrado.length === 0) return "No hay nada en la memoria sobre eso.";
      return encontrado.map((r) => `[${r.tipo} - ${r.fecha}] ${r.texto}`).join("\n");
    }
    return "Herramienta desconocida.";
  } catch (e) {
    return "Error al ejecutar la herramienta: " + e.message;
  }
}

// --- El endpoint principal ---
app.post("/chat", async (req, res) => {
  const { mensaje } = req.body || {};

  if (typeof mensaje !== "string" || mensaje.trim() === "") {
    return res
      .status(400)
      .json({ error: 'Falta "mensaje" (string no vacio) en el cuerpo.' });
  }

  // Contexto que se inyecta: perfil completo (es corto) + ultimos 10 turnos.
  // NUNCA todo el historial. El historial vive en SQLite, no lo manda el cliente.
  const previos = memoria.ultimosTurnos();
  const messages = [...previos, { role: "user", content: mensaje }];

  // El system prompt y el perfil no cambian entre llamadas -> prompt caching.
  const perfilTexto = memoria.renderPerfil();
  const systemTexto = perfilTexto
    ? `${SYSTEM_PROMPT}\n\n# Lo que se del senor Franco (perfil)\n${perfilTexto}`
    : SYSTEM_PROMPT;

  try {
    const inicio = Date.now();

    // Bucle de herramientas: Claude decide si usa alguna. Si la usa, la ejecutamos
    // y le devolvemos el resultado, hasta que da su respuesta final. El limite de
    // vueltas es una red de seguridad para que nunca se quede en bucle.
    let respuestaApi;
    const herramientasUsadas = [];
    for (let vuelta = 0; vuelta < 6; vuelta++) {
      respuestaApi = await anthropic.messages.create({
        model: MODELO,
        max_tokens: 1024,
        system: [{ type: "text", text: systemTexto, cache_control: { type: "ephemeral" } }],
        // Latencia por encima de funciones: sin extended thinking y effort bajo.
        thinking: { type: "disabled" },
        output_config: { effort: "low" },
        tools: TOOLS,
        messages,
      });

      // Herramienta de servidor (p.ej. busqueda web) que sigue trabajando: continuar.
      if (respuestaApi.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: respuestaApi.content });
        continue;
      }
      if (respuestaApi.stop_reason !== "tool_use") break;

      // Claude pidio una o varias herramientas nuestras: ejecutarlas y devolver resultados.
      messages.push({ role: "assistant", content: respuestaApi.content });
      const resultados = [];
      for (const bloque of respuestaApi.content) {
        if (bloque.type === "tool_use") {
          herramientasUsadas.push(bloque.name);
          const salida = ejecutarHerramienta(bloque.name, bloque.input);
          resultados.push({ type: "tool_result", tool_use_id: bloque.id, content: salida });
        }
      }
      messages.push({ role: "user", content: resultados });
    }

    const ms = Date.now() - inicio;

    if (respuestaApi.stop_reason === "refusal") {
      return res.status(200).json({
        respuesta: "Disculpe, senor Franco, no puedo atender esa peticion.",
        pantalla: null,
        _meta: { ms, stop_reason: "refusal" },
      });
    }

    const respuesta = respuestaApi.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // Guardar el turno en la memoria: primero lo que dijo Franco, luego JARVIS.
    memoria.guardarTurno("user", mensaje);
    memoria.guardarTurno("assistant", respuesta);

    res.json({
      respuesta,
      pantalla: null, // sin herramientas ni pantallas todavia (eso es el Paso 4)
      _meta: {
        ms,
        modelo: MODELO,
        turnos_inyectados: previos.length,
        herramientas: herramientasUsadas,
        tokens: {
          entrada: respuestaApi.usage.input_tokens,
          salida: respuestaApi.usage.output_tokens,
          cache_lectura: respuestaApi.usage.cache_read_input_tokens,
          cache_escritura: respuestaApi.usage.cache_creation_input_tokens,
        },
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("[JARVIS] API key invalida:", error.message);
      return res.status(401).json({ error: "API key invalida o ausente." });
    }
    if (error instanceof Anthropic.RateLimitError) {
      console.error("[JARVIS] Rate limit:", error.message);
      return res.status(429).json({ error: "Limite de peticiones, reintente en un momento." });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[JARVIS] Error de la API (${error.status}):`, error.message);
      return res.status(502).json({ error: `Error de la API de Claude: ${error.message}` });
    }
    console.error("[JARVIS] Error inesperado:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// --- Vision: analizar una foto de la camara del movil ---
app.post("/ver", async (req, res) => {
  const { imagen, mensaje } = req.body || {};
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(String(imagen || ""));
  if (!m) return res.status(400).json({ error: "Falta la imagen." });
  const media_type = m[1];
  const data = m[2];
  const pregunta =
    typeof mensaje === "string" && mensaje.trim()
      ? mensaje.trim()
      : "Que ves en esta imagen? Identificalo y dime lo relevante para el senor Franco, breve.";

  const previos = memoria.ultimosTurnos();
  const perfilTexto = memoria.renderPerfil();
  const systemTexto = perfilTexto
    ? `${SYSTEM_PROMPT}\n\n# Lo que se del senor Franco (perfil)\n${perfilTexto}`
    : SYSTEM_PROMPT;

  try {
    const inicio = Date.now();
    const r = await anthropic.messages.create({
      model: MODELO,
      max_tokens: 1024,
      system: [{ type: "text", text: systemTexto, cache_control: { type: "ephemeral" } }],
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      messages: [
        ...previos,
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type, data } },
            { type: "text", text: pregunta },
          ],
        },
      ],
    });
    const ms = Date.now() - inicio;
    const respuesta = r.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    memoria.guardarTurno("user", "[le mostre una imagen] " + pregunta);
    memoria.guardarTurno("assistant", respuesta);
    res.json({ respuesta, _meta: { ms } });
  } catch (e) {
    console.error("[JARVIS] Error de vision:", e.message);
    res.status(502).json({ error: "No pude analizar la imagen." });
  }
});

app.listen(PORT, () => {
  console.log(`[JARVIS] Escuchando en http://localhost:${PORT}  (modelo: ${MODELO})`);
  console.log(`[JARVIS] Memoria en: ${memoria.DB_PATH}`);
});
