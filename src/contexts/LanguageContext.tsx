import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, languages } from '../types/language';

type LanguageContextType = {
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    // Try to get language from localStorage
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang) {
      const lang = languages.find((l: Language) => l.code === savedLang);
      if (lang) return lang;
    }

    // Get browser language
    const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : undefined;
    const defaultLang = languages.find((l: Language) => l.code === browserLang) || languages[0];
    // Save browser default as preferred if not set
    if (defaultLang && !savedLang) {
      localStorage.setItem('preferredLanguage', defaultLang.code);
    }
    return defaultLang;
  });

  useEffect(() => {
    localStorage.setItem('preferredLanguage', currentLanguage.code);
    document.documentElement.lang = currentLanguage.code;
  }, [currentLanguage]);

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}