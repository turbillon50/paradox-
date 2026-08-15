import { SynergyInput, Connection, SynergyResult } from './types';

const norm = (s: string): string => s.trim().toLowerCase();

function interseccion(a: string[], b: string[]): string[] {
  const setB = new Set(b.map(norm));
  return a.filter((x) => setB.has(norm(x)));
}

export function descubrirSinergias(input: SynergyInput): SynergyResult {
  const participantes = input.participantes ?? [];
  const contexto = input.contexto ?? [];

  // 1. GUARD DE CONSENTIMIENTO — nadie se procesa sin autorizado === true
  const consentidos = participantes.filter(
    (p) => p.consentimiento?.autorizado === true
  );
  const descartados = participantes.length - consentidos.length;

  type Cruda = { conn: Connection; raw: number };
  const crudas: Cruda[] = [];

  for (let i = 0; i < consentidos.length; i++) {
    for (let j = i + 1; j < consentidos.length; j++) {
      const a = consentidos[i];
      const b = consentidos[j];

      // Match directo: comparten objetivos o intereses
      const objComunes = interseccion(a.objetivos, b.objetivos);
      const intComunes = interseccion(a.intereses, b.intereses);
      const directos = objComunes.length + intComunes.length;

      // Match complementario NO OBVIO: lo que A busca es lo que B ofrece (y viceversa)
      const aBuscaBOfrece = interseccion(a.objetivos, b.aportaciones);
      const bBuscaAOfrece = interseccion(b.objetivos, a.aportaciones);
      const complementarios = aBuscaBOfrece.length + bBuscaAOfrece.length;

      if (directos === 0 && complementarios === 0) continue;

      // Boost por señal pública de mercado (contexto)
      const terminos = new Set(
        [
          ...a.intereses,
          ...a.objetivos,
          ...a.aportaciones,
          ...b.intereses,
          ...b.objetivos,
          ...b.aportaciones,
        ].map(norm)
      );
      let boost = 0;
      for (const s of contexto) {
        if (terminos.has(norm(s.tema))) boost = Math.max(boost, s.relevancia);
      }

      // Complementario pesa doble: es la conexión que nadie vio
      const raw = directos + complementarios * 2 + boost;

      const noObvio = complementarios > 0;
      const tipo = noObvio ? 'complementario' : 'directo';

      const motivos: string[] = [];
      if (objComunes.length)
        motivos.push(`objetivos en común (${objComunes.join(', ')})`);
      if (intComunes.length)
        motivos.push(`intereses en común (${intComunes.join(', ')})`);
      if (aBuscaBOfrece.length)
        motivos.push(
          `${a.nombre} busca lo que ${b.nombre} ofrece (${aBuscaBOfrece.join(', ')})`
        );
      if (bBuscaAOfrece.length)
        motivos.push(
          `${b.nombre} busca lo que ${a.nombre} ofrece (${bBuscaAOfrece.join(', ')})`
        );
      if (boost > 0) motivos.push('reforzado por señal pública de mercado');

      crudas.push({
        raw,
        conn: {
          participantes: [a.id, b.id],
          tipo,
          razon: motivos.join('; '),
          fuerza: 0, // se normaliza abajo
          noObvio,
        },
      });
    }
  }

  // Normalizar fuerza a 0-1 contra el match más fuerte
  const maxRaw = crudas.reduce((m, c) => Math.max(m, c.raw), 0);
  const conexiones = crudas
    .map((c) => ({
      ...c.conn,
      fuerza: maxRaw > 0 ? parseFloat((c.raw / maxRaw).toFixed(3)) : 0,
    }))
    .sort((x, y) => y.fuerza - x.fuerza);

  const noObvias = conexiones.filter((c) => c.noObvio).length;
  const resumen =
    `${consentidos.length} participantes procesados, ` +
    `${descartados} descartados por falta de consentimiento. ` +
    `${conexiones.length} conexiones halladas (${noObvias} no obvias).`;

  return { conexiones, resumen };
}
