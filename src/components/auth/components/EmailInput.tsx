import { useTranslation } from "../../../hooks/useTranslation.ts";
import { useTheme } from "../../theme/ThemeContext.tsx"; // Corrected import path

interface EmailInputProps { // Corrected interface syntax
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function EmailInput({ 
  value, 
  onChange, 
  error, 
  disabled 

}: EmailInputProps) {
  const { theme } = useTheme(); // Destructure theme from useTheme
  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="email"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder={useTranslation().t("enter_email")}
          disabled={disabled}
          className={`
            w-full 
            bg-[#222222] 
            border 
            ${error ? 'border-red-500' : 'border-gray-700'} 
            rounded-lg 
            px-4
            py-3.5
            ${theme === 'dark' 
              ? 'bg-[#222222] placeholder-gray-700 text-white' 
              : 'bg-white text-gray-900 placeholder-gray-400'} // Use theme for conditional styling
            focus:outline-none 
            focus:border-[#007BFF] 
            transition-colors
            disabled:opacity-50
            disabled:cursor-not-allowed
          `}
        />
      </div>
      {error && (
        <p className="text-sm text-red-500 pl-1">{error}</p>
      )}
    </div>
  );
}