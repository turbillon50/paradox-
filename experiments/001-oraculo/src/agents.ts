import type { Agent } from "./types.js";
import { crearRng } from "./rng.js";

const NOMBRES = [
  "Ana", "Bruno", "Carla", "Diego", "Elena", "Fabián", "Gaby", "Hugo",
  "Irene", "Javier", "Karina", "Luis", "Marta", "Nico", "Olivia", "Pablo",
  "Queca", "Raúl", "Sofía", "Tomás", "Úrsula", "Valen", "Wendy", "Ximena",
  "Yago", "Zoe",
];

const ROLES = [
  "consumidor pragmático",
  "early adopter",
  "escéptico de precio",
  "influencer de nicho",
  "comprador leal",
  "cazador de ofertas",
  "profesional ocupado",
  "entusiasta técnico",
  "cauteloso conservador",
  "líder de opinión",
];

/**
 * Genera una población determinista de agentes. Misma semilla => misma gente.
 * Cada agente recibe una personalidad y un rol, reproducibles.
 */
export function generarPoblacion(n: number, semilla: number): Agent[] {
  const rng = crearRng(semilla);
  const agentes: Agent[] = [];
  for (let i = 0; i < n; i++) {
    agentes.push({
      id: i,
      nombre: `${NOMBRES[i % NOMBRES.length]}${i >= NOMBRES.length ? `-${Math.floor(i / NOMBRES.length) + 1}` : ""}`,
      rol: ROLES[Math.floor(rng() * ROLES.length)],
      personalidad: {
        apertura: redondear(rng()),
        escepticismo: redondear(rng()),
        toleranciaRiesgo: redondear(rng()),
        sociabilidad: redondear(rng()),
      },
      memoria: [],
    });
  }
  return agentes;
}

function redondear(x: number): number {
  return Math.round(x * 100) / 100;
}
