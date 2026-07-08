# 💡 Backlog de ideas

Ideas candidatas a convertirse en experimentos. La idea madre es el **motor de
predicción por simulación multi-agente** (Cerebras + MindContextIA + VForge).
De ahí salen verticales:

| #  | Idea                         | Nicho                    | Estado        |
|----|------------------------------|--------------------------|---------------|
| 1  | Oráculo de Decisiones B2B    | Empresas                 | 🟢 exp. 001   |
| 2  | Sala de Guerra de Opinión    | PR / política            | 💡 idea       |
| 3  | Escenarios Financieros       | Inversores               | 💡 idea       |
| 4  | Forge de Historias Vivas     | Escritores / guionistas  | 💡 idea       |
| 5  | A/B Testing Sintético        | Product / growth         | 💡 idea       |
| 6  | Pre-mortem de Startups       | Founders / aceleradoras  | 💡 idea       |
| 7  | Simulador de Negociaciones   | Coaching                 | 💡 idea       |
| 8  | Gemelo Digital de Comunidad  | Gobierno / urbanismo     | 💡 idea       |
| 9  | Second Brain Predictivo      | Consumer                 | 💡 idea       |
| 10 | Motor de NPCs Vivos          | Juegos / educación       | 💡 idea       |

## Diferenciales del ecosistema

- **⚡ Cerebras** → inferencia ~rápida y barata. Resuelve el cuello de botella
  de costo de token que hace inviable a MiroFish para simulaciones grandes.
- **🧠 MindContextIA** → memoria persistente para que los agentes recuerden y
  evolucionen entre corridas.
- **🔨 VForge** → capa de producto (auth, pagos, UI) para empaquetar lo que
  funcione.

## Cómo priorizar

Antes de construir de más, validar. Señal real = alguien **usa y vuelve**, o
**intenta pagar**. Ver la filosofía de graduación en [`LAB.md`](LAB.md).

---

## Memoria real de agentes (fase MindContextIA)

**Estado actual (exp. 001):** la "memoria" de cada agente solo guarda entradas
tipo `"ronda N: postura"`. Es **cosmética**: no captura *por qué* opinó, no
sobrevive entre simulaciones y no alimenta razonamiento futuro. Sirve para el
prototipo, pero no es memoria de verdad.

**Diseño futuro (la pieza que se vuelve feature de MindContextIA):**

1. **Extraer hechos** de las razones de cada agente. En vez de guardar la
   postura, pasar la `razon` por un extractor (heurístico o LLM) que produzca
   hechos atómicos, p.ej.:
   - `"le importa el precio por encima de features"`
   - `"desconfía de lanzamientos apurados"`
2. **Persistir en Neon (Postgres).** Dos tablas:
   - `paradox_agents` — identidad y personalidad estable del agente
     (`id`, `nombre`, `rol`, rasgos, `created_at`).
   - `paradox_facts` — hechos acumulados por agente
     (`id`, `agent_id` → `paradox_agents`, `hecho`, `escenario`, `ronda`,
     `confianza`, `created_at`).
3. **Rehidratar entre corridas.** Al iniciar una simulación, cargar los hechos
   previos del agente y meterlos en el prompt/heurística → la memoria
   **sobrevive** entre escenarios y el agente "evoluciona".

**Por qué importa:** esto es exactamente la capa de memoria/contexto que
**MindContextIA** quiere ofrecer como producto. El motor de predicción de
Paradox se vuelve el primer consumidor real de esa memoria: si funciona aquí,
se gradúa a MindContextIA como feature (memoria persistente de agentes/entidades).

> Pendiente de implementación — no está en el código todavía. Es el próximo
> salto de 001 hacia un motor con memoria real.
