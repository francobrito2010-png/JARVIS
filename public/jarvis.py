#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JARVIS para Termux (Android / Oppo) — asistente de voz.

Flujo: escucha por tramos -> si oye "Jarvis" se activa -> graba tu orden ->
transcribe con Groq (Whisper) -> piensa con Claude (Anthropic) con herramientas
locales -> te responde por voz (termux-tts-speak).

Requisitos (ya instalados por el senor Franco):
  - Termux + Termux:API (desde F-Droid), paquete termux-api
  - Python 3, y:  pip install requests
  - Claves en el .bashrc (NO en el codigo):
        export ANTHROPIC_API_KEY="sk-ant-..."
        export GROQ_API_KEY="gsk_..."

Arranque:   python jarvis.py
Salir:      Ctrl + C
"""

import os
import sys
import json
import time
import base64
import subprocess
from datetime import datetime

import requests

# ---------------------------------------------------------------------------
# Configuracion
# ---------------------------------------------------------------------------
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
MODELO = os.environ.get("JARVIS_MODEL", "claude-sonnet-5")

HOME = os.path.expanduser("~")
REC = os.path.join(HOME, "jarvis_rec.m4a")       # audio temporal
FOTO = os.path.join(HOME, "jarvis_foto.jpg")     # foto temporal

# Palabras que cuentan como "Jarvis" (por si Whisper la oye raro)
DESPERTADORES = ["jarvis", "yarvis", "harvis", "charvis", "llavis", "jervis"]

SYSTEM_PROMPT = (
    "Eres JARVIS, el asistente personal de Franco, en su telefono. Trato formal: "
    "'senor Franco'. Espanol natural, terminos tecnicos en ingles. Nunca servil ni "
    "excesivamente entusiasta. Directo: la respuesta primero. Respuestas CORTAS (te "
    "escuchan por voz), una o dos frases salvo que pida mas. Si algo es ambiguo, "
    "pregunta. Tienes herramientas: hora, ubicacion, leer/enviar SMS, ver por la "
    "camara y busqueda web. Usa la que corresponda segun lo que diga el senor Franco."
)

# Historial corto para dar contexto (ultimos turnos)
historial = []
MAX_TURNOS = 8


# ---------------------------------------------------------------------------
# Utilidades de Termux (voz, camara, etc.)
# ---------------------------------------------------------------------------
def _run(cmd, timeout=30):
    """Ejecuta un comando de Termux y devuelve (codigo, salida_texto)."""
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout or "").strip()
    except Exception as e:
        return 1, str(e)


def grabar(segundos):
    """Graba 'segundos' de audio en REC (solo en ~/, /storage da EPERM)."""
    try:
        if os.path.exists(REC):
            os.remove(REC)
    except Exception:
        pass
    _run(["termux-microphone-record", "-f", REC], timeout=5)  # empieza a grabar
    time.sleep(segundos)
    _run(["termux-microphone-record", "-q"], timeout=5)        # detiene
    time.sleep(0.4)                                            # deja cerrar el archivo
    return REC if os.path.exists(REC) else None


def hablar(texto):
    """Dice el texto en voz alta."""
    texto = (texto or "").strip()
    if not texto:
        return
    print("JARVIS:", texto)
    _run(["termux-tts-speak", texto], timeout=60)


def transcribir(archivo):
    """Manda el audio a Groq (Whisper large-v3) y devuelve el texto."""
    if not archivo or not os.path.exists(archivo):
        return ""
    try:
        with open(archivo, "rb") as f:
            r = requests.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                files={"file": (os.path.basename(archivo), f, "audio/m4a")},
                data={"model": "whisper-large-v3", "language": "es"},
                timeout=60,
            )
        if r.status_code != 200:
            print("[Groq]", r.status_code, r.text[:200])
            return ""
        return (r.json().get("text") or "").strip()
    except Exception as e:
        print("[Groq] error:", e)
        return ""


# ---------------------------------------------------------------------------
# Herramientas locales (las ejecuta este script cuando Claude las pide)
# ---------------------------------------------------------------------------
def tool_decir_hora(_):
    ahora = datetime.now()
    dias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
    return f"{dias[ahora.weekday()]} {ahora.day}, {ahora.strftime('%H:%M')}."


def tool_ubicacion(_):
    code, out = _run(["termux-location"], timeout=40)
    if code != 0 or not out:
        return "No pude obtener la ubicacion."
    try:
        d = json.loads(out)
        return f"Latitud {d.get('latitude')}, longitud {d.get('longitude')}."
    except Exception:
        return out[:300]


def tool_leer_sms(inp):
    n = int(inp.get("cantidad", 5)) if isinstance(inp, dict) else 5
    code, out = _run(["termux-sms-list", "-l", str(n)], timeout=30)
    if code != 0 or not out:
        return "No pude leer los SMS (puede estar bloqueado por ColorOS)."
    try:
        msgs = json.loads(out)
        if not msgs:
            return "No hay SMS."
        return "\n".join(f"De {m.get('number','?')}: {m.get('body','')}" for m in msgs[:n])
    except Exception:
        return out[:400]


def tool_enviar_sms(inp):
    numero = str(inp.get("numero", "")).strip()
    texto = str(inp.get("texto", "")).strip()
    if not numero or not texto:
        return "Falta el numero o el texto."
    code, out = _run(["termux-sms-send", "-n", numero, texto], timeout=30)
    if code != 0:
        return "No pude enviar el SMS (probablemente bloqueado por ColorOS)."
    return "SMS enviado."


def tool_ver_camara(inp):
    """Toma una foto y pide a Claude que la describa."""
    pregunta = (inp.get("pregunta") if isinstance(inp, dict) else "") or \
        "Que ves en la imagen? Identificalo y di lo relevante, breve."
    try:
        if os.path.exists(FOTO):
            os.remove(FOTO)
    except Exception:
        pass
    code, _ = _run(["termux-camera-photo", "-c", "0", FOTO], timeout=30)
    if not os.path.exists(FOTO):
        return "No pude tomar la foto."
    with open(FOTO, "rb") as f:
        b64 = base64.standard_b64encode(f.read()).decode("ascii")
    cuerpo = {
        "model": MODELO,
        "max_tokens": 512,
        "system": SYSTEM_PROMPT,
        "thinking": {"type": "disabled"},
        "output_config": {"effort": "low"},
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64",
                 "media_type": "image/jpeg", "data": b64}},
                {"type": "text", "text": pregunta},
            ],
        }],
    }
    data = _claude(cuerpo)
    if not data:
        return "No pude analizar la foto."
    return _texto_de(data)


TOOLS_LOCALES = {
    "decir_hora": tool_decir_hora,
    "ubicacion": tool_ubicacion,
    "leer_sms": tool_leer_sms,
    "enviar_sms": tool_enviar_sms,
    "ver_camara": tool_ver_camara,
}

# Definicion de herramientas para Claude
TOOLS = [
    {"type": "web_search_20260209", "name": "web_search", "max_uses": 3},
    {"name": "decir_hora", "description": "Dice la fecha y hora actuales.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "ubicacion", "description": "Obtiene la ubicacion actual por GPS.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "leer_sms", "description": "Lee los ultimos SMS recibidos.",
     "input_schema": {"type": "object", "properties": {
         "cantidad": {"type": "integer", "description": "Cuantos leer (por defecto 5)."}}}},
    {"name": "enviar_sms", "description": "Envia un SMS a un numero.",
     "input_schema": {"type": "object", "properties": {
         "numero": {"type": "string"}, "texto": {"type": "string"}},
         "required": ["numero", "texto"]}},
    {"name": "ver_camara",
     "description": "Toma una foto con la camara trasera y responde sobre lo que ve.",
     "input_schema": {"type": "object", "properties": {
         "pregunta": {"type": "string", "description": "Que quiere saber de la imagen."}}}},
]


# ---------------------------------------------------------------------------
# Claude (Anthropic) por HTTP directo
# ---------------------------------------------------------------------------
def _claude(cuerpo):
    try:
        r = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            data=json.dumps(cuerpo),
            timeout=90,
        )
        if r.status_code != 200:
            print("[Claude]", r.status_code, r.text[:300])
            return None
        return r.json()
    except Exception as e:
        print("[Claude] error:", e)
        return None


def _texto_de(data):
    return "".join(b.get("text", "") for b in data.get("content", [])
                   if b.get("type") == "text").strip()


def agente(texto_usuario):
    """Bucle de agente: Claude decide, ejecutamos herramientas, hasta responder."""
    global historial
    mensajes = list(historial) + [{"role": "user", "content": texto_usuario}]

    respuesta_final = ""
    for _ in range(6):  # tope de vueltas
        data = _claude({
            "model": MODELO,
            "max_tokens": 1024,
            "system": SYSTEM_PROMPT,
            "thinking": {"type": "disabled"},
            "output_config": {"effort": "low"},
            "tools": TOOLS,
            "messages": mensajes,
        })
        if not data:
            return "Tuve un problema pensando, senor Franco."

        stop = data.get("stop_reason")
        if stop == "pause_turn":                     # busqueda web en curso
            mensajes.append({"role": "assistant", "content": data["content"]})
            continue
        if stop != "tool_use":                       # respuesta final
            respuesta_final = _texto_de(data)
            break

        # Claude pidio herramientas nuestras
        mensajes.append({"role": "assistant", "content": data["content"]})
        resultados = []
        for b in data["content"]:
            if b.get("type") == "tool_use":
                fn = TOOLS_LOCALES.get(b["name"])
                salida = fn(b.get("input", {})) if fn else "Herramienta desconocida."
                resultados.append({"type": "tool_result",
                                   "tool_use_id": b["id"], "content": str(salida)})
        mensajes.append({"role": "user", "content": resultados})

    # Guardar en historial (solo texto, recortado)
    historial.append({"role": "user", "content": texto_usuario})
    historial.append({"role": "assistant", "content": respuesta_final})
    historial = historial[-MAX_TURNOS * 2:]
    return respuesta_final or "Listo, senor Franco."


# ---------------------------------------------------------------------------
# Bucle principal: palabra clave "Jarvis"
# ---------------------------------------------------------------------------
def tras_despertador(texto):
    """Devuelve lo que se dijo DESPUES de 'jarvis', o '' si solo lo llamo."""
    bajo = texto.lower()
    for w in DESPERTADORES:
        i = bajo.find(w)
        if i != -1:
            resto = texto[i + len(w):].strip(" ,.:;-")
            return resto
    return ""


def main():
    if not ANTHROPIC_API_KEY or not GROQ_API_KEY:
        print("FALTAN CLAVES. Ponlas en el .bashrc:")
        print('  export ANTHROPIC_API_KEY="sk-ant-..."')
        print('  export GROQ_API_KEY="gsk_..."')
        print("Luego:  source ~/.bashrc   y vuelve a arrancar.")
        sys.exit(1)

    hablar("JARVIS operativo, senor Franco. Diga mi nombre cuando me necesite.")
    print("Escuchando... (di 'Jarvis' para activarme, Ctrl+C para salir)")

    while True:
        try:
            # 1) Escucha corta buscando la palabra clave
            grabar(4)
            oido = transcribir(REC)
            if not oido:
                continue
            print(">>", oido)
            if not any(w in oido.lower() for w in DESPERTADORES):
                continue

            # 2) Activado. ?Dijo la orden en la misma frase?
            orden = tras_despertador(oido)
            if not orden:
                hablar("Diga, senor.")
                grabar(6)
                orden = transcribir(REC)
            if not orden:
                continue

            print("Orden:", orden)
            # 3) Pensar y responder
            respuesta = agente(orden)
            hablar(respuesta)

        except KeyboardInterrupt:
            hablar("Hasta luego, senor Franco.")
            print("\nSaliendo.")
            break
        except Exception as e:
            print("[loop] error:", e)
            time.sleep(1)


if __name__ == "__main__":
    main()
