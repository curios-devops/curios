import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none transition-colors duration-200"
      title={`Switch to ${theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'} mode`}
    >
      {theme === 'dark' && <Sun size={18} />}
      {theme === 'light' && <Moon size={18} />}
      {theme === 'system' && <Monitor size={18} />}
    </button>
  )
}