// The answer models in one place. Their ids come from the environment (.env → Supabase secrets), so changing
// one takes no code. OpenAI goes first and Claude is its fallback: Luna → Haiku (fast), Sol → Sonnet, Astra → Opus
// (Pro accounts). MODEL_HAIKU=OFF (or no CLAUDE_API_KEY) leaves that tier without a fallback.
export type Tier = "luna" | "sol" | "astra";

const DEFAULTS = {
  MODEL_HAIKU: "claude-haiku-5-5", MODEL_SONNET: "claude-sonnet-5-5", MODEL_OPUS: "claude-opus-5-5",
  MODEL_LUNA: "gpt-6-luna", MODEL_SOL: "gpt-6.1-sol", MODEL_ASTRA: "gpt-6-astra",
};
const VARS = { luna: ["MODEL_HAIKU", "MODEL_LUNA"], sol: ["MODEL_SONNET", "MODEL_SOL"], astra: ["MODEL_OPUS", "MODEL_ASTRA"] } as const;

export function modelsFrom(get: (name: string) => string | undefined) {
  const read = (name: keyof typeof DEFAULTS) => (get(name) ?? "").trim() || DEFAULTS[name];
  return {
    /** The fallback, Claude's model for this tier; null when it is off. */
    claude: (tier: Tier): string | null => {
      const id = read(VARS[tier][0]);
      return (get("CLAUDE_API_KEY") ?? "").trim() && id !== "OFF" ? id : null;
    },
    openai: (tier: Tier): string => read(VARS[tier][1]),
  };
}

/** The tier a stored model belongs to (a version of a page is written at the tier of the first). */
export const tierOf = (model: unknown): Tier => (/opus|astra/.test(String(model)) ? "astra" : /sonnet|sol/.test(String(model)) ? "sol" : "luna");
