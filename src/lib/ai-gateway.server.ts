// Server-only Lovable AI Gateway helper. Never imported by client code.
// Falls back to a user-supplied OpenAI key (OPENAI_API_KEY) when the project
// is self-hosted (e.g. Cloudflare) and LOVABLE_API_KEY is unavailable.
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "openai/gpt-6-astra";
const FALLBACK_MODEL = "gpt-4o";

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
  const openAiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey && !openAiKey)
    throw new AiGatewayError(401, "AI is not configured for this project.");

  const useGateway = Boolean(apiKey);
  const res = await fetch(useGateway ? GATEWAY_URL : OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${useGateway ? apiKey : openAiKey}`,
    },
    body: JSON.stringify({
      model: useGateway ? MODEL : FALLBACK_MODEL,
      ...(useGateway ? { reasoning_effort: "low" } : {}),
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
