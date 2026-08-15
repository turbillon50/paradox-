import fs from 'fs';
import path from 'path';
import { descubrirSinergias } from './engine';
import { descubrirSinergiasLLM } from './semantic';
import { leerConfigLlm } from './llm';
import type { SynergyInput, SynergyResult, Connection } from './types';

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function imprimir(r: SynergyResult): void {
  console.log('=== 002 · Motor de Sinergias ===\n');
  console.log(r.resumen);
  console.log('\n--- Conexiones (ordenadas por fuerza) ---\n');

  if (r.conexiones.length === 0) {
    console.log('Sin conexiones para este escenario.');
    return;
  }

  r.conexiones.forEach((c: Connection, i: number) => {
    const marca = c.noObvio ? ' \u2728 (no obvia)' : '';
    console.log(
      `${i + 1}. [${c.participantes.join(' \u2194 ')}] ${c.tipo}${marca}\n` +
        `   fuerza: ${pct(c.fuerza)}\n` +
        `   ${c.razon}\n`
    );
  });
}

async function main(): Promise<void> {
  const nombre = process.argv[2] || 'ejemplo';
  const ruta = path.join(__dirname, '..', 'scenarios', `${nombre}.json`);

  try {
    const raw = fs.readFileSync(ruta, 'utf-8');
    const input = JSON.parse(raw) as SynergyInput;

    const cfg = leerConfigLlm();
    if (cfg) {
      console.log(`[modo: LLM semantico via ${cfg.model}]\n`);
    } else {
      console.log('[modo: determinista offline — define LLM_API_KEY para el modo semantico]\n');
    }

    const r = cfg ? await descubrirSinergiasLLM(input, cfg) : descubrirSinergias(input);
    imprimir(r);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error al procesar el escenario "${nombre}": ${msg}`);
    process.exit(1);
  }
}

main();
