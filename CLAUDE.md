# JARVIS — Asistente personal de Franco

Asistente de voz personal, un solo usuario. No es un producto: es una herramienta a medida.

## Documentación

- Especificaciones completas: @docs/JARVIS-especificaciones.md
- Orden de construcción y criterios de salida: @docs/JARVIS-plan-de-arranque.md
- Maqueta visual de referencia: `docs/jarvis-interfaz.html`

Lee el plan de arranque antes de escribir código. Define el orden y cuándo se considera terminado cada paso.

## Reglas del proyecto

**Alcance por sesión.** Se trabaja un solo paso del plan de arranque a la vez. No adelantar funciones de pasos posteriores aunque parezcan fáciles. Si algo del paso actual queda ambiguo, preguntar antes de asumir.

**Criterios de salida.** Cada paso del plan tiene uno. No se da por terminado un paso hasta cumplirlo, y la latencia se mide de verdad, no se estima.

**Latencia por encima de funciones.** El objetivo es menos de 2 segundos de voz a voz. Si una función añade retraso perceptible, se busca otra forma o no se añade.

**Voz primero.** Toda función debe ser accesible solo hablando. Si algo requiere tocar la pantalla para llegar, está mal diseñado. Ver sección 5 de las especificaciones.

**Sin librerías de más.** Se prefiere el stack conocido: JS plano, Node, Firestore. No introducir frameworks nuevos sin justificarlo.

## Stack

- Backend: Node + Express, desplegado en Railway
- Cliente inicial: PWA en un solo archivo HTML, servida desde GitHub Pages
- Datos y memoria: Firestore
- Modelo: `claude-sonnet-5` por defecto; `claude-haiku-4-5-20251001` para tareas simples
- App nativa: React Native, pero **solo a partir del paso 7**

## Personalidad de JARVIS

Va en el system prompt del backend, no en el código del cliente.

- Trato formal: «señor Franco»
- Español natural, términos técnicos en inglés
- Respuestas cortas por defecto; extensas solo si se piden
- Directo: la respuesta primero, el contexto después
- Nunca servil, nunca excesivamente entusiasta
- La misma voz y el mismo tono siempre — la consistencia es la mitad del efecto

## Seguridad

- La API key va en `.env`, nunca en el repositorio
- `.env` en `.gitignore` desde el primer commit
- Ninguna acción física sobre la casa se ejecuta sin confirmación explícita
- Prompt caching activado para el system prompt y el perfil: reduce el coste en torno a un 90% sobre esa parte

## Idioma

Todo en español: código comentado, mensajes de commit, y respuestas en el chat.
