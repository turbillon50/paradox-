// Tipos base del motor de simulación.

/** Rasgos de personalidad, cada uno en [0, 1]. */
export interface Personality {
  apertura: number;        // qué tan abierto a lo nuevo
  escepticismo: number;    // qué tan crítico/desconfiado
  toleranciaRiesgo: number;// qué tan cómodo con el riesgo
  sociabilidad: number;    // qué tanto lo arrastra la mayoría
}

export interface Agent {
  id: number;
  nombre: string;
  rol: string;
  personalidad: Personality;
  memoria: string[]; // lo que el agente "recuerda" de rondas previas
}

export type Postura = "a_favor" | "en_contra" | "neutral";

export interface Reaccion {
  agentId: number;
  postura: Postura;
  intensidad: number; // 0..1, qué tan fuerte es la postura
  razon: string;
}

export interface Escenario {
  titulo: string;
  descripcion: string;
  pregunta: string;
  /** Cuánto riesgo percibe el mercado en esto (0 = nada, 1 = altísimo). */
  nivelRiesgo?: number;
  /** Qué tan novedoso/disruptivo es (0 = trillado, 1 = totalmente nuevo). */
  nivelNovedad?: number;
}

export interface RondaResultado {
  ronda: number;
  reacciones: Reaccion[];
}

export interface Prediccion {
  titulo: string;
  totalAgentes: number;
  rondas: number;
  distribucion: Record<Postura, number>; // conteo final por postura
  favorabilidad: number; // -1 (todos en contra) .. +1 (todos a favor)
  confianza: number;     // 0..1, qué tan marcada/consistente es la tendencia
  veredicto: string;
  motor: "llm" | "offline";
  /** Reacciones que cayeron al fallback silencioso (solo modo LLM). */
  fallbacks: number;
}
