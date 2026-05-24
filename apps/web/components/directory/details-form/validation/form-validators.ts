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
	/** English fallback title; UI should render `titleKey` via next-intl. */
	title: string;
	/** i18n message key for the step title (namespace-qualified). */
	titleKey: string;
	description: string;
	icon?: LucideIcon;
	/** Required fields that gate navigation to the next step */
	fields: string[];
	/** All trackable fields used for the connector fill progress */
	progressFields?: string[];
	color: string;
}

export const STEP_DEFINITIONS: StepDefinition[] = [
	{
		id: 1,
		title: 'Basic Information',
		titleKey: 'directory.DETAILS_FORM.STEP_TITLE_BASIC_INFO',
		description: 'Basic Information Description',
		fields: ['name', 'link'],
		progressFields: ['name', 'link', 'description', 'introduction', 'tags', 'category', 'video_url'],
		color: 'from-theme-primary-500 to-purple-500'
	},
	{
		id: 2,
		title: 'Payment',
		titleKey: 'directory.DETAILS_FORM.STEP_TITLE_PAYMENT',
		description: 'Payment Description',
		fields: ['selectedPlan'],
		color: 'from-purple-500 to-pink-500'
	},
	{
		id: 3,
		title: 'Review',
		titleKey: 'directory.DETAILS_FORM.STEP_TITLE_REVIEW',
		description: 'Review Description',
		fields: [],
		color: 'from-orange-500 to-red-500'
	}
];

export const STEP_INDICATOR_CLASSES = {
	wrapper: 'flex items-center justify-between mb-8 -mt-3',
	stepContainer: 'flex flex-col items-center',
	button: {
		base: 'w-10 h-10 cursor-pointer rounded-full mt-4 flex items-center justify-center transition-all duration-300 mb-2',
		active: 'shadow-lg',
		completed: 'bg-green-500 text-white shadow-lg',
		accessible:
			'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/6',
		inaccessible: 'bg-gray-200 dark:bg-white/8 text-gray-400'
	},
	label: {
		base: 'text-xs font-medium text-center',
		active: 'text-theme-primary-600 dark:text-theme-primary-400',
		completed: 'text-green-600 dark:text-green-400',
		default: 'text-gray-500 dark:text-gray-400'
	},
	connector: {
		base: 'flex-1 h-[2px] mx-4 rounded-full transition-colors duration-300',
		completed: 'dark:bg-theme-primary-500 bg-theme-primary-400',
		active: 'bg-gradient-to-r from-theme-primary-500 to-theme-primary-200 dark:to-theme-primary-800',
		default: 'bg-gray-200 dark:bg-white/8'
	}
};

export const PROGRESS_BAR_CLASSES = {
	container: 'relative w-[94%] mx-auto -mt-22 mb-20 -z-1 bg-gray-200 dark:bg-white/8 rounded-full h-[2px] overflow-hidden shadow-inner',
	bar: 'h-full bg-theme-primary-500 rounded-full transition-all duration-700 ease-out shadow-lg',
	shimmer: 'absolute inset-0 bg-white/20 rounded-full animate-shimmer'
};

export const HEADER_CLASSES = {
	wrapper: 'text-center mb-16 animate-fade-in-up',
	badge: 'inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-theme-primary-50 dark:bg-theme-primary-900/20 border border-theme-primary-200/70 dark:border-theme-primary-700/40 mb-6 shadow-sm',
	badgeIcon: 'w-6 h-6 rounded-lg bg-theme-primary-500 flex items-center justify-center shadow-sm shadow-theme-primary-500/30',
	badgeIconInner: 'w-3.5 h-3.5 text-white',
	badgeText: 'text-xs font-semibold tracking-wide text-theme-primary-700 dark:text-theme-primary-400',
	title: 'text-4xl md:text-5xl font-bold mb-4 bg-linear-to-r from-gray-900 via-theme-primary-700 to-theme-primary-500 dark:from-white dark:via-theme-primary-200 dark:to-blue-300 bg-clip-text text-transparent tracking-tight',
	description: 'text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed'
};

export const BACKGROUND_CLASSES = {
	container: 'absolute inset-0 overflow-hidden pointer-events-none',
	blob1: 'absolute top-0 -left-4 w-96 h-96 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 dark:from-blue-600/20 dark:via-purple-600/20 dark:to-cyan-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob',
	blob2: 'absolute top-0 -right-4 w-96 h-96 bg-linear-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 dark:from-purple-600/20 dark:via-pink-600/20 dark:to-orange-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000',
	blob3: 'absolute -bottom-8 left-1/4 w-96 h-96 bg-linear-to-r from-green-500/10 via-blue-500/10 to-indigo-500/10 dark:from-green-600/20 dark:via-blue-600/20 dark:to-indigo-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000'
};

const FIELD_BASE = 'w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-theme-primary-500/40 focus:border-theme-primary-400 dark:focus:border-theme-primary-500 hover:border-gray-300 dark:hover:border-white/15';

export const FORM_FIELD_CLASSES = {
	label: 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5',
	input: {
		base: FIELD_BASE,
		focused: 'ring-1 ring-theme-primary-500/40 border-theme-primary-400'
	},
	textarea: {
		base: `${FIELD_BASE} resize-none`,
		focused: 'ring-1 ring-theme-primary-500/40 border-theme-primary-400'
	},
	select: {
		base: `${FIELD_BASE} appearance-none cursor-pointer`,
		focused: 'ring-1 ring-theme-primary-500/40 border-theme-primary-400'
	},
	videoInput: {
		base: `${FIELD_BASE} pr-12`,
		focus: 'focus:ring-1 focus:ring-theme-primary-500/40 focus:border-theme-primary-400'
	}
};

export const TAG_CLASSES = {
	container: 'flex flex-wrap gap-2 items-start',
	button: {
		base: 'px-2.5 py-0.5 cursor-pointer text-xs font-medium rounded-full transition-colors duration-150 border capitalize',
		selected: 'bg-theme-primary-500 text-white border-theme-primary-500 dark:bg-theme-primary-600 dark:border-theme-primary-600',
		unselected: 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/8 hover:bg-gray-50 dark:hover:bg-white/8 hover:border-gray-300 dark:hover:border-white/12'
	},
	showMore: 'px-2.5 py-0.5 cursor-pointer text-xs font-medium rounded-full transition-colors duration-150 border bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/8 hover:bg-gray-50 dark:hover:bg-white/8 flex items-center gap-1.5',
	selectedSummary: {
		container: 'p-3.5 bg-theme-primary-50/60 dark:bg-white/5 rounded-xl border border-theme-primary-100 dark:border-white/8',
		header: 'flex items-center gap-2 mb-2',
		icon: 'w-3.5 h-3.5 text-theme-primary-500 dark:text-theme-primary-400',
		label: 'text-xs font-semibold text-theme-primary-700 dark:text-theme-primary-300',
		tags: 'flex flex-wrap gap-1.5',
		tag: 'px-2 py-0.5 text-xs font-medium bg-theme-primary-500 text-white rounded-full capitalize'
	}
};

export const STEP_CARD_CLASSES = {
	wrapper: 'relative animate-fade-in-up',
	background: '',
	content: 'relative rounded-xl border border-gray-200 dark:border-white/6 bg-white dark:bg-white/3 shadow-sm p-6 md:p-8',
	header: {
		wrapper: 'flex items-center gap-3 mb-6',
		icon: 'w-10 h-10 rounded-xl bg-theme-primary-500/10 dark:bg-theme-primary-500/20 flex items-center justify-center flex-shrink-0',
		iconInner: 'w-5 h-5 text-theme-primary-500 dark:text-theme-primary-400',
		title: 'text-xl font-semibold text-gray-900 dark:text-white'
	},
	reviewCard: {
		wrapper: 'relative animate-fade-in-up',
		glow: '',
		content: 'relative rounded-xl border border-gray-200 dark:border-white/6 bg-white dark:bg-white/3 shadow-sm p-6 md:p-8',
		header: {
			wrapper: 'flex items-start gap-3 mb-4',
			icon: 'w-10 h-10 rounded-xl bg-theme-primary-500/10 dark:bg-theme-primary-500/20 flex items-center justify-center flex-shrink-0',
			iconInner: 'w-5 h-5 text-theme-primary-500 dark:text-theme-primary-400',
			title: 'text-xl font-semibold text-gray-900 dark:text-white'
		},
		field: 'p-4 bg-gray-50 dark:bg-white/3 rounded-xl border border-gray-100 dark:border-white/6',
		fieldTitle: 'font-semibold text-gray-900 dark:text-white mb-2',
		fieldValue: 'text-sm text-gray-600 dark:text-gray-300'
	}
};

export const NAVIGATION_CLASSES = {
	container: 'flex flex-col sm:flex-row justify-between gap-4 pt-8 items-center animate-fade-in-up',
	button: {
		base: 'inline-flex items-center justify-center gap-2 h-10 min-w-36 px-5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer select-none',
		primary: 'bg-black text-white dark:bg-white dark:text-black',
		disabled: 'bg-gray-100 dark:bg-white/6 text-gray-400 dark:text-white/30 pointer-events-none',
		submit: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700',
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
