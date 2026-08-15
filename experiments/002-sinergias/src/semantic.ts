import { SynergyInput, SynergyResult, Connection, Participant } from './types';
import { LlmConfig, chat } from './llm';
import { descubrirSinergias } from './engine';

const SYSTEM = [
  'Eres un motor de sinergias. Recibes perfiles de personas que declararon',
  'voluntariamente sus objetivos, intereses y aportaciones, mas una capa de',
  'contexto de mercado. Encuentra conexiones valiosas entre ellas, priorizando',
  'las NO OBVIAS: cuando lo que una persona BUSCA (objetivo) coincide',
  'semanticamente con lo que otra OFRECE (aportacion), aunque usen palabras',
  'distintas. Tambien detecta afinidades por objetivos o intereses cercanos.',
  'Usa el contexto de mercado solo para reforzar, nunca para inventar datos.',
  'Responde UNICAMENTE con un array JSON, sin texto ni backticks. Cada elemento:',
  '{"participantes":[id,id],"tipo":"directo"|"complementario",',
  '"razon":"breve, en espanol","fuerza":0..1,"noObvio":true|false}.',
  'Usa SOLO los ids provistos. Si no hay conexiones, responde [].',
].join(' ');

function construirUser(
  consentidos: Participant[],
  contexto: SynergyInput['contexto']
): string {
  const perfiles = consentidos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    objetivos: p.objetivos,
    intereses: p.intereses,
    aportaciones: p.aportaciones,
  }));
  const ctx = (contexto ?? []).map((s) => ({ tema: s.tema, relevancia: s.relevancia }));
  return JSON.stringify({ participantes: perfiles, contexto: ctx });
}

/** Extrae y valida el array JSON de conexiones. Filtra ids fuera del set consentido. */
function parsearConexiones(texto: string, idsValidos: Set<string>): Connection[] | null {
  const ini = texto.indexOf('[');
  const fin = texto.lastIndexOf(']');
  if (ini === -1 || fin === -1 || fin <= ini) return null;

  let bruto: unknown;
  try {
    bruto = JSON.parse(texto.slice(ini, fin + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(bruto)) return null;

  const conexiones: Connection[] = [];
  for (const item of bruto) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;

    const ids = Array.isArray(o.participantes)
      ? o.participantes.filter((x): x is string => typeof x === 'string')
      : [];
    // Guard de seguridad: descarta la conexion si toca un id no consentido.
    if (ids.length < 2 || !ids.every((id) => idsValidos.has(id))) continue;

    const fuerzaNum = typeof o.fuerza === 'number' ? o.fuerza : 0;
    const fuerza = Math.max(0, Math.min(1, fuerzaNum));

    conexiones.push({
      participantes: ids,
      tipo: o.tipo === 'complementario' ? 'complementario' : 'directo',
      razon: typeof o.razon === 'string' ? o.razon : '',
      fuerza: parseFloat(fuerza.toFixed(3)),
      noObvio: o.noObvio === true,
    });
  }
  return conexiones;
}

/**
 * Camino LLM (semantico). Mantiene el MISMO guard de consentimiento que el
 * determinista y ante cualquier falla (sin conexiones, JSON invalido, error de
 * red) cae al motor determinista. Nunca procesa a alguien sin autorizado=true.
 */
export async function descubrirSinergiasLLM(
  input: SynergyInput,
  cfg: LlmConfig
): Promise<SynergyResult> {
  const participantes = input.participantes ?? [];
  const consentidos = participantes.filter((p) => p.consentimiento?.autorizado === true);
  const descartados = participantes.length - consentidos.length;

  if (consentidos.length < 2) return descubrirSinergias(input);

  try {
    const user = construirUser(consentidos, input.contexto);
    const raw = await chat(cfg, SYSTEM, user);
    const idsValidos = new Set(consentidos.map((p) => p.id));
    const conexiones = parsearConexiones(raw, idsValidos);
    if (!conexiones || conexiones.length === 0) return descubrirSinergias(input);

    conexiones.sort((a, b) => b.fuerza - a.fuerza);
    const noObvias = conexiones.filter((c) => c.noObvio).length;
    const resumen =
      `${consentidos.length} participantes procesados (via LLM semantico), ` +
      `${descartados} descartados por falta de consentimiento. ` +
      `${conexiones.length} conexiones halladas (${noObvias} no obvias).`;
    return { conexiones, resumen };
  } catch {
    // Fallback duro al determinista ante cualquier error.
    return descubrirSinergias(input);
  }
}
