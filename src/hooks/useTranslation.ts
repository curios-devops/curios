import { useMemo } from "react";
import { useLanguage } from "../contexts/LanguageContext.tsx";
import { LanguageCode } from "../types/language.ts";

import { Translations, translations } from '../config/translations.ts';

export type TranslationKey = keyof Translations['en'];

export function useTranslation() {
  const { currentLanguage } = useLanguage();

  const t = useMemo(() => {
    return (key: TranslationKey) => {
      const lang = currentLanguage.code as LanguageCode;
      return translations[lang]?.[key] || translations.en[key] || key;
    };
  }, [currentLanguage.code]);

  return { t };
}
