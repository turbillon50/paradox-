# 🧪 Paradox — Laboratorio de ideas

> Un espacio para prototipar rápido, probar hipótesis y descubrir qué merece
> convertirse en producto. Cada idea vive aislada en `experiments/` y se puede
> correr sola, sin romper a las demás.

Paradox no es *un* producto. Es el taller donde nacen los productos de
[VForge](https://github.com/turbillon50/vforge) y
[MindContextIA](https://github.com/turbillon50/mindcontextia): aquí se
experimenta barato, y lo que demuestra tracción se gradúa a su propio repo.

---

## 🎯 Filosofía

1. **Correr desde el día 1.** Todo experimento debe ejecutarse con un comando,
   idealmente *offline* (sin API keys) para que cualquiera lo pruebe en segundos.
2. **Aislado.** Un experimento roto nunca tumba a otro. Carpeta propia,
   dependencias propias.
3. **Barato de tirar.** Si una idea no convence, se archiva sin culpa. El valor
   es el aprendizaje, no el código.
4. **De laboratorio a producto.** Lo que funciona se documenta y se gradúa.

## 🧬 Idea madre: motor de predicción

El primer experimento (`experiments/001-oraculo`) es un **motor de simulación
multi-agente**: poblás un mundo con agentes que tienen personalidad y memoria,
les inyectás un escenario semilla y observás cómo reaccionan para *predecir*
resultados. Inspirado en la idea de [MiroFish](https://github.com/666ghj/MiroFish),
pero pensado desde el arranque para correr sobre **inferencia rápida y barata
(Cerebras)** y apoyarse en la memoria de **MindContextIA**.

## 🗂️ Estructura

```
paradox-/
├── README.md            ← estás aquí
├── CLAUDE.md            ← contexto del repo para sesiones de Claude Code
├── docs/
│   ├── LAB.md           ← cómo funciona el laboratorio y cómo agregar experimentos
│   └── IDEAS.md         ← backlog de ideas y su estado
└── experiments/
    └── 001-oraculo/     ← motor de simulación multi-agente (corre offline)
```

## 🚀 Probar el primer experimento

```bash
cd experiments/001-oraculo
npm install
npm run sim        # corre offline con un fallback determinista
```

Para enchufarlo a un LLM real (Cerebras u otro compatible con OpenAI):

```bash
cp .env.example .env      # y completá LLM_API_KEY / LLM_BASE_URL
npm run sim
```

## 📇 Índice de experimentos

| ID  | Nombre    | Estado        | Qué explora                                      |
|-----|-----------|---------------|--------------------------------------------------|
| 001 | Oráculo   | 🟢 corre      | Simulación multi-agente para predecir escenarios |

> ¿Cómo agregar el tuyo? Mirá [`docs/LAB.md`](docs/LAB.md).
