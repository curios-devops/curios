// Character picker: tall rounded portrait cards (Vivix-style), a search box over
// the cast, plus "upload a photo" and "describe one" to build your own.

import { useRef, useState } from 'react';
import { Search, Upload, Wand2, X, Loader2 } from 'lucide-react';
import { searchCharacters, type CharacterPreset } from '../characterCatalog';
import { characterFromDescription, characterFromPhoto } from '../customCharacter';

// Anything with a portrait can be picked (full-body presets or Anam half-body).
export interface PickableItem { id: string; name: string; tagline: string; imageUrl: string; tags: string[]; personality?: string }

interface Props {
  selectedId: string;
  items: PickableItem[];
  allowCustom: boolean; // "create your own" only exists for full body (Vivix)
  onSelect: (c: PickableItem | CharacterPreset) => void;
  onClose: () => void;
}

export default function CharacterPicker({ selectedId, items, allowCustom, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [describe, setDescribe] = useState('');
  const [busy, setBusy] = useState<null | 'photo' | 'describe'>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const list = searchCharacters(query, items as CharacterPreset[]);

  const build = async (kind: 'photo' | 'describe', run: () => Promise<CharacterPreset>) => {
    setBusy(kind);
    setError(null);
    try {
      onSelect(await run());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the character');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full sm:max-w-3xl max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 sm:p-6"
        style={{ backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--ui-text-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Choose your character</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-full hover:opacity-70">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border mb-4" style={{ borderColor: 'var(--ui-border-default)' }}>
          <Search size={16} style={{ color: 'var(--ui-text-secondary)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search characters (cat, fitness, science…)"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {list.map((c) => {
            const active = c.id === selectedId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c)}
                className="group text-left"
                title={c.personality ?? c.tagline}
              >
                <div
                  className="aspect-[9/16] rounded-full overflow-hidden border-4 transition-transform group-hover:-translate-y-0.5"
                  style={{ borderColor: active ? 'var(--accent-primary)' : 'transparent' }}
                >
                  <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="mt-1.5 text-sm font-medium text-center truncate">{c.name}</div>
                <div className="text-xs text-center truncate" style={{ color: 'var(--ui-text-secondary)' }}>{c.tagline}</div>
              </button>
            );
          })}
          {list.length === 0 && (
            <p className="col-span-full text-sm" style={{ color: 'var(--ui-text-secondary)' }}>No characters match “{query}”.</p>
          )}
        </div>

        {allowCustom && (
        <div className="mt-6 pt-4 border-t space-y-3" style={{ borderColor: 'var(--ui-border-default)' }}>
          <div className="text-sm font-medium">Create your own</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void build('photo', () => characterFromPhoto(file));
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={!!busy}
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-sm disabled:opacity-60"
              style={{ borderColor: 'var(--ui-border-default)' }}
            >
              {busy === 'photo' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Upload a full-body photo
            </button>
            <div className="flex-1 flex gap-2">
              <input
                value={describe}
                onChange={(e) => setDescribe(e.target.value)}
                placeholder="Describe one: a pirate captain with a red coat…"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border bg-transparent outline-none text-sm"
                style={{ borderColor: 'var(--ui-border-default)' }}
              />
              <button
                type="button"
                disabled={!!busy || describe.trim().length < 3}
                onClick={() => void build('describe', () => characterFromDescription(describe))}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
              >
                {busy === 'describe' ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                Create
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        )}
      </div>
    </div>
  );
}
