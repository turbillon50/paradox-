// Cliente LLM mínimo, compatible con la API de OpenAI (chat completions).
// Apunta por defecto a Cerebras. Si no hay LLM_API_KEY, queda deshabilitado
// y el motor usa el fallback offline.

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function leerConfigLlm(): LlmConfig | null {
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.LLM_BASE_URL || "https://api.cerebras.ai/v1").replace(/\/$/, ""),
    model: process.env.LLM_MODEL || "llama-3.3-70b",
  };
}

/** Una llamada de chat. Devuelve el texto de la respuesta. */
export async function chat(
  cfg: LlmConfig,
  system: string,
  user: string,
): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      policy: "local",
      model: cfg.model,
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string; reasoning?: string } }[];
  };
  // Algunos modelos (p.ej. gpt-oss-120b vía mesh) devuelven el texto útil en
  // message.reasoning cuando message.content viene vacío o cortado.
  const msg = data.choices?.[0]?.message;
  const content = msg?.content?.trim();
  return content && content.length > 0 ? content : (msg?.reasoning ?? "");
}
