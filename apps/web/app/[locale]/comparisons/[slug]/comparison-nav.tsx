'use client';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Trophy, Layers, FileText } from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
	overview: <LayoutDashboard className="w-3.5 h-3.5" />,
	verdict: <Trophy className="w-3.5 h-3.5" />,
	dimensions: <Layers className="w-3.5 h-3.5" />,
	article: <FileText className="w-3.5 h-3.5" />,
};

interface NavSection {
	id: string;
	label: string;
	iconKey: string;
}

interface ComparisonNavProps {
	sections: NavSection[];
}

export function ComparisonNav({ sections }: ComparisonNavProps) {
	const [activeId, setActiveId] = useState<string>('');
	const [tooltip, setTooltip] = useState<string | null>(null);

	useEffect(() => {
		const OFFSET = 120; // px from viewport top — section is considered "active" once its top crosses this line

		const update = () => {
			let current = '';
			for (const { id } of sections) {
				const el = document.getElementById(id);
				if (!el) continue;
				if (el.getBoundingClientRect().top <= OFFSET) {
					current = id;
				}
			}
			setActiveId(current);
		};

		update(); // set on mount
		window.addEventListener('scroll', update, { passive: true });
		return () => window.removeEventListener('scroll', update);
	}, [sections]);

	const scrollTo = (id: string) => {
		const el = document.getElementById(id);
		if (!el) return;
		const y = el.getBoundingClientRect().top + window.scrollY - 88;
		window.scrollTo({ top: y, behavior: 'smooth' });
	};

	return (
		<nav
			aria-label="Page sections"
			className="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex-col gap-1.5 hidden xl:flex"
		>
			{/* Rail */}
			<div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-px bg-gray-200 dark:bg-white/10 -z-10" />

			{sections.map((section) => {
				const isActive = activeId === section.id;
				return (
					<div key={section.id} className="relative flex items-center justify-end group">
						{/* Tooltip */}
						<div className={`absolute right-11 whitespace-nowrap rounded-sm border border-gray-100 bg-white dark:border-white/10 dark:bg-[#111111] px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-md pointer-events-none transition-all duration-150 ${
							tooltip === section.id ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-1'
						}`}>
							{section.label}
							<span className="absolute right-1.25 top-1/2 -translate-y-1/2 border-[5px] border-transparent border-l-white dark:border-l-gray-900" />
						</div>
						<button
							onClick={() => scrollTo(section.id)}
							onMouseEnter={() => setTooltip(section.id)}
							onMouseLeave={() => setTooltip(null)}
							aria-label={`Jump to ${section.label}`}
							className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
								isActive
									? 'bg-theme-primary text-white shadow-md shadow-theme-primary/30 scale-110'
									: 'bg-white dark:bg-[#111111] ring-1 ring-gray-200 dark:ring-white/10 text-gray-400 dark:text-gray-500 hover:ring-theme-primary/40 hover:text-theme-primary dark:hover:text-theme-primary hover:scale-105'
							}`}
						>
							{ICON_MAP[section.iconKey] ?? <LayoutDashboard className="w-3.5 h-3.5" />}
							{isActive && (
								<span className="absolute inset-0 rounded-full bg-theme-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
							)}
						</button>
					</div>
				);
			})}
		</nav>
	);
}
