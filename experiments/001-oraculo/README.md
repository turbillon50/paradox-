# 🔮 Experimento 001 — Oráculo

Motor de **simulación multi-agente** para predecir cómo se recibiría un escenario.
Poblás un mundo con agentes que tienen personalidad y memoria, les inyectás un
escenario semilla y observás cómo evolucionan sus posturas ronda a ronda para
obtener una **predicción** con nivel de confianza.

Es la versión mínima y propia de la idea de
[MiroFish](https://github.com/666ghj/MiroFish), pensada para correr sobre
**Cerebras** (rápido y barato) y, más adelante, apoyarse en la memoria de
**MindContextIA**.

## Estado: 🟢 corre (offline y con LLM)

## Cómo correrlo

```bash
npm install

# Offline, determinista, sin API keys:
npm run sim

# Con un escenario propio y más población:
npm run sim -- scenarios/lanzamiento-mercado.json --agentes 16 --rondas 4
```

Para usar un LLM real (Cerebras u otro compatible con OpenAI):

```bash
cp .env.example .env    # completá LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
npm run sim
```

## Cómo funciona

1. **Población** (`agents.ts`): genera N agentes deterministas con 4 rasgos
   (apertura, escepticismo, tolerancia al riesgo, sociabilidad) y un rol.
2. **Rondas** (`engine.ts`): en cada ronda, cada agente toma una postura
   (a favor / en contra / neutral). Dos modos:
   - **offline**: heurística interpretable que combina personalidad + riesgo/novedad
     del escenario + presión de la mayoría de la ronda anterior (conformismo).
   - **llm**: cada agente "razona" su postura vía el modelo y devuelve JSON.
3. **Memoria**: cada agente recuerda lo que hizo en rondas previas.
4. **Agregación**: se calcula favorabilidad (-1..+1), confianza y un veredicto.

## Formato de escenario (JSON)

```json
{
  "titulo": "...",
  "descripcion": "...",
  "pregunta": "...",
  "nivelRiesgo": 0.5,
  "nivelNovedad": 0.5
}
```

## Qué se aprende con esto

- Que un motor de simulación útil **no necesita ser caro**: la versión offline
  ya muestra dinámicas de opinión (conformismo, polarización) sin gastar tokens.
- El costo real aparece en modo LLM → ahí es donde **Cerebras** hace la
  diferencia frente al enfoque original de MiroFish.

## Próximos pasos

- [ ] Conectar memoria persistente (MindContextIA) entre corridas.
- [ ] Modo LLM por lotes para bajar latencia/costo.
- [ ] Exportar reporte a JSON/Markdown para consumir desde VForge.
- [ ] Escenarios con opciones múltiples (no solo a favor/en contra).
