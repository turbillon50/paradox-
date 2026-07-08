// PRNG determinista para que las simulaciones sean reproducibles.
// Mismo escenario + mismos parámetros => mismo resultado.

/** mulberry32: generador rápido y determinista a partir de una semilla. */
export function crearRng(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash simple de string a entero, para derivar una semilla de un texto. */
export function hashTexto(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
