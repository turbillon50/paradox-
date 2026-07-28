# 003 · Teorías con pulso

Liga paradox con Pulso Neutro (https://pulso-neutro.vercel.app): una teoría se descompone en temas rastreables y cada día se mide su pulso real en 6 plataformas. La evidencia se acumula como serie de tiempo en `datos/`.

## Método
1. Una teoría vive en `teorias/*.json`: enunciado + hipótesis + temas medibles.
2. `medir.py` consulta `/api/medir` de Pulso Neutro por cada tema y guarda `datos/{teoria}/{fecha}.json`.
3. Con días acumulados se leen señales: índice neutro subiendo = la teoría gana tracción real; divergencia de Medios muy positiva con redes frías = narrativa institucional sin eco orgánico; TikTok/X calientes con Medios fríos = el terreno va adelante de la prensa.

## Caso 1: recuperación de Tulum
Teoría viva en `teorias/tulum-recuperacion.json`. Corre diario por cron en el Hetzner (rama de trabajo hasta el merge).

Regla de la casa: un número sin método no existe. Cada dato trae fecha, fuente y método en el JSON.
