// Claude as the studio's fallback writer and critic, with the project's own CLAUDE_API_KEY passed in by the caller.
// Anthropic has no background jobs: the call stays open (streaming, so a long page can't time out) inside the edge
// function's background task. Anything but a finished answer throws.
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";

// Speed first: low effort and no thinking where the model allows it (Opus 5.5 always thinks).
const fast = (model: string) => ({
  output_config: { effort: "low" as const },
  ...(model.includes("haiku") ? { thinking: { type: "disabled" as const } } : model.includes("sonnet") ? { thinking: { type: "between_tools" as const } } : {}),
});

type Content = Anthropic.MessageParam["content"];

export async function askClaude(o: { apiKey: string; model: string; system: string; content: Content; maxTokens: number; signal: AbortSignal }): Promise<string> {
  const client = new Anthropic({ apiKey: o.apiKey, maxRetries: 1 });
  const stream = client.messages.stream({ model: o.model, max_tokens: o.maxTokens, system: o.system, messages: [{ role: "user", content: o.content }], ...fast(o.model) } as never, { signal: o.signal });
  const message = await stream.finalMessage();
  if (message.stop_reason !== "end_turn") throw new Error(`claude stopped: ${message.stop_reason}`);
  return message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
}

/** An image on the web, as Claude's image block. */
export const imageUrlBlock = (url: string) => ({ type: "image" as const, source: { type: "url" as const, url } });

/** A base64 JPEG data URL (the contact sheet) as Claude's image block. */
export const imageBlock = (dataUrl: string) => ({ type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: dataUrl.slice(dataUrl.indexOf(",") + 1) } });
