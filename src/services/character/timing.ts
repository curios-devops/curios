// Lightweight latency trace for Character mode: logs each step as
// "[character-timing] <step> +<ms since page start>" so slow APIs are visible
// in the console (and in automated audits).
const t0 = typeof performance !== 'undefined' ? performance.now() : 0;

export function mark(step: string, extra?: Record<string, unknown>) {
  const ms = Math.round(performance.now() - t0);
  console.info(`[character-timing] ${step} +${ms}ms`, extra ?? '');
}
