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
  const [languageLoading, setLanguageLoading] = useState(true);
  // Track if we just loaded from Supabase to avoid race with localStorage
  const [justLoadedFromSupabase, setJustLoadedFromSupabase] = useState(false);

  useEffect(() => {
    const fetchLanguage = async () => {
      setLanguageLoading(true);
      const storedLanguage = typeof window !== 'undefined'
        ? window.localStorage.getItem('preferredLanguage')
        : null;
      let langCode = storedLanguage;
      let profileLanguage: string | null = null;
      let loadedFromSupabase = false;

      if (session?.user) {
        // Try to get language from user profile (skip if column doesn't exist)
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('language')
            .eq('id', session.user.id)
            .single();

          if (!error && data?.language) {
            profileLanguage = data.language;
          }
        } catch (error) {
          // Silently ignore if language column doesn't exist
          console.debug('Language column not available in profiles table');
        }

        if (!langCode && profileLanguage) {
          langCode = profileLanguage;
          loadedFromSupabase = true;
        }

        // If user had a preferred language before signing in, sync it to Supabase
        if (langCode && profileLanguage && langCode !== profileLanguage) {
          try {
            await supabase
              .from('profiles')
              .update({ language: langCode })
              .eq('id', session.user.id);
          } catch (error) {
            console.debug('Failed to sync preferred language to database:', error);
          }
        }
      }

      if (!langCode) {
        // Fallback to browser language
        langCode = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : null;
      }

      const foundLang = languages.find((l: Language) => l.code === langCode);
      setCurrentLanguage(foundLang || languages[0]); // Set language, default to first if not found
      setJustLoadedFromSupabase(loadedFromSupabase);
      setLanguageLoading(false);
    };

    if (!isLoading) {
      fetchLanguage();
    }
  }, [session, isLoading]); // Re-run when session or loading state changes

  useEffect(() => {
    // Only update localStorage if not just loaded from Supabase (prevents race)
    if (!languageLoading) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('preferredLanguage', currentLanguage.code);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.lang = currentLanguage.code;
      }
    }

    // Save language to database if user is signed in and not just loaded from Supabase
    if (session?.user && !justLoadedFromSupabase) {
      supabase
        .from('profiles')
        .update({ language: currentLanguage.code })
        .eq('id', session.user.id)
        .then(({ error }) => {
          if (error) {
            console.debug('Failed to save language preference to database:', error);
          }
        });
    }
    // Reset the flag after effect
    if (justLoadedFromSupabase) setJustLoadedFromSupabase(false);
  }, [currentLanguage, session, languageLoading, justLoadedFromSupabase]);

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
  };

  // Optionally, show a loading spinner or fallback while language is loading
  if (languageLoading) return null;

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}