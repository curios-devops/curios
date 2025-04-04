import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegularSearch from './RegularSearch';
import ProSearch from './ProSearch';
import { useSearchPreferences } from '../../hooks/useSearchPreferences';
import { useUserType } from '../../hooks/useUserType';
import { useSession } from '../../hooks/useSession';

export default function SearchContainer() {
  const userType = useUserType();
  const { session } = useSession();
  const navigate = useNavigate();
  const { isProEnabled, searchType, updatePreferences } = useSearchPreferences();

  const handleSearch = (query: string, type: string) => {
    if (!query.trim()) return;
    
    switch (type) {
      case 'pro':
        navigate(`/pro-search?q=${encodeURIComponent(query)}`);
        break;
      case 'deep-research':
        navigate(`/deep-research?q=${encodeURIComponent(query)}`);
        break;
      default:
        navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="relative">
      {session ? (
        <ProSearch
          isProEnabled={isProEnabled}
          searchType={searchType}
          onUpdatePreferences={updatePreferences}
          onSearch={handleSearch}
        />
      ) : (
        <RegularSearch onSearch={handleSearch} />
      )}
    </div>
  );
}