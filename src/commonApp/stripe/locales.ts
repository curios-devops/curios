const STRIPE_SUPPORTED_LOCALES = [
  'auto',
  'ar',
  'bg',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'en-GB',
  'es',
  'es-419',
  'et',
  'fi',
  'fil',
  'fr',
  'fr-CA',
  'he',
  'hr',
  'hu',
  'id',
  'it',
  'ja',
  'ko',
  'lt',
  'lv',
  'ms',
  'mt',
  'nb',
  'nl',
  'pl',
  'pt',
  'pt-BR',
  'ro',
  'ru',
  'sk',
  'sl',
  'sv',
  'th',
  'tr',
  'vi',
  'zh',
  'zh-HK',
  'zh-TW',
] as const;

export type StripeLocale = (typeof STRIPE_SUPPORTED_LOCALES)[number];

const LOCALE_MAP = STRIPE_SUPPORTED_LOCALES.reduce<Record<string, StripeLocale>>((acc, locale) => {
  acc[locale.toLowerCase()] = locale;
  return acc;
}, {});

const SPECIAL_CASES: Record<string, StripeLocale> = {
  'es-419': 'es-419',
  'pt-br': 'pt-BR',
  'zh-hans': 'zh',
  'zh-hant': 'zh-HK',
};

/**
 * Normalize any browser locale to a Stripe-supported locale.
 * Falls back to `auto` if the locale is missing or unsupported.
 */
export function sanitizeStripeLocale(locale?: string | null): StripeLocale {
  if (!locale || typeof locale !== 'string') {
    return 'auto';
  }

  const trimmed = locale.trim();
  if (!trimmed) {
    return 'auto';
  }

  const normalized = trimmed.toLowerCase();

  if (SPECIAL_CASES[normalized]) {
    return SPECIAL_CASES[normalized];
  }

  if (LOCALE_MAP[normalized]) {
    return LOCALE_MAP[normalized];
  }

  const base = normalized.split(/[-_]/)[0];
  if (LOCALE_MAP[base]) {
    return LOCALE_MAP[base];
  }

  if (normalized.startsWith('es-') && LOCALE_MAP['es']) {
    return LOCALE_MAP['es'];
  }

  if (normalized.startsWith('pt-') && LOCALE_MAP['pt']) {
    return LOCALE_MAP['pt'];
  }

  if (normalized.startsWith('zh-') && LOCALE_MAP['zh']) {
    return LOCALE_MAP['zh'];
  }

  return 'auto';
}

export { STRIPE_SUPPORTED_LOCALES };
