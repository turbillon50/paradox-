# 🧪 Cómo funciona el laboratorio

Paradox está pensado para que agregar una idea sea barato y correrla, trivial.

## Agregar un experimento nuevo

1. Crea una carpeta `experiments/NNN-nombre/` (siguiente número libre).
2. Adentro, incluye como mínimo:
   - `README.md` — qué explora, cómo correrlo, qué aprendiste, estado.
   - Un comando de arranque (`npm run <algo>` o `python main.py`).
3. Haz que **corra offline** si es posible (fallback sin API keys).
4. Registra el experimento en la tabla del `README.md` raíz y en `IDEAS.md`.

## Ciclo de vida de un experimento

```
💡 idea  →  🟡 en progreso  →  🟢 corre  →  📈 validado  →  🎓 graduado
                                    │
                                    └────────────→  🔴 archivado
```

- **🟢 corre**: se ejecuta y produce un resultado observable.
- **📈 validado**: hay señal real de mercado (gente lo usa / pagaría).
- **🎓 graduado**: se muda a su propio repo o se integra a VForge/MindContextIA.
- **🔴 archivado**: no convenció. Se deja el README con el aprendizaje y listo.

## Cómo graduar una idea

Cuando un experimento demuestra tracción:

1. Escribe en su `README.md` el aprendizaje y por qué se gradúa.
2. Extrae el código a su repo destino (o a un paquete dentro de VForge).
3. Marca 🎓 en la tabla y deja el experimento como referencia histórica.

## Principios

- **Aislamiento total.** Dependencias por experimento, nunca compartidas si eso
  crea acoplamiento frágil.
- **Cero setup ceremonioso.** Si arrancar toma más de 2 minutos, algo está mal.
- **Documentar el fracaso.** Un experimento archivado con un buen README vale
  más que uno exitoso sin explicación.
