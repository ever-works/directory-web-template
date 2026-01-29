import type { LucideIcon } from 'lucide-react';
import type { ItemLocationData } from '@/lib/types/item';

export interface ProductLink {
	id: string;
	url: string;
	label: string;
	type: 'main' | 'secondary';
	icon?: string;
}

export interface FormData {
	name: string;
	link: string;
	links: ProductLink[];
	category: string | null;
	tags: string[];
	description: string;
	introduction: string;
	video_url?: string;
	selectedPlan?: string;
	location?: ItemLocationData;
	[key: string]: unknown;
}

export interface StepDefinition {
	id: number;
	title: string;
	description: string;
	icon?: LucideIcon;
	fields: string[];
	color: string;
}

export const STEP_DEFINITIONS: StepDefinition[] = [
	{
		id: 1,
		title: 'Basic Information',
		description: 'Basic Information Description',
		fields: ['name', 'link'],
		color: 'from-theme-primary-500 to-purple-500'
	},
	{
		id: 2,
		title: 'Payment',
		description: 'Payment Description',
		fields: ['selectedPlan'],
		color: 'from-purple-500 to-pink-500'
	},
	{
		id: 3,
		title: 'Review',
		description: 'Review Description',
		fields: [],
		color: 'from-orange-500 to-red-500'
	}
];

export const STEP_INDICATOR_CLASSES = {
	wrapper: 'flex items-center justify-between mb-8',
	stepContainer: 'flex flex-col items-center',
	button: {
		base: 'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 mb-2',
		active: 'scale-110 shadow-lg',
		completed: 'bg-green-500 text-white shadow-lg',
		accessible:
			'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
		inaccessible: 'bg-gray-200 dark:bg-gray-700 text-gray-400'
	},
	label: {
		base: 'text-sm font-medium text-center',
		active: 'text-theme-primary-600 dark:text-theme-primary-400',
		completed: 'text-green-600 dark:text-green-400',
		default: 'text-gray-500 dark:text-gray-400'
	},
	connector: {
		base: 'flex-1 h-0.5 mx-4 transition-colors duration-300',
		completed: 'bg-green-500',
		default: 'bg-gray-200 dark:bg-gray-700'
	}
};

export const PROGRESS_BAR_CLASSES = {
	container: 'relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner',
	bar: 'h-full bg-theme-primary-500 rounded-full transition-all duration-700 ease-out shadow-lg',
	shimmer: 'absolute inset-0 bg-white/20 rounded-full animate-shimmer'
};

export const HEADER_CLASSES = {
	wrapper: 'text-center mb-16 animate-fade-in-up',
	badge: 'inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xs border border-gray-200/50 dark:border-gray-700/50 mb-6',
	badgeIcon: 'w-8 h-8 rounded-full bg-theme-primary-500 flex items-center justify-center',
	badgeIconInner: 'w-4 h-4 text-white animate-pulse',
	badgeText: 'text-sm font-semibold text-gray-700 dark:text-gray-300',
	title: 'text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 bg-linear-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent',
	description: 'text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed'
};

export const BACKGROUND_CLASSES = {
	container: 'absolute inset-0 overflow-hidden pointer-events-none',
	blob1: 'absolute top-0 -left-4 w-96 h-96 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 dark:from-blue-600/20 dark:via-purple-600/20 dark:to-cyan-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob',
	blob2: 'absolute top-0 -right-4 w-96 h-96 bg-linear-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 dark:from-purple-600/20 dark:via-pink-600/20 dark:to-orange-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000',
	blob3: 'absolute -bottom-8 left-1/4 w-96 h-96 bg-linear-to-r from-green-500/10 via-blue-500/10 to-indigo-500/10 dark:from-green-600/20 dark:via-blue-600/20 dark:to-indigo-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000'
};

export const FORM_FIELD_CLASSES = {
	label: 'block text-sm font-bold text-gray-700 dark:text-gray-300',
	input: {
		base: 'w-full h-14 px-6 pr-14 text-lg bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-200/60 dark:border-gray-600/50 rounded-2xl transition-all duration-300 focus:ring-4 focus:ring-theme-primary-500/20 focus:border-theme-primary-500 dark:focus:border-theme-primary-400 hover:border-gray-300 dark:hover:border-gray-500 outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400',
		focused: 'scale-[1.02] shadow-xl ring-4 ring-theme-primary-500/20'
	},
	textarea: {
		base: 'w-full px-6 py-4 text-lg bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-200/60 dark:border-gray-600/50 rounded-2xl transition-all duration-300 focus:ring-4 focus:ring-theme-primary-500/20 focus:border-theme-primary-500 dark:focus:border-theme-primary-400 hover:border-gray-300 dark:hover:border-gray-500 resize-none outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400',
		focused: 'scale-[1.02] shadow-xl ring-4 ring-theme-primary-500/20'
	},
	select: {
		base: 'w-full h-14 px-6 pr-14 text-lg bg-gray-50/80 dark:bg-gray-900/50 border-2 border-gray-200/60 dark:border-gray-600/50 rounded-2xl transition-all duration-300 focus:ring-4 focus:ring-theme-primary-500/20 focus:border-theme-primary-500 dark:focus:border-theme-primary-400 hover:border-gray-300 dark:hover:border-gray-500 appearance-none cursor-pointer outline-hidden text-gray-900 dark:text-white',
		focused: 'scale-[1.02] shadow-xl ring-4 ring-theme-primary-500/20'
	},
	videoInput: {
		base: 'w-full h-12 px-4 pr-12 text-base bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl transition-all duration-300 outline-hidden text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400',
		focus: 'focus:border-theme-primary-500 dark:focus:border-theme-primary-400 focus:ring-4 focus:ring-theme-primary-500/20'
	}
};

export const TAG_CLASSES = {
	container: 'flex flex-wrap gap-3',
	button: {
		base: 'px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 hover:scale-105 border-2 capitalize',
		selected: 'text-white border-transparent shadow-lg bg-theme-primary-500',
		unselected:
			'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
	},
	showMore:
		'px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 hover:scale-105 border-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 flex items-center gap-2',
	selectedSummary: {
		container:
			'p-4 bg-theme-primary-50 dark:bg-gray-800 rounded-2xl border border-theme-primary-200 dark:border-theme-primary-800',
		header: 'flex items-center gap-2 mb-2',
		icon: 'w-4 h-4 text-theme-primary-500 dark:text-theme-primary-400',
		label: 'text-sm font-semibold text-theme-primary-700 dark:text-theme-primary-300',
		tags: 'flex flex-wrap gap-2',
		tag: 'px-3 py-1 text-xs font-medium bg-theme-primary-500 text-white rounded-lg capitalize'
	}
};

export const STEP_CARD_CLASSES = {
	wrapper: 'relative group animate-fade-in-up',
	background: 'absolute inset-0 bg-theme-primary-500/20 opacity-0 transition-opacity duration-500',
	content: 'relative py-8',
	header: {
		wrapper: 'flex items-center gap-3 mb-8',
		icon: 'w-12 h-12 rounded-2xl bg-theme-primary-500 flex items-center justify-center',
		iconInner: 'w-6 h-6 text-white',
		title: 'text-2xl font-bold text-gray-900 dark:text-white'
	},
	reviewCard: {
		wrapper: 'relative group animate-fade-in-up',
		glow: 'absolute inset-0 bg-linear-to-r from-orange-500/20 to-red-500/20 dark:from-orange-400/30 dark:to-red-400/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500',
		content:
			'relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 p-8 shadow-2xl',
		header: {
			wrapper: 'flex items-center gap-3 mb-8',
			icon: 'w-12 h-12 rounded-2xl bg-linear-to-r from-orange-500 to-red-500 flex items-center justify-center',
			iconInner: 'w-6 h-6 text-white',
			title: 'text-2xl font-bold text-gray-900 dark:text-white'
		},
		field: 'p-4 bg-gray-50 dark:bg-gray-800 rounded-xl',
		fieldTitle: 'font-semibold text-gray-900 dark:text-white mb-2',
		fieldValue: 'text-gray-600 dark:text-gray-300'
	}
};

export const NAVIGATION_CLASSES = {
	container: 'flex flex-col sm:flex-row justify-between gap-6 pt-8 animate-fade-in-up',
	button: {
		base: 'h-12 px-6 sm:h-14 sm:px-8 rounded-2xl font-bold text-base sm:text-lg transition-all duration-300 hover:scale-105 border-2',
		next: {
			enabled:
				'h-12 px-8 sm:h-14 sm:px-12 rounded-2xl font-bold text-base sm:text-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-xl hover:shadow-2xl min-w-[160px] sm:min-w-[200px] bg-theme-primary-500 text-white hover:shadow-theme-primary-500/30',
			disabled:
				'h-12 px-8 sm:h-14 sm:px-12 rounded-2xl font-bold text-base sm:text-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-xl hover:shadow-2xl min-w-[160px] sm:min-w-[200px] bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
		},
		submit: {
			enabled:
				'h-12 px-8 sm:h-14 sm:px-12 rounded-2xl font-bold text-base sm:text-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-xl hover:shadow-2xl min-w-[160px] sm:min-w-[200px] bg-linear-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-600 hover:via-emerald-600 hover:to-green-700 text-white hover:shadow-green-500/30',
			disabled:
				'h-12 px-8 sm:h-14 sm:px-12 rounded-2xl font-bold text-base sm:text-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 shadow-xl hover:shadow-2xl min-w-[160px] sm:min-w-[200px] bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
		}
	}
};

export const VIDEO_PREVIEW_CLASSES = {
	container: 'mt-4',
	wrapper: 'relative pb-[56.25%] h-0 overflow-hidden rounded-2xl shadow-lg',
	iframe: 'absolute top-0 left-0 w-full h-full'
};

export function validateBasicInfo(data: FormData): boolean {
	return Boolean(data.name?.trim() && data.link?.trim());
}

export function validatePayment(data: FormData): boolean {
	return !!data.selectedPlan;
}

export function validateReview(): boolean {
	return true;
}

export function validateStep(step: number, data: FormData): boolean {
	switch (step) {
		case 1:
			return validateBasicInfo(data);
		case 2:
			return validatePayment(data);
		case 3:
			return validateReview();
		default:
			return false;
	}
}

export const ALLOWED_VIDEO_HOSTS = [
	'youtube.com',
	'www.youtube.com',
	'youtu.be',
	'vimeo.com',
	'www.vimeo.com'
] as const;

export function isValidVideoUrl(url: string): boolean {
	try {
		const parsedUrl = new URL(url);
		return ALLOWED_VIDEO_HOSTS.includes(parsedUrl.hostname as (typeof ALLOWED_VIDEO_HOSTS)[number]);
	} catch {
		return false;
	}
}

export const MAX_DESCRIPTION_LENGTH = 150;
export const DEFAULT_TAGS_TO_SHOW = 18;
