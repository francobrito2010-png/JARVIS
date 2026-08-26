# JARVIS — Backend (Paso 1)

El cerebro, sin interfaz. Un solo endpoint que recibe texto y devuelve texto.

## Arrancar

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea el archivo `.env` (copia de `.env.example`) y pega tu key:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Levanta el servidor:
   ```bash
   npm start
   ```
   Debe verse: `[JARVIS] Escuchando en http://localhost:3000`

## Probar con curl

Comprobar que está vivo:
```bash
curl http://localhost:3000/health
```

Hablar con JARVIS:
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"mensaje\":\"Preséntate en una frase\"}"
```

Con historial (varios turnos):
```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"mensaje\":\"¿Qué te acabo de preguntar?\",\"historial\":[{\"role\":\"user\",\"content\":\"Hola\"},{\"role\":\"assistant\",\"content\":\"Buenas, señor Franco.\"}]}"
```

## Contrato del endpoint

```
POST /chat
  entrada:  { mensaje: string, historial?: [{ role, content }] }
  salida:   { respuesta: string, pantalla: null, _meta: { ms, tokens, ... } }
```

`_meta.ms` es la latencia real de la llamada a la API — el criterio de salida del Paso 1
es que suene a JARVIS y responda en menos de 1,5 s.

## Qué NO hay aquí (a propósito)

- Memoria / Firestore → **Paso 2**
- Voz → **Paso 3**
- Herramientas (tool use) y `pantalla` → **Paso 4**
