import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { useState, useRef, useEffect } from 'react';

const THEME_OPTIONS = [
	{ key: 'light', label: 'Light', icon: Sun },
	{ key: 'dark', label: 'Dark', icon: Moon },
	{ key: 'system', label: 'System', icon: Monitor }
];

export default function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	// Default to system theme
	const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>(theme || 'system');

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Sync selectedTheme with context theme
	useEffect(() => {
		setSelectedTheme(theme || 'system');
	}, [theme]);

	// Theme selection logic
	const handleThemeSelect = (key: 'light' | 'dark' | 'system') => {
		setSelectedTheme(key);
		setTheme(key);
		setOpen(false);
	};

	return (
		<div className="relative" ref={ref}>
			<button
				onClick={() => setOpen(!open)}
				className={`flex items-center justify-center w-7 h-7 rounded-full border border-gray-200 shadow-sm bg-white text-gray-700 text-sm font-medium hover:bg-gray-100 focus:outline-none transition-colors duration-200 ${open ? 'ring-2 ring-gray-300' : ''}`}
				title="Theme settings"
			>
				{selectedTheme === 'light' && <Sun size={16} />}
				{selectedTheme === 'dark' && <Moon size={16} />}
				{selectedTheme === 'system' && <Monitor size={16} />}
			</button>
			{open && (
				<div className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-2 animate-fade-in text-sm" style={{ zIndex: 9999 }}>
					<div className="flex flex-col">
						{THEME_OPTIONS.map((option) => (
							<button
								key={option.key}
								className={`flex items-center gap-2 px-4 py-2 text-left rounded transition-colors font-medium text-gray-700 ${selectedTheme === option.key ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50'}`}
								onClick={() => handleThemeSelect(option.key as 'light' | 'dark' | 'system')}
							>
								<option.icon size={18} className="mr-2" />
								<span>{option.label}</span>
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}