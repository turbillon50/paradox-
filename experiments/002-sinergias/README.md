# 002 · Sinergias

Motor de descubrimiento de **conexiones no obvias** entre personas de un círculo.
Toma perfiles que cada quien **declaró voluntariamente** (opt-in), los cruza, y
propone quién debería conocer a quién — sobre todo los matches que nadie vio.

## Principio de diseño (no negociable)

La entrada son **perfiles declarados con consentimiento explícito**. No hay
scraping ni ingesta automática de redes de terceros. Cada perfil trae un bloque
`consentimiento`, y el motor **descarta de entrada** a cualquiera con
`autorizado: false`. El conteo de descartados sale en el resumen, como evidencia
de que el guard corrió. Esto aplica en **ambos modos** (determinista y LLM).

La capa `contexto` (señales públicas de mercado: temas, tendencias, fuentes de
interés) solo **refuerza** conexiones — nunca perfila individuos.

## Dos modos

- **Determinista (default, offline):** cruza por coincidencia de términos
  normalizados. Sin API keys, reproducible.
- **Semántico (Cerebras):** si defines `LLM_API_KEY`, delega en un LLM que
  detecta matches por **significado** (p. ej. "levantar ronda semilla" ↔
  "inversionista ángel activo", aunque no compartan palabras). El guard de
  consentimiento se aplica **antes** de mandar nada al modelo, y solo se envían
  los perfiles autorizados. Ante cualquier falla (JSON inválido, red, id
  alucinado) cae al determinista.

## Cómo corre

```bash
npm install
npm run sim                 # escenario scenarios/ejemplo.json (determinista)
npm run sim otro            # scenarios/otro.json
npm run typecheck           # valida tipos sin compilar

# modo semántico:
cp .env.example .env        # completa LLM_API_KEY
npm run sim
```

## Qué busca el motor

- **Directo:** comparten objetivos o intereses.
- **Complementario (no obvio):** lo que uno *busca* es justo lo que el otro
  *ofrece*. Estos pesan más — son el oro. En modo semántico el match no necesita
  palabras iguales, basta que signifiquen lo mismo.

Salida ordenada por fuerza (0–1), con la razón explicada en claro.

## Formato del escenario

```jsonc
{
  "participantes": [
    {
      "id": "p1",
      "nombre": "Participante A",
      "objetivos": ["..."],       // qué busca / quiere lograr
      "intereses": ["..."],       // en qué anda
      "aportaciones": ["..."],    // qué puede ofrecer
      "consentimiento": { "autorizado": true, "fuente": "self", "fecha": "ISO" }
    }
  ],
  "contexto": [
    { "tema": "IA generativa", "señal": "...", "relevancia": 0.9 }
  ]
}
```

`fuente` es `self` (lo declaró la persona) o `delegado` (con autorización
explícita registrada).

## Estado

🟢 corre · determinista + semántico (Cerebras) · fallback duro al determinista.
