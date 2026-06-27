// Localized, human-friendly news date. Avoids the raw "international"/ISO format
// in favour of e.g. "26 de junio" (es) / "June 26" (en). Falls back gracefully
// for relative strings ("2 hours ago") and unparseable input.

export function formatNewsDate(dateString: string, locale = 'en'): string {
  if (!dateString) return '';

  // Relative strings coming straight from the news provider.
  const minutes = dateString.match(/(\d+)\s+minutes?\s+ago/i);
  const hours = dateString.match(/(\d+)\s+hours?\s+ago/i);
  const days = dateString.match(/(\d+)\s+days?\s+ago/i);
  if (minutes) return `${Math.max(1, Math.floor(parseInt(minutes[1]) / 60))}h`;
  if (hours) return `${parseInt(hours[1])}h`;

  const now = new Date();
  let date: Date | null = null;
  if (days) {
    date = new Date();
    date.setDate(date.getDate() - parseInt(days[1]));
  } else {
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) date = parsed;
  }
  if (!date) return dateString;

  // < 24h old → compact relative.
  const diffHours = Math.floor((now.getTime() - date.getTime()) / 3_600_000);
  if (diffHours >= 0 && diffHours < 24) return `${Math.max(1, diffHours)}h`;

  // Otherwise a friendly localized date; include the year only if not this year.
  const opts: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { day: 'numeric', month: 'long' }
      : { day: 'numeric', month: 'long', year: 'numeric' };
  try {
    return date.toLocaleDateString(locale, opts);
  } catch {
    return date.toLocaleDateString('en', opts);
  }
}
