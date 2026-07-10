# 002 · Sinergias

Motor de descubrimiento de **conexiones no obvias** entre personas de un círculo.
Toma perfiles que cada quien **declaró voluntariamente** (opt-in), los cruza, y
propone quién debería conocer a quién — sobre todo los matches que nadie vio.

## Principio de diseño (no negociable)

La entrada son **perfiles declarados con consentimiento explícito**. No hay
scraping ni ingesta automática de redes de terceros. Cada perfil trae un bloque
`consentimiento`, y el motor **descarta de entrada** a cualquiera con
`autorizado: false`. El conteo de descartados sale en el resumen, como evidencia
de que el guard corrió.

La capa `contexto` (señales públicas de mercado: temas, tendencias, fuentes de
interés) solo **refuerza** conexiones — nunca perfila individuos.

## Cómo corre

```bash
npm install
npm run sim            # corre el escenario scenarios/ejemplo.json
npm run sim otro       # corre scenarios/otro.json
npm run typecheck      # valida tipos sin compilar
```

Corre **offline y determinista** — sin API keys. Mismo espíritu que el 001.

## Qué busca el motor

- **Directo:** comparten objetivos o intereses.
- **Complementario (no obvio):** lo que uno *busca* es justo lo que el otro
  *ofrece*, aunque no compartan intereses. Estos pesan más — son el oro.

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

🟢 corre · determinista · siguiente paso: enchufar a Cerebras para que redacte
las razones y detecte matches semánticos (no solo por coincidencia exacta).
