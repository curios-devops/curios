import type { ChangeEvent } from 'react';

interface FormInputProps {
  id: string;
  name: string;
  type: string;
  label: string;
  value: string;
  error?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function FormInput({
  id,
  name,
  type,
  label,
  value,
  error,
  onChange,
  placeholder,
  disabled = false,
}: FormInputProps) {
  return (
    <div>
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-gray-300 mb-1"
      >
        {label}
      </label>
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full bg-[#222222] border ${
          error ? 'border-red-500' : 'border-gray-700'
        } rounded-lg p-3 text-white focus:outline-none`}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-primary)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? '#ef4444' : '#374151';
        }}
        placeholder={placeholder}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}