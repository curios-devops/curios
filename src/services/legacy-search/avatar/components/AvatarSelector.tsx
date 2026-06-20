import type { CSSProperties } from 'react';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User } from 'lucide-react';
import { env } from '../../../../config/env';
import { listAnamAvatars, SelectableAvatar } from '../services/listAnamAvatars';
import { logger } from '../../../../utils/logger';

export interface AvatarOption {
  id: string;
  name: string;
  label: string;
  imageUrl?: string;
}

interface AvatarSelectorProps {
  selectedAvatarId: string;
  onAvatarChange: (avatarId: string) => void;
}

// Desired avatar names to display (if available from Anam API)
const DESIRED_AVATAR_NAMES = ['Cora', 'Liz', 'Astrid', 'Leo', 'Finn', 'Pablo'];

export default function AvatarSelector({ selectedAvatarId, onAvatarChange }: AvatarSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableAvatars, setAvailableAvatars] = useState<AvatarOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedAvatar = availableAvatars.find(a => a.id === selectedAvatarId) || availableAvatars[0];

  // Fetch avatars from Anam API on mount
  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        setIsLoading(true);
        logger.info('🎭 [AvatarSelector] Fetching avatars from Anam API...');

        const anamAvatars = await listAnamAvatars();
        logger.info('✅ [AvatarSelector] Received avatars', { count: anamAvatars.length });

        // Convert to AvatarOption format
        const options: AvatarOption[] = anamAvatars.map((avatar: SelectableAvatar) => ({
          id: avatar.id,
          name: avatar.name.toLowerCase(),
          label: avatar.name,
          imageUrl: avatar.imageUrl,
        }));

        // Add custom CORA avatar if configured in .env
        if (env.anam.avatars.cora) {
          const coraExists = options.some(a => a.id === env.anam.avatars.cora);
          if (!coraExists) {
            options.unshift({
              id: env.anam.avatars.cora,
              name: 'cora',
              label: 'Cora',
              imageUrl: undefined,
            });
            logger.info('➕ [AvatarSelector] Added custom CORA avatar from .env');
          }
        }

        // Filter to show only desired avatars (if they exist in Anam)
        const filtered = options.filter(avatar =>
          DESIRED_AVATAR_NAMES.some(desired =>
            avatar.label.toLowerCase() === desired.toLowerCase()
          )
        );

        // Use filtered list if we found any desired avatars, otherwise use all
        const finalAvatars = filtered.length > 0 ? filtered : options.slice(0, 6);

        setAvailableAvatars(finalAvatars);
        logger.info('✅ [AvatarSelector] Avatars ready', {
          total: finalAvatars.length,
          names: finalAvatars.map(a => a.label)
        });
      } catch (error) {
        logger.error('❌ [AvatarSelector] Failed to fetch avatars', { error });
        // Fallback to CORA only if configured
        if (env.anam.avatars.cora) {
          setAvailableAvatars([{
            id: env.anam.avatars.cora,
            name: 'cora',
            label: 'Cora',
            imageUrl: undefined,
          }]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvatars();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (avatarId: string) => {
    onAvatarChange(avatarId);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
        <span>Loading avatars...</span>
      </div>
    );
  }

  if (availableAvatars.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
        <span>No avatars available</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        type="button"
      >
        <span>{selectedAvatar?.label || 'Select Avatar'}</span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50 p-3">
          {/* 3x2 Grid Layout */}
          <div className="grid grid-cols-3 gap-2 w-[280px]">
            {availableAvatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleSelect(avatar.id)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all ${
                  avatar.id === selectedAvatarId
                    ? 'ring-2 ring-offset-1 dark:ring-offset-gray-800'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                style={
                  avatar.id === selectedAvatarId
                    ? ({ '--tw-ring-color': 'var(--accent-primary)' } as CSSProperties)
                    : {}
                }
                type="button"
                title={avatar.label}
              >
                {/* Avatar Image or Placeholder */}
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  {avatar.imageUrl ? (
                    <img
                      src={avatar.imageUrl}
                      alt={avatar.label}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.fallback-icon')) {
                          const icon = document.createElement('div');
                          icon.className = 'fallback-icon';
                          icon.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-400"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
                          parent.appendChild(icon);
                        }
                      }}
                    />
                  ) : (
                    <User size={32} className="text-gray-400" />
                  )}
                </div>

                {/* Avatar Name */}
                <span
                  className={`text-xs font-medium text-center ${
                    avatar.id === selectedAvatarId ? '' : 'text-gray-700 dark:text-gray-300'
                  }`}
                  style={avatar.id === selectedAvatarId ? { color: 'var(--accent-primary)' } : {}}
                >
                  {avatar.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Export for backward compatibility
export const AVAILABLE_AVATARS: AvatarOption[] = [];
