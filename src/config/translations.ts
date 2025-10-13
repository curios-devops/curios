// Translation types
export type TranslationKey = string;
type TranslationValue = string;
type LanguageCode = string;

export type Translations = {
  [key in LanguageCode]: {
    [key in TranslationKey]: TranslationValue;
  };
};

// Import all locale JSON files
import en from '../locales/en.json';
import es from '../locales/es.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import it from '../locales/it.json';
import pt from '../locales/pt.json';
import ca from '../locales/ca.json';
import ja from '../locales/ja.json';

// Export translations object
export const translations: Translations = {
  en,
  es,
  de,
  fr,
  it,
  pt,
  ca,
  ja,
};
