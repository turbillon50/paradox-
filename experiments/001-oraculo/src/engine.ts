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

const POSTURAS: Postura[] = ["a_favor", "en_contra", "neutral"];

/** Marca de un agente que no obtuvo respuesta parseable del modelo. */
export const RAZON_FALLBACK = "(sin respuesta clara del modelo)";

// ============================================================
//  MODO OFFLINE (determinista) — fallback sin API, NO tocar.
// ============================================================

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

function razonOffline(a: Agent, postura: Postura): string {
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

function rondaOffline(
  agentes: Agent[],
  esc: Escenario,
  fraccionAFavor: number,
  rng: () => number,
): Reaccion[] {
  return agentes.map((a) => {
    const favor = favorabilidadOffline(a, esc, fraccionAFavor, rng);
    const postura = aPostura(favor);
    return {
      agentId: a.id,
      postura,
      intensidad: Math.round(Math.abs(favor) * 100) / 100,
      razon: razonOffline(a, postura),
    };
  });
}

// ============================================================
//  MODO LLM — batch por ronda (UNA llamada evalúa a TODOS).
//  Esto evita el rate limit de Cerebras: N agentes x R rondas
//  pasa de N*R llamadas a solo R.
// ============================================================

interface ItemBatch {
  id?: number;
  postura?: string;
  intensidad?: number;
  razon?: string;
}

/**
 * Evalúa a TODOS los agentes de una ronda con UNA sola llamada LLM.
 * Si el array viene incompleto o el parse falla, reintenta la ronda una vez
 * con backoff 3-5s (posible rate limit). Los agentes que aun así falten se
 * marcan como fallback (contado, nunca silencioso).
 */
async function rondaLlm(
  cfg: LlmConfig,
  agentes: Agent[],
  esc: Escenario,
  contextoPrevio: string,
): Promise<Reaccion[]> {
  const system =
    "Sos un simulador de opinión social. Te doy una lista de personas y un " +
    "escenario. Devolvés SOLO un JSON array (sin texto extra), UN objeto por " +
    "persona, con su id, en el mismo orden. Formato de cada objeto: " +
    '{"id":<n>,"postura":"a_favor|en_contra|neutral","intensidad":0..1,"razon":"breve"}';

  const lista = agentes
    .map(
      (a) =>
        `[${a.id}] ${a.nombre}, ${a.rol} ` +
        `(apertura ${a.personalidad.apertura}, escepticismo ${a.personalidad.escepticismo}, ` +
        `riesgo ${a.personalidad.toleranciaRiesgo}, sociabilidad ${a.personalidad.sociabilidad})`,
    )
    .join("\n");

  const user =
    `Escenario: ${esc.titulo}. ${esc.descripcion}\n` +
    `Pregunta: ${esc.pregunta}\n\n` +
    (contextoPrevio ? `Lo que pasó en rondas previas:\n${contextoPrevio}\n\n` : "") +
    `Personas (${agentes.length}):\n${lista}\n\n` +
    `Devolvé el JSON array con la postura de las ${agentes.length} personas (una por id).`;

  // 2 intentos: si falla el parse o el batch viene incompleto, se reintenta la
  // ronda completa una vez con backoff 3-5s (por si es rate limit).
  let mejorPorId = new Map<number, ItemBatch>();
  for (let intento = 0; intento < 2; intento++) {
    try {
      const texto = await chat(cfg, system, user);
      const porId = indexarPorId(parseArrayBatch(texto, agentes.length));
      if (porId.size > mejorPorId.size) mejorPorId = porId;
      const completos = agentes.filter((a) => esItemValido(porId.get(a.id))).length;
      if (completos === agentes.length) {
        return agentes.map((a) => itemAReaccion(a, porId.get(a.id)!));
      }
    } catch {
      // parse/HTTP falló; se reintenta abajo si queda intento
    }
    if (intento === 0) {
      await dormir(3000 + Math.random() * 2000); // backoff 3-5s ante rate limit
    }
  }

  // Tras el reintento: rescatamos los que sí llegaron y marcamos el resto como
  // fallback (contado). Nunca caemos a neutral en silencio sin haber reintentado.
  return agentes.map((a) => {
    const it = mejorPorId.get(a.id);
    return esItemValido(it) ? itemAReaccion(a, it!) : fallbackReaccion(a);
  });
}

function parseArrayBatch(texto: string, esperados: number): ItemBatch[] {
  const i = texto.indexOf("[");
  const j = texto.lastIndexOf("]");
  const crudo = i >= 0 && j > i ? texto.slice(i, j + 1) : "[]";
  const arr = JSON.parse(crudo);
  if (!Array.isArray(arr)) throw new Error("la respuesta no es un array");
  if (arr.length < esperados) {
    console.warn(
      `⚠️  batch incompleto: llegaron ${arr.length} items de ${esperados} agentes esperados`,
    );
  }
  return arr as ItemBatch[];
}

function indexarPorId(items: ItemBatch[]): Map<number, ItemBatch> {
  const m = new Map<number, ItemBatch>();
  for (const it of items) {
    if (it && typeof it.id === "number") m.set(it.id, it);
  }
  return m;
}

function esItemValido(it: ItemBatch | undefined): boolean {
  return !!it && POSTURAS.includes(String(it.postura) as Postura);
}

function itemAReaccion(a: Agent, it: ItemBatch): Reaccion {
  return {
    agentId: a.id,
    postura: it.postura as Postura,
    intensidad: clamp01(Number(it.intensidad) || 0.5),
    razon: String(it.razon || "").slice(0, 200),
  };
}

function fallbackReaccion(a: Agent): Reaccion {
  return { agentId: a.id, postura: "neutral", intensidad: 0.4, razon: RAZON_FALLBACK };
}

// ---- Anillos acumulativos: contexto de rondas previas ----

/**
 * Construye el contexto que recibe la ronda actual: el resumen ACUMULADO de
 * todas las rondas previas. La ronda 1 arranca en frío (""), la 2 recibe la 1,
 * la 3 recibe 1+2, y así la presión social se propaga en olas.
 */
function contextoAcumulado(historial: RondaResultado[]): string {
  return historial.map(resumenRonda).join("\n");
}

function resumenRonda(r: RondaResultado): string {
  const n = r.reacciones.length;
  const c: Record<Postura, number> = { a_favor: 0, en_contra: 0, neutral: 0 };
  for (const x of r.reacciones) c[x.postura]++;
  const pct = (v: number) => Math.round((v / n) * 100);
  const aFavor = topRazones(r.reacciones, "a_favor", 2);
  const enContra = topRazones(r.reacciones, "en_contra", 2);
  return (
    `Ronda ${r.ronda}: ${pct(c.a_favor)}% a favor, ${pct(c.en_contra)}% en contra, ` +
    `${pct(c.neutral)}% neutral.` +
    (aFavor.length ? ` Argumentos dominantes a favor: ${aFavor.join("; ")}.` : "") +
    (enContra.length ? ` En contra: ${enContra.join("; ")}.` : "")
  );
}

function topRazones(reacciones: Reaccion[], postura: Postura, n: number): string[] {
  const freq = new Map<string, number>();
  for (const r of reacciones) {
    if (r.postura !== postura) continue;
    const razon = r.razon.trim();
    if (!razon || razon === RAZON_FALLBACK) continue;
    freq.set(razon, (freq.get(razon) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map((e) => e[0]);
}

// ---- utilidades ----

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================
//  Orquestador
// ============================================================

export async function simular(
  esc: Escenario,
  opts: OpcionesSim,
  agentes: Agent[],
): Promise<{ prediccion: Prediccion; historial: RondaResultado[] }> {
  const cfg = leerConfigLlm();
  const usaLlm = cfg !== null;
  const rng = crearRng(hashTexto(esc.titulo) ^ (opts.agentes * 2654435761));

  const historial: RondaResultado[] = [];
  let fraccionAFavor = 0.5; // arranca neutral (usado por el modo offline)

  for (let ronda = 1; ronda <= opts.rondas; ronda++) {
    let reacciones: Reaccion[];

    if (usaLlm && cfg) {
      // Anillo acumulativo: la ronda recibe el resumen de TODAS las previas.
      const contexto = contextoAcumulado(historial);
      reacciones = await rondaLlm(cfg, agentes, esc, contexto);
      // Pausa entre rondas por seguridad ante el rate limit (no tras la última).
      if (ronda < opts.rondas) await dormir(2000);
    } else {
      reacciones = rondaOffline(agentes, esc, fraccionAFavor, rng);
    }

    // Actualizar memoria de cada agente con lo que hizo.
    for (const r of reacciones) {
      agentes[r.agentId].memoria.push(`ronda ${ronda}: ${r.postura}`);
    }

    // Presión social medida entre QUIENES opinaron (a favor + en contra), no
    // sobre el total: una mayoría neutral no genera presión negativa artificial.
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
