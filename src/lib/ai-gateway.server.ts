// Server-only Lovable AI Gateway helper. Never imported by client code.
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "openai/gpt-6-astra";

export type ChatContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

export class AiGatewayError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function friendlyMessage(status: number, raw: string) {
  if (status === 429) return "AI service is busy right now. Please retry in a moment.";
  if (status === 402) return "AI credits are exhausted. Add credits to continue AI processing.";
  if (status === 403) return "AI access is blocked for this workspace.";
  if (status >= 500) return "AI service is temporarily unavailable. Please retry.";
  return raw || "AI request failed.";
}

/** Calls the gateway and returns a parsed JSON object matching the given schema. */
export async function aiJson<T>(args: {
  system: string;
  content: ChatContent[];
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiGatewayError(401, "AI is not configured for this project.");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: "low",
      max_completion_tokens: 4000,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.content },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: args.schemaName, strict: true, schema: args.schema },
      },
    }),
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let message = raw;
    try {
      message = (JSON.parse(raw)?.error?.message ?? JSON.parse(raw)?.message) || raw;
    } catch {
      /* keep raw */
    }
    throw new AiGatewayError(res.status, friendlyMessage(res.status, message));
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = payload.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AiGatewayError(502, "AI returned an unreadable response.");
  }
}
