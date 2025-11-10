import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface FocusCategorySelectorProps {
  currentFocus: string;
  onFocusChange: (newFocus: string) => void;
}

export const FocusCategorySelector: React.FC<FocusCategorySelectorProps> = ({ 
  currentFocus, 
  onFocusChange 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const focusCategories = [
    { id: 'ANALYSIS', label: 'ANALYSIS' },
    { id: 'ARTS', label: 'ARTS' },
    { id: 'BUSINESS', label: 'BUSINESS' },
    { id: 'HEALTH & SPORT', label: 'HEALTH & SPORT' },
    { id: 'SCIENCES & TECH', label: 'SCIENCES & TECH' }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  return (
    <div 
      className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 px-6 py-3 mb-6"
      ref={dropdownRef}
    >
      <div className="flex items-center gap-3 relative">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          TOPICS:
        </span>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="bg-black text-white px-3 py-1 text-sm font-medium uppercase tracking-wider hover:bg-gray-800 transition-colors flex items-center gap-2 rounded"
        >
          {currentFocus}
          <ChevronDown className="w-4 h-4" />
        </button>
        
        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute top-full left-[70px] mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-10 min-w-[200px] rounded-md overflow-hidden">
            {focusCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setShowDropdown(false);
                  if (category.id !== currentFocus) {
                    onFocusChange(category.id);
                  }
                }}
                className={`w-full text-left px-4 py-2 text-sm font-medium uppercase tracking-wider hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  category.id === currentFocus
                    ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
