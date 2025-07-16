import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, languages } from '../types/language.ts';

import { useSession } from '../hooks/useSession.ts';
import { supabase } from '../lib/supabase.ts';
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
  const { session, isLoading } = useSession();
  const [currentLanguage, setCurrentLanguage] = useState<Language>(languages[0]); // Default to the first language

 useEffect(() => {
    const fetchLanguage = async () => {
      let langCode = null;
      if (session?.user) {
        // Try to get language from user profile
        const { data, error } = await supabase
          .from('profiles')
          .select('language')
          .eq('id', session.user.id)
          .single();

        if (!error && data?.language) {
          langCode = data.language;
        }
      }

      if (!langCode) {
        // Fallback to localStorage
        langCode = localStorage.getItem('preferredLanguage');
      }

      if (!langCode) {
        // Fallback to browser language
        langCode = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : undefined;
      }

      const foundLang = languages.find((l: Language) => l.code === langCode);
      setCurrentLanguage(foundLang || languages[0]); // Set language, default to first if not found
    };

    if (!isLoading) {
      fetchLanguage();
    }
  }, [session, isLoading]); // Re-run when session or loading state changes

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