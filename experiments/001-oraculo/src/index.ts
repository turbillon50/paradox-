import { readFileSync } from "node:fs";
import type { Escenario } from "./types.js";
import { generarPoblacion } from "./agents.js";
import { simular } from "./engine.js";
import { hashTexto } from "./rng.js";

// ---- Parseo mínimo de argumentos ----
// uso: tsx src/index.ts [ruta-escenario.json] [--agentes N] [--rondas R]

function parseArgs(argv: string[]) {
  let rutaEscenario: string | undefined;
  let agentes = 12;
  let rondas = 3;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--agentes") agentes = parseInt(argv[++i], 10);
    else if (a === "--rondas") rondas = parseInt(argv[++i], 10);
    else if (!a.startsWith("--")) rutaEscenario = a;
  }
  return { rutaEscenario, agentes, rondas };
}

const ESCENARIO_DEMO: Escenario = {
  titulo: "Lanzar plan Pro a $29/mes",
  descripcion:
    "Un SaaS de productividad quiere lanzar un plan Pro con features de IA a 29 USD/mes, dirigido a su base actual de usuarios gratuitos.",
  pregunta: "¿Los usuarios adoptarían el plan Pro a ese precio?",
  nivelRiesgo: 0.55,
  nivelNovedad: 0.6,
};

async function main() {
  const { rutaEscenario, agentes, rondas } = parseArgs(process.argv.slice(2));

  let esc: Escenario;
  if (rutaEscenario) {
    esc = JSON.parse(readFileSync(rutaEscenario, "utf8"));
  } else {
    esc = ESCENARIO_DEMO;
    console.log("ℹ️  Sin archivo de escenario: usando el demo integrado.\n");
  }

  const poblacion = generarPoblacion(agentes, hashTexto(esc.titulo));

  console.log("🔮 ORÁCULO — simulación multi-agente");
  console.log("─".repeat(52));
  console.log(`Escenario : ${esc.titulo}`);
  console.log(`Pregunta  : ${esc.pregunta}`);
  console.log(`Población : ${agentes} agentes · ${rondas} rondas`);
  console.log("─".repeat(52) + "\n");

  const t0 = Date.now();
  const { prediccion, historial } = await simular(esc, { agentes, rondas }, poblacion);
  const ms = Date.now() - t0;

  // Evolución por ronda
  for (const r of historial) {
    const c = { a_favor: 0, en_contra: 0, neutral: 0 } as Record<string, number>;
    for (const x of r.reacciones) c[x.postura]++;
    console.log(
      `Ronda ${r.ronda}: 👍 ${c.a_favor}  👎 ${c.en_contra}  😐 ${c.neutral}   ${barra(c.a_favor, agentes)}`,
    );
  }

  console.log("\n" + "═".repeat(52));
  console.log("📊 PREDICCIÓN");
  console.log("═".repeat(52));
  console.log(`Motor        : ${prediccion.motor === "llm" ? "LLM real" : "offline (determinista)"}`);
  console.log(`Favorabilidad: ${prediccion.favorabilidad}  (rango -1 a +1)`);
  console.log(`Confianza    : ${Math.round(prediccion.confianza * 100)}%`);
  console.log(`Veredicto    : ${prediccion.veredicto}`);
  if (prediccion.motor === "llm") {
    const tot = prediccion.totalAgentes * prediccion.rondas;
    console.log(`Fallbacks    : ${prediccion.fallbacks}/${tot} reacciones sin respuesta clara del modelo`);
  }
  console.log(`Tiempo       : ${ms} ms\n`);

  // Muestra de razones (primeros 5 agentes de la última ronda)
  console.log("🗣️  Muestra de opiniones (ronda final):");
  const ult = historial[historial.length - 1].reacciones.slice(0, 5);
  for (const r of ult) {
    const a = poblacion[r.agentId];
    console.log(`   • ${a.nombre} (${a.rol}) → ${icono(r.postura)} ${r.razon}`);
  }
  console.log();
}

function barra(aFavor: number, total: number): string {
  const ancho = 20;
  const llenos = Math.round((aFavor / total) * ancho);
  return "▓".repeat(llenos) + "░".repeat(ancho - llenos);
}

function icono(p: string): string {
  return p === "a_favor" ? "👍" : p === "en_contra" ? "👎" : "😐";
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
