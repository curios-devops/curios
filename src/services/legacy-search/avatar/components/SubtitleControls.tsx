import { Eye, EyeOff, Type, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd } from 'lucide-react';

interface SubtitleControlsProps {
  enabled: boolean;
  color: 'black' | 'white' | 'accent';
  size: 's' | 'm' | 'l';
  position: 'middle' | 'down';
  onToggleEnabled: () => void;
  onColorChange: (color: 'black' | 'white' | 'accent') => void;
  onSizeChange: (size: 's' | 'm' | 'l') => void;
  onPositionChange: (position: 'middle' | 'down') => void;
}

export default function SubtitleControls({
  enabled,
  color,
  size,
  position,
  onToggleEnabled,
  onColorChange,
  onSizeChange,
  onPositionChange
}: SubtitleControlsProps) {
  return (
    <div className="flex items-center gap-3 justify-center flex-wrap">
      {/* Toggle On/Off */}
      <button
        onClick={onToggleEnabled}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={enabled ? 'Hide captions' : 'Show captions'}
      >
        {enabled ? <Eye size={20} /> : <EyeOff size={20} />}
      </button>

      {/* Color Selection */}
      <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
        <button
          onClick={() => onColorChange('black')}
          className={`w-6 h-6 rounded bg-black border-2 ${color === 'black' ? 'border-blue-500' : 'border-transparent'}`}
          title="Black background"
        />
        <button
          onClick={() => onColorChange('white')}
          className={`w-6 h-6 rounded bg-white border-2 ${color === 'white' ? 'border-blue-500' : 'border-gray-300'}`}
          title="White background"
        />
        <button
          onClick={() => onColorChange('accent')}
          className={`w-6 h-6 rounded border-2 ${color === 'accent' ? 'border-blue-500' : 'border-transparent'}`}
          style={{ backgroundColor: 'var(--accent-primary)' }}
          title="Accent color"
        />
      </div>

      {/* Size Selection */}
      <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
        <button
          onClick={() => onSizeChange('s')}
          className={`px-2 py-1 rounded text-xs ${size === 's' ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Small text"
        >
          <Type size={14} />
        </button>
        <button
          onClick={() => onSizeChange('m')}
          className={`px-2 py-1 rounded text-sm ${size === 'm' ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Medium text"
        >
          <Type size={16} />
        </button>
        <button
          onClick={() => onSizeChange('l')}
          className={`px-2 py-1 rounded text-base ${size === 'l' ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Large text"
        >
          <Type size={18} />
        </button>
      </div>

      {/* Position Selection */}
      <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
        <button
          onClick={() => onPositionChange('middle')}
          className={`p-2 rounded ${position === 'middle' ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Middle position"
        >
          <AlignVerticalJustifyCenter size={16} />
        </button>
        <button
          onClick={() => onPositionChange('down')}
          className={`p-2 rounded ${position === 'down' ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Bottom position"
        >
          <AlignVerticalJustifyEnd size={16} />
        </button>
      </div>
    </div>
  );
}
