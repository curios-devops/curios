import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useSearchPreferences() {
  const [isProEnabled, setIsProEnabled] = useState(false);
  const [searchType, setSearchType] = useState<'auto' | 'pro' | 'deepResearch'>('auto');

  useEffect(() => {
    // Load preferences from localStorage
    const savedPreferences = localStorage.getItem('searchPreferences');
    if (savedPreferences) {
      const { isProEnabled: savedProEnabled, searchType: savedType } = JSON.parse(savedPreferences);
      setIsProEnabled(savedProEnabled);
      setSearchType(savedType);
    }
  }, []);

  const updatePreferences = (proEnabled: boolean, type: 'auto' | 'pro' | 'deepResearch') => {
    setIsProEnabled(proEnabled);
    setSearchType(type);
    localStorage.setItem('searchPreferences', JSON.stringify({
      isProEnabled: proEnabled,
      searchType: type
    }));
  };

  return {
    isProEnabled,
    searchType,
    updatePreferences
  };
}