import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAccentColor } from '../../hooks/useAccentColor';
import { AccentColor, accentColors } from '../../config/themeColors';

export default function ThemeToggle() {
	const { theme, setTheme, accentColor: selectedAccentColor, setAccentColor } = useTheme();
	const { t } = useTranslation();
	const accentColor = useAccentColor();

	const THEME_OPTIONS = [
		{ key: 'light', label: t('light'), icon: Sun },
		{ key: 'dark', label: t('dark'), icon: Moon },
		{ key: 'system', label: t('system'), icon: Monitor }
	];
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

	const isDarkMode = (selectedTheme === 'dark' || (selectedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));

		return (
		<div className="relative" ref={ref}>
			<button
				onClick={() => setOpen(!open)}
				className={`flex items-center justify-center w-7 h-7 rounded-full border focus:outline-none shadow-md relative group
						${isDarkMode
							? 'bg-[#23272A] border-[#3A3F42] text-white'
							: 'bg-[#FAFBF9] border-[#D1D5DB] text-[#2A3B39]'}
						`}
				style={{
					boxShadow: open 
						? (isDarkMode ? '0 0 0 2px #23272A' : `0 0 0 2px ${accentColor.primary}`)
						: undefined,
					outline: 'none',
					transition: 'border-color 200ms'
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.borderColor = accentColor.primary;
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.borderColor = isDarkMode ? '#3A3F42' : '#D1D5DB';
				}}
				aria-label="Theme selector"
			>
					{selectedTheme === 'light' && <Sun size={15} />}
					{selectedTheme === 'dark' && <Moon size={15} />}
					{selectedTheme === 'system' && <Monitor size={15} />}
														{/* Tooltip below button, right-aligned */}
														<span
															className={`absolute top-full mt-2 right-0 translate-x-0 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50
																${(selectedTheme === 'dark' || (selectedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
																	? 'bg-gray-800 text-gray-100'
																	: 'bg-gray-100 text-gray-800'}
															`}
														>
															{t('themeSelectorTooltip')}
														</span>
				</button>
			{open && (
				<div className={`absolute right-0 top-full mt-2 w-40 rounded-xl shadow-lg z-50 py-1 animate-fade-in text-xs border transition-colors duration-200
					${(selectedTheme === 'dark' || (selectedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
						? 'bg-[#181A1B] border-[#23272A] text-white' : 'bg-[#FAFBF9] border-[#E3E6E3] text-[#2A3B39]'}`}
				>
					<div className="flex flex-col">
						{THEME_OPTIONS.map((option) => {
							const isSelected = selectedTheme === option.key;
							const isDark = (selectedTheme === 'dark' || (selectedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
							return (
								<button
									key={option.key}
									className={`flex items-center gap-2 px-4 py-2 text-left rounded-lg transition-colors font-normal text-xs
										${isSelected && isDark
											? 'bg-[#23272A] text-white'
											: isDark
												? 'bg-transparent text-white hover:bg-[#23272A]'
												: isSelected
													? 'bg-[#F3F6F4] text-[#2A3B39]'
													: 'bg-transparent text-[#2A3B39] hover:bg-[#F3F6F4]'}
								`}
									onClick={() => handleThemeSelect(option.key as 'light' | 'dark' | 'system')}
								>
									<option.icon size={15} className="mr-2" />
									<span>{option.label}</span>
								</button>
							);
						})}
						
						{/* Color Selector */}
						<div className={`border-t mt-1 pt-2 px-4 pb-2 ${isDarkMode ? 'border-[#23272A]' : 'border-[#E3E6E3]'}`}>
							<div className="text-[10px] mb-2 opacity-70">{t('accentColor')}</div>
							<div className="flex gap-2 justify-center">
								{(['blue', 'green', 'purple', 'orange'] as AccentColor[]).map((color) => {
									const colorConfig = accentColors[color][isDarkMode ? 'dark' : 'light'];
									const isSelectedColor = selectedAccentColor === color;

									// Border styles for selected/unselected (lighter gray border for better contrast)
									const selectedBorderClass = 'border-gray-400';

									return (
										<button
											key={color}
											onClick={() => setAccentColor(color)}
											className={`w-5 h-5 rounded-md transition-transform ${isSelectedColor ? `border-2 ${selectedBorderClass} scale-105` : 'border border-transparent hover:scale-105'}`}
											style={{
												backgroundColor: colorConfig.primary,
												boxShadow: isSelectedColor ? '0 1px 3px rgba(0,0,0,0.2)' : undefined
											}}
											title={color.charAt(0).toUpperCase() + color.slice(1)}
											aria-label={`Select ${color} accent color`}
										/>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}