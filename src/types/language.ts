export type LanguageCode = 'en' | 'es' | 'de' | 'fr' | 'ca' | 'it' | 'pt' | 'ru' | 'zh' | 'ko' | 'ja';

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
}

export const languages: Language[] = [
  // Round SVG flags from circle-flags (MIT, see public/flags/LICENSE.md).
  { code: 'en', name: 'English', flag: '/flags/us.svg' },
  { code: 'es', name: 'Español', flag: '/flags/es.svg' },
  { code: 'de', name: 'Deutsch', flag: '/flags/de.svg' },
  { code: 'fr', name: 'Français', flag: '/flags/fr.svg' },
  { code: 'ca', name: 'Català', flag: '/flags/es-ct.svg' },
  { code: 'it', name: 'Italiano', flag: '/flags/it.svg' },
  { code: 'pt', name: 'Português', flag: '/flags/br.svg' },
  { code: 'ru', name: 'Русский', flag: '/flags/ru.svg' },
  { code: 'zh', name: '中文', flag: '/flags/cn.svg' },
  { code: 'ko', name: '한국어', flag: '/flags/kr.svg' },
  { code: 'ja', name: '日本語', flag: '/flags/jp.svg' },
];
