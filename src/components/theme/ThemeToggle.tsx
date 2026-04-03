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
	const isGrayAccent = selectedAccentColor === 'gray';
	const controlBackground = isGrayAccent ? accentColor.dark : accentColor.primary;
	const controlForeground = isGrayAccent ? accentColor.light : 'var(--ui-text-on-accent)';
	const controlHoverBackground = isGrayAccent ? accentColor.primary : accentColor.hover;
	const tooltipBackground = isGrayAccent ? accentColor.primary : 'var(--ui-bg-elevated)';
	const tooltipForeground = isGrayAccent ? accentColor.dark : 'var(--ui-text-primary)';
	const tooltipBorder = isGrayAccent ? accentColor.dark : 'var(--ui-border-subtle)';

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
				className="flex items-center justify-center w-7 h-7 rounded-lg border focus:outline-none shadow-md relative group"
				style={{
					boxShadow: open 
						? `0 0 0 2px ${isGrayAccent ? accentColor.dark : accentColor.primary}`
						: undefined,
					outline: 'none',
					transition: 'border-color 200ms, background-color 200ms, color 200ms',
					backgroundColor: controlBackground,
					color: controlForeground,
					borderColor: isGrayAccent ? accentColor.dark : accentColor.primary,
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.backgroundColor = controlHoverBackground;
					if (isGrayAccent) {
						e.currentTarget.style.color = accentColor.dark;
						e.currentTarget.style.borderColor = accentColor.dark;
					} else {
						e.currentTarget.style.borderColor = accentColor.hover;
					}
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.backgroundColor = controlBackground;
					e.currentTarget.style.color = controlForeground;
					e.currentTarget.style.borderColor = isGrayAccent ? accentColor.dark : accentColor.primary;
				}}
				aria-label="Theme selector"
			>
					{selectedTheme === 'light' && <Sun size={15} />}
					{selectedTheme === 'dark' && <Moon size={15} />}
					{selectedTheme === 'system' && <Monitor size={15} />}
														{/* Tooltip below button, right-aligned */}
														<span
															className="absolute top-full mt-2 right-0 translate-x-0 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border"
															style={{
																backgroundColor: tooltipBackground,
																color: tooltipForeground,
																borderColor: tooltipBorder,
															}}
														>
															{t('themeSelectorTooltip')}
														</span>
				</button>
			{open && (
				<div
					className="absolute right-0 top-full mt-2 w-40 rounded-xl shadow-lg z-50 py-1 animate-fade-in text-xs border transition-colors duration-200"
					style={{
						backgroundColor: 'var(--ui-bg-elevated)',
						borderColor: 'var(--ui-border-subtle)',
						color: 'var(--ui-text-primary)',
					}}
				>
					<div className="flex flex-col">
						{THEME_OPTIONS.map((option) => {
							const isSelected = selectedTheme === option.key;
							const selectedBackground = isGrayAccent ? accentColor.primary : 'var(--ui-bg-secondary)';
							const selectedText = isGrayAccent ? accentColor.dark : accentColor.primary;
							return (
								<button
									key={option.key}
									className="flex items-center gap-2 px-4 py-2 text-left rounded-lg transition-colors font-normal text-xs"
									style={{
										backgroundColor: isSelected ? selectedBackground : 'transparent',
										color: isSelected ? selectedText : 'var(--ui-text-primary)',
									}}
									onMouseEnter={(e) => {
										if (!isSelected) {
											e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
											e.currentTarget.style.color = isGrayAccent ? accentColor.dark : accentColor.primary;
										}
									}}
									onMouseLeave={(e) => {
										if (!isSelected) {
											e.currentTarget.style.backgroundColor = 'transparent';
											e.currentTarget.style.color = 'var(--ui-text-primary)';
										}
									}}
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
								{(['blue', 'green', 'purple', 'orange', 'gray'] as AccentColor[]).map((color) => {
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