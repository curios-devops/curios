// Dynamic date utilities for Curios AI Insights
// This ensures all agents use current date context instead of hardcoded dates

export function getCurrentYear(): string {
  return new Date().getFullYear().toString();
}

export function getCurrentDateContext(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  return `${month} ${year}`;
}

export function getCurrentDateForPrompts(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return now.toLocaleDateString('en-US', options);
}
