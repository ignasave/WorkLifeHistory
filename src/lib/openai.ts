import OpenAI from "openai";
import { ENV } from "./env";

const client = new OpenAI({ apiKey: ENV.openaiKey });

export async function callOpenAI(prompt: string): Promise<string> {
  const res = await client.chat.completions.create({
    model: "gpt-5", // Latest GPT-5 with better instruction following
    temperature: 1, // Low but allows reasonable context inference
    max_completion_tokens: 128000,
    messages: [
      {
        role: "system",
        content:
          "You are a professional CV generator with ZERO hallucination. NEVER invent data. Use ONLY the exact information provided. Follow the user's format instructions precisely - if they ask for JSON, return JSON; if they ask for plain text, return plain text with no wrapping.",
      },
      { role: "user", content: prompt },
    ],
  });

  const content = res.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI: respuesta vacía");

  // Si el modelo envía texto extra, intentamos recortar a [ ... ] o { ... }
  const start = Math.min(
    ...["[", "{"].map((c) =>
      content.indexOf(c) === -1 ? Infinity : content.indexOf(c)
    )
  );
  const end = Math.max(content.lastIndexOf("]"), content.lastIndexOf("}"));
  return start !== Infinity && end !== -1
    ? content.slice(start, end + 1)
    : content;
}
