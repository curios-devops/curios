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
	const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
	const isGrayAccent = selectedAccentColor === 'gray';
	const tooltipBackground = isGrayAccent ? accentColor.primary : 'var(--ui-bg-elevated)';
	const tooltipForeground = isDarkMode ? '#F9FAFB' : '#111827';
	const tooltipBorder = isGrayAccent ? accentColor.dark : 'var(--ui-border-subtle)';
	const selectableAccentColors: AccentColor[] = ['blue', 'teal', 'purple', 'orange'];

	const THEME_OPTIONS = [
		{ key: 'light' as const, label: t('light'), icon: Sun },
		{ key: 'dark' as const, label: t('dark'), icon: Moon },
		{ key: 'system' as const, label: t('system'), icon: Monitor },
	];

	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

	return (
		<div className="relative" ref={ref}>
			<button
				onClick={() => setOpen(!open)}
				className="flex items-center justify-center w-7 h-7 rounded-lg border-0 focus:outline-none relative group"
				style={{
					boxShadow: open ? `0 0 0 2px ${isGrayAccent ? accentColor.dark : accentColor.primary}` : undefined,
					outline: 'none',
					transition: 'color 200ms',
					backgroundColor: 'transparent',
					color: 'var(--ui-text-primary)',
				}}
				onMouseEnter={(e) => { e.currentTarget.style.color = accentColor.primary; }}
				onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ui-text-primary)'; }}
				aria-label="Theme selector"
			>
				<ThemeIcon size={15} />
				<span
					className="absolute top-full mt-2 right-0 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border"
					style={{ backgroundColor: tooltipBackground, color: tooltipForeground, borderColor: tooltipBorder }}
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
							const isSelected = theme === option.key;
							const selectedText = isGrayAccent ? accentColor.dark : accentColor.primary;
							const hoverBackground = isGrayAccent
								? (isDarkMode ? accentColor.light : '#F9F9F9')
								: 'var(--ui-bg-secondary)';
							const hoverBorder = isGrayAccent
								? (isDarkMode ? 'var(--ui-border-subtle)' : '#ECECEC')
								: accentColor.light;
							return (
								<button
									key={option.key}
									className="flex items-center gap-2 px-4 py-2 text-left rounded-lg border transition-colors font-normal text-xs"
									style={{
										backgroundColor: 'transparent',
										borderColor: 'transparent',
										color: isSelected ? selectedText : 'var(--ui-text-primary)',
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.backgroundColor = hoverBackground;
										e.currentTarget.style.borderColor = hoverBorder;
										e.currentTarget.style.color = isGrayAccent ? accentColor.dark : accentColor.primary;
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.backgroundColor = 'transparent';
										e.currentTarget.style.borderColor = 'transparent';
										e.currentTarget.style.color = isSelected ? selectedText : 'var(--ui-text-primary)';
									}}
									onClick={() => { setTheme(option.key); setOpen(false); }}
								>
									<option.icon size={15} className="mr-2" />
									<span>{option.label}</span>
								</button>
							);
						})}

						{/* Accent color selector */}
						<div className="border-t mt-1 pt-2 px-4 pb-2" style={{ borderColor: 'var(--ui-border-subtle)' }}>
							<div className="text-[10px] mb-2 opacity-70">{t('accentColor')}</div>
							<div className="flex gap-2 justify-center">
								{selectableAccentColors.map((color) => {
									const colorConfig = accentColors[color][isDarkMode ? 'dark' : 'light'];
									const isSelectedColor = selectedAccentColor === color;
									return (
										<button
											key={color}
											onClick={() => setAccentColor(isSelectedColor ? 'gray' : color)}
											className={`w-5 h-5 rounded-md transition-transform ${isSelectedColor ? 'border-2 border-gray-400 scale-105' : 'border border-transparent hover:scale-105'}`}
											style={{
												backgroundColor: colorConfig.primary,
												boxShadow: isSelectedColor ? '0 1px 3px rgba(0,0,0,0.2)' : undefined,
											}}
											title={isSelectedColor ? `Turn off ${color} accent` : color.charAt(0).toUpperCase() + color.slice(1)}
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
