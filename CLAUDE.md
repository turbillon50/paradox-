# Paradox — Contexto de proyecto para Claude Code
# Tipo: Laboratorio de ideas (monorepo de experimentos)
# Repo: turbillon50/paradox- | Dueño: Luis (dluisdelatorre@gmail.com)
# Ecosistema hermano: turbillon50/vforge, turbillon50/mindcontextia

---
## 🚨 QUÉ ES ESTE REPO (léelo primero)

Paradox es un **laboratorio**, no un producto. Sirve para prototipar ideas
rápido y aislado. Cada experimento vive en su propia carpeta bajo
`experiments/NNN-nombre/`, se corre solo y no depende de los demás.

**Regla de oro:** un experimento debe poder correr con UN comando y, de ser
posible, *sin API keys* (fallback offline). Nada de "primero configura 5
servicios". La fricción mata al laboratorio.

## 🧭 CÓMO TRABAJAR AQUÍ

- ¿Idea nueva? → carpeta nueva en `experiments/`, no toques las existentes.
- ¿Experimento roto? → se arregla o se archiva, pero NO puede tumbar a otros.
- ¿Algo funcionó y tiene tracción? → se documenta y se gradúa a su propio repo
  (probablemente integrado a VForge o MindContextIA).
- Idioma de docs y commits: español (es la lengua de Luis).

## 🗂️ ESTRUCTURA

```
paradox-/
├── docs/
│   ├── LAB.md        ← cómo agregar y graduar experimentos
│   └── IDEAS.md      ← backlog de ideas con su estado
└── experiments/
    └── 001-oraculo/  ← motor de simulación multi-agente (TS, corre offline)
```

## 🧬 CONTEXTO ESTRATÉGICO

La idea madre del lab es un **motor de predicción por simulación multi-agente**
(inspirado en MiroFish, github.com/666ghj/MiroFish), pero con dos diferenciales:

1. **Cerebras** para inferencia rápida y barata → resuelve el mayor dolor de
   MiroFish, que quema tokens carísimos.
2. **MindContextIA** como capa de memoria/contexto de los agentes.

VForge es la capa de producto donde eventualmente se empaqueta lo que funcione.

## 🛠️ STACK POR DEFECTO

- **TypeScript** ejecutado con `tsx` (sin build step para prototipar).
- Cliente LLM propio basado en `fetch`, compatible con OpenAI SDK → apunta a
  Cerebras (`https://api.cerebras.ai/v1`) u otro proveedor.
- Si un experimento necesita ML pesado, se permite Python en su carpeta.

## ⚙️ VARIABLES DE ENTORNO (por experimento)

- `LLM_API_KEY` — key de Cerebras u otro proveedor compatible con OpenAI.
- `LLM_BASE_URL` — ej. `https://api.cerebras.ai/v1` (default en el código).
- `LLM_MODEL` — ej. `llama-3.3-70b`.
- Sin estas variables, los experimentos corren con fallback determinista.

## ✅ CONVENCIONES

- Numeración de experimentos: `001`, `002`, ... con nombre corto en kebab-case.
- Cada experimento trae su propio `README.md` con: qué explora, cómo correrlo,
  qué se aprendió, y su estado (🟢 corre / 🟡 en progreso / 🔴 archivado).
- Rama de desarrollo actual: `claude/paradox-repo-analysis-o7mfnn`.
