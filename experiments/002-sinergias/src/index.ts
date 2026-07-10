import fs from 'fs';
import path from 'path';
import { descubrirSinergias } from './engine';
import type { SynergyInput, Connection } from './types';

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function imprimir(input: SynergyInput): void {
  const r = descubrirSinergias(input);

  console.log('=== 002 · Motor de Sinergias ===\n');
  console.log(r.resumen);
  console.log('\n--- Conexiones (ordenadas por fuerza) ---\n');

  if (r.conexiones.length === 0) {
    console.log('Sin conexiones para este escenario.');
    return;
  }

  r.conexiones.forEach((c: Connection, i: number) => {
    const marca = c.noObvio ? ' ✨ (no obvia)' : '';
    console.log(
      `${i + 1}. [${c.participantes.join(' ↔ ')}] ${c.tipo}${marca}\n` +
        `   fuerza: ${pct(c.fuerza)}\n` +
        `   ${c.razon}\n`
    );
  });
}

function main(): void {
  const nombre = process.argv[2] || 'ejemplo';
  const ruta = path.join(__dirname, '..', 'scenarios', `${nombre}.json`);

  try {
    const raw = fs.readFileSync(ruta, 'utf-8');
    const input = JSON.parse(raw) as SynergyInput;
    imprimir(input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error al procesar el escenario "${nombre}": ${msg}`);
    process.exit(1);
  }
}

main();
