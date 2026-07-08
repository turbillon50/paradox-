import type {
  Agent,
  Escenario,
  Postura,
  Prediccion,
  Reaccion,
  RondaResultado,
} from "./types.js";
import { crearRng, hashTexto } from "./rng.js";
import { chat, leerConfigLlm, type LlmConfig } from "./llm.js";

export interface OpcionesSim {
  agentes: number;
  rondas: number;
}

/** Convierte una favorabilidad continua [-1,1] en una postura discreta. */
function aPostura(favor: number): Postura {
  if (favor > 0.15) return "a_favor";
  if (favor < -0.15) return "en_contra";
  return "neutral";
}

/**
 * Calcula la favorabilidad de un agente con una heurística interpretable.
 * Combina personalidad, características del escenario y la presión de la mayoría
 * de la ronda anterior (conformismo social).
 */
function favorabilidadOffline(
  a: Agent,
  esc: Escenario,
  fraccionAFavorPrevia: number,
  rng: () => number,
): number {
  const riesgo = esc.nivelRiesgo ?? 0.5;
  const novedad = esc.nivelNovedad ?? 0.5;
  const p = a.personalidad;

  const brechaRiesgo = p.toleranciaRiesgo - riesgo; // ¿cómodo con este riesgo?
  const ajusteApertura = (p.apertura - 0.5) * 2 * novedad; // abiertos aman lo nuevo
  const ajusteEscepticismo = (p.escepticismo - 0.5) * 2; // escépticos frenan
  const presionPar = p.sociabilidad * (fraccionAFavorPrevia - 0.5) * 1.2;
  const ruido = (rng() - 0.5) * 0.15; // pizca de variabilidad reproducible

  const favor =
    0.45 * brechaRiesgo +
    0.35 * ajusteApertura -
    0.3 * ajusteEscepticismo +
    presionPar +
    ruido;

  return Math.max(-1, Math.min(1, favor));
}

function razonOffline(a: Agent, postura: Postura, esc: Escenario): string {
  const p = a.personalidad;
  if (postura === "a_favor") {
    return p.apertura > 0.6
      ? "le atrae la propuesta por novedosa"
      : "ve valor claro y el riesgo le parece manejable";
  }
  if (postura === "en_contra") {
    return p.escepticismo > 0.6
      ? "desconfía y no le convencen los beneficios"
      : "percibe el riesgo como demasiado alto";
  }
  return "no tiene una postura firme todavía";
}

// ---- Modo LLM ----

/** Marca de un agente que no obtuvo respuesta parseable del modelo. */
export const RAZON_FALLBACK = "(sin respuesta clara del modelo)";

async function reaccionLlm(
  cfg: LlmConfig,
  a: Agent,
  esc: Escenario,
  resumenPar: string,
): Promise<Reaccion> {
  const system =
    "Sos un agente en una simulación de opinión. Respondés SOLO con un JSON " +
    'válido: {"postura":"a_favor|en_contra|neutral","intensidad":0..1,"razon":"..."} ' +
    "sin texto extra.";
  const persona =
    `Personaje: ${a.nombre}, ${a.rol}. ` +
    `Apertura ${a.personalidad.apertura}, escepticismo ${a.personalidad.escepticismo}, ` +
    `tolerancia al riesgo ${a.personalidad.toleranciaRiesgo}, sociabilidad ${a.personalidad.sociabilidad}.`;
  const user =
    `${persona}\n\nEscenario: ${esc.titulo}. ${esc.descripcion}\n` +
    `Pregunta: ${esc.pregunta}\n${resumenPar}\n` +
    (a.memoria.length ? `Recordás: ${a.memoria.join("; ")}\n` : "") +
    "Respondé con tu postura en JSON.";

  // Hasta 3 intentos. Un parse inválido reintenta de inmediato; un error HTTP
  // 5xx (típico del router bajo carga) reintenta con espera 500-1500ms + jitter.
  const MAX_INTENTOS = 3;
  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    try {
      const texto = await chat(cfg, system, user);
      const json = JSON.parse(extraerJson(texto));
      if (!["a_favor", "en_contra", "neutral"].includes(json.postura)) {
        throw new Error("respuesta sin postura válida");
      }
      return {
        agentId: a.id,
        postura: json.postura as Postura,
        intensidad: clamp01(Number(json.intensidad) || 0.5),
        razon: String(json.razon || "").slice(0, 200),
      };
    } catch (e) {
      // Si aún quedan intentos y el error es 5xx, esperamos con jitter para
      // no golpear al router saturado. Otros errores reintentan de inmediato.
      if (intento < MAX_INTENTOS - 1 && esError5xx(e)) {
        await dormir(500 + Math.random() * 1000);
      }
    }
  }
  return { agentId: a.id, postura: "neutral", intensidad: 0.4, razon: RAZON_FALLBACK };
}

function extraerJson(texto: string): string {
  const i = texto.indexOf("{");
  const j = texto.lastIndexOf("}");
  return i >= 0 && j > i ? texto.slice(i, j + 1) : "{}";
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** ¿El error viene de un HTTP 5xx? (chat() codifica el status en el mensaje). */
function esError5xx(e: unknown): boolean {
  return e instanceof Error && /LLM 5\d\d/.test(e.message);
}

/**
 * Ejecuta `fn` sobre cada item con concurrencia LIMITADA (máximo `limite` en
 * vuelo a la vez). Preserva el orden de los resultados. Sin dependencias:
 * varios "workers" toman ítems de una cola compartida por índice.
 */
async function poolMap<T, R>(
  items: T[],
  limite: number,
  fn: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const resultados: R[] = new Array(items.length);
  let siguiente = 0;
  const worker = async () => {
    while (true) {
      const i = siguiente++;
      if (i >= items.length) return;
      resultados[i] = await fn(items[i], i);
    }
  };
  const n = Math.max(1, Math.min(limite, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return resultados;
}

// ---- Orquestador ----

export async function simular(
  esc: Escenario,
  opts: OpcionesSim,
  agentes: Agent[],
): Promise<{ prediccion: Prediccion; historial: RondaResultado[] }> {
  const cfg = leerConfigLlm();
  const usaLlm = cfg !== null;
  // Concurrencia limitada para no saturar routers con backlog corto / worker
  // único (evita 502 por avalancha de requests simultáneos).
  const limiteConcurrencia = Math.max(1, parseInt(process.env.LLM_CONCURRENCY || "3", 10) || 3);
  const rng = crearRng(hashTexto(esc.titulo) ^ (opts.agentes * 2654435761));

  const historial: RondaResultado[] = [];
  let fraccionAFavor = 0.5; // arranca neutral

  for (let ronda = 1; ronda <= opts.rondas; ronda++) {
    const resumenPar =
      ronda === 1
        ? "Nadie ha opinado aún."
        : `En la ronda previa, ${Math.round(fraccionAFavor * 100)}% de quienes opinaron se inclinó a favor.`;

    let reacciones: Reaccion[];
    if (usaLlm && cfg) {
      reacciones = await poolMap(agentes, limiteConcurrencia, (a) =>
        reaccionLlm(cfg, a, esc, resumenPar),
      );
    } else {
      reacciones = agentes.map((a) => {
        const favor = favorabilidadOffline(a, esc, fraccionAFavor, rng);
        const postura = aPostura(favor);
        return {
          agentId: a.id,
          postura,
          intensidad: Math.round(Math.abs(favor) * 100) / 100,
          razon: razonOffline(a, postura, esc),
        };
      });
    }

    // Actualizar memoria de cada agente con lo que hizo.
    for (const r of reacciones) {
      agentes[r.agentId].memoria.push(`ronda ${ronda}: ${r.postura}`);
    }

    // La presión social se mide entre QUIENES opinaron (a favor + en contra),
    // no sobre el total: así una mayoría neutral no genera presión negativa
    // artificial.
    const aFavor = reacciones.filter((r) => r.postura === "a_favor").length;
    const enContra = reacciones.filter((r) => r.postura === "en_contra").length;
    const opinantes = aFavor + enContra;
    fraccionAFavor = opinantes > 0 ? aFavor / opinantes : 0.5;
    historial.push({ ronda, reacciones });
  }

  return { prediccion: agregar(esc, opts, historial, usaLlm), historial };
}

function agregar(
  esc: Escenario,
  opts: OpcionesSim,
  historial: RondaResultado[],
  usaLlm: boolean,
): Prediccion {
  const final = historial[historial.length - 1].reacciones;
  const dist: Record<Postura, number> = { a_favor: 0, en_contra: 0, neutral: 0 };
  for (const r of final) dist[r.postura]++;

  const n = final.length;
  const favorabilidad = (dist.a_favor - dist.en_contra) / n; // -1..1
  const dominante = Math.max(dist.a_favor, dist.en_contra, dist.neutral);
  const confianza = Math.round((dominante / n) * 100) / 100;

  const veredicto = construirVeredicto(favorabilidad, confianza, dist, n);

  // Cuántas reacciones cayeron al fallback silencioso a lo largo de toda la corrida.
  const fallbacks = historial.reduce(
    (acc, r) => acc + r.reacciones.filter((x) => x.razon === RAZON_FALLBACK).length,
    0,
  );

  return {
    titulo: esc.titulo,
    totalAgentes: opts.agentes,
    rondas: opts.rondas,
    distribucion: dist,
    favorabilidad: Math.round(favorabilidad * 100) / 100,
    confianza,
    veredicto,
    motor: usaLlm ? "llm" : "offline",
    fallbacks,
  };
}

function construirVeredicto(
  favor: number,
  confianza: number,
  dist: Record<Postura, number>,
  n: number,
): string {
  const pct = (x: number) => `${Math.round((x / n) * 100)}%`;
  let tendencia: string;
  if (favor > 0.25) tendencia = "recepción POSITIVA";
  else if (favor < -0.25) tendencia = "recepción NEGATIVA";
  else tendencia = "recepción DIVIDIDA / tibia";

  const seguridad =
    confianza > 0.6 ? "señal marcada" : confianza > 0.4 ? "señal moderada" : "señal débil (mucha dispersión)";

  return (
    `${tendencia} — ${seguridad}. ` +
    `A favor ${pct(dist.a_favor)}, en contra ${pct(dist.en_contra)}, neutral ${pct(dist.neutral)}.`
  );
}
