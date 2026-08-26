// JARVIS - Memoria (Paso 2)
// SQLite en un archivo local. Decision de Franco: no Firestore.
// Motivo: un solo usuario, menor latencia y menos piezas que puedan fallar.
//
// Guardamos tres cosas:
//   perfil          -> quien es, preferencias, idiomas, horarios (clave/valor)
//   hechos          -> datos sueltos que va diciendo, con fecha
//   conversaciones  -> el historial completo, buscable
//
// Regla de inyeccion en cada llamada (ver server.js): perfil completo + ultimos
// 10 turnos. NUNCA todo el historial (dispara coste y latencia).

const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");

// Ruta del archivo SQLite. En Railway, el volumen persistente expone su carpeta
// en la variable RAILWAY_VOLUME_MOUNT_PATH; usamos esa carpeta automaticamente
// para que la memoria sobreviva a los reinicios, sea cual sea la ruta de montaje.
// En local (sin volumen) cae en ./data/jarvis.db. JARVIS_DB_PATH permite forzar
// una ruta concreta si hiciera falta.
const CARPETA_DATOS =
  process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, "data");
const DB_PATH =
  process.env.JARVIS_DB_PATH || path.join(CARPETA_DATOS, "jarvis.db");

// Asegurar que la carpeta del archivo existe antes de abrirlo.
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;"); // mejor rendimiento en lecturas/escrituras

// --- Esquema ---
db.exec(`
  CREATE TABLE IF NOT EXISTS perfil (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS hechos (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    texto  TEXT NOT NULL,
    fecha  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS conversaciones (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    rol       TEXT NOT NULL,   -- 'user' | 'assistant'
    contenido TEXT NOT NULL,
    fecha     TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notas (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    texto    TEXT NOT NULL,
    proyecto TEXT,
    fecha    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Cuantos mensajes previos se inyectan como contexto en cada llamada.
const N_TURNOS = 10;

// --- Perfil ---
function setPerfil(clave, valor) {
  db.prepare(
    `INSERT INTO perfil (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`
  ).run(String(clave), String(valor));
}

function getPerfil() {
  return db.prepare("SELECT clave, valor FROM perfil ORDER BY clave").all();
}

// El perfil es corto: se renderiza entero como texto para meterlo en el system prompt.
function renderPerfil() {
  const filas = getPerfil();
  if (filas.length === 0) return "";
  return filas.map((f) => `- ${f.clave}: ${f.valor}`).join("\n");
}

// --- Hechos ---
function addHecho(texto) {
  const info = db.prepare("INSERT INTO hechos (texto) VALUES (?)").run(String(texto));
  return Number(info.lastInsertRowid);
}

function listHechos(limite = 50) {
  return db
    .prepare("SELECT id, texto, fecha FROM hechos ORDER BY id DESC LIMIT ?")
    .all(limite);
}

// Busqueda simple por texto (la usara el Paso 4: buscar_memoria).
function buscarHechos(consulta, limite = 20) {
  return db
    .prepare(
      "SELECT id, texto, fecha FROM hechos WHERE texto LIKE ? ORDER BY id DESC LIMIT ?"
    )
    .all(`%${consulta}%`, limite);
}

// --- Conversaciones ---
function guardarTurno(rol, contenido) {
  db.prepare("INSERT INTO conversaciones (rol, contenido) VALUES (?, ?)").run(
    rol,
    String(contenido)
  );
}

// Devuelve los ultimos N turnos en orden cronologico, con el formato que espera
// la API de Claude: [{ role, content }].
function ultimosTurnos(n = N_TURNOS) {
  const filas = db
    .prepare(
      "SELECT rol, contenido FROM conversaciones ORDER BY id DESC LIMIT ?"
    )
    .all(n);
  return filas
    .reverse()
    .map((f) => ({ role: f.rol, content: f.contenido }));
}

// --- Notas (las crea la herramienta crear_nota del Paso 4) ---
function addNota(texto, proyecto = null) {
  const info = db
    .prepare("INSERT INTO notas (texto, proyecto) VALUES (?, ?)")
    .run(String(texto), proyecto ? String(proyecto) : null);
  return Number(info.lastInsertRowid);
}

function listNotas(limite = 50) {
  return db
    .prepare("SELECT id, texto, proyecto, fecha FROM notas ORDER BY id DESC LIMIT ?")
    .all(limite);
}

// --- Busqueda global (la usa la herramienta buscar_memoria) ---
// Rastrea notas, hechos y conversaciones. Devuelve [{ tipo, texto, fecha }].
function buscarMemoria(consulta, limite = 15) {
  const q = `%${consulta}%`;
  const notas = db
    .prepare("SELECT texto, proyecto, fecha FROM notas WHERE texto LIKE ? ORDER BY id DESC LIMIT ?")
    .all(q, limite)
    .map((r) => ({ tipo: "nota", texto: r.proyecto ? `[${r.proyecto}] ${r.texto}` : r.texto, fecha: r.fecha }));
  const hechos = db
    .prepare("SELECT texto, fecha FROM hechos WHERE texto LIKE ? ORDER BY id DESC LIMIT ?")
    .all(q, limite)
    .map((r) => ({ tipo: "hecho", texto: r.texto, fecha: r.fecha }));
  const convs = db
    .prepare("SELECT contenido, fecha FROM conversaciones WHERE contenido LIKE ? ORDER BY id DESC LIMIT ?")
    .all(q, limite)
    .map((r) => ({ tipo: "conversacion", texto: r.contenido, fecha: r.fecha }));
  return [...notas, ...hechos, ...convs].slice(0, limite);
}

module.exports = {
  DB_PATH,
  N_TURNOS,
  setPerfil,
  getPerfil,
  renderPerfil,
  addHecho,
  listHechos,
  buscarHechos,
  guardarTurno,
  ultimosTurnos,
  addNota,
  listNotas,
  buscarMemoria,
};
