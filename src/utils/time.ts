export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  if (seconds < 60) {
    return 'now'; // Less than 1 minute
  }

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const value = Math.floor(seconds / secondsInUnit);
    if (value >= 1) {
      // Return abbreviated time (e.g., "5d" for 5 days)
      const abbreviation = unit[0]; // Take the first letter: "y" for years, "m" for minutes
      return `${value}${abbreviation}`;
    }
  }

  return 'now'; // Fallback, though it shouldn't be reached
}