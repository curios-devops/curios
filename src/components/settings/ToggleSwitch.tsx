
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function ToggleSwitch({ checked, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <div className={`relative inline-block w-11 h-6 ${disabled ? 'opacity-50' : ''}`}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className={`
        w-11 h-6 
        bg-[#222222] 
        peer-checked:bg-[var(--accent-primary)] 
        rounded-full 
        peer 
        peer-checked:after:translate-x-full 
        after:content-[''] 
        after:absolute 
        after:top-0.5 
        after:left-[2px] 
        after:bg-white 
        after:rounded-full 
        after:h-5 
        after:w-5 
        after:transition-all
        ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
      `} />
    </div>
  );
}