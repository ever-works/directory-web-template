// Animation and styling constants
export const ANIMATION_DURATION = {
	MENU_OPEN: 300,
	HOVER: 200,
	BUTTON_SCALE: 300
} as const;

export const SIZES = {
	AVATAR_SM: 'sm',
	AVATAR_MD: 'md',
	MENU_WIDTH: 'w-80',
	ICON_SIZE: 'h-5 w-5',
	ICON_SIZE_SM: 'h-4 w-4',
	CROWN_SIZE: 'w-2.5 h-2.5',
	CROWN_SIZE_LG: 'w-3.5 h-3.5'
} as const;

export const Z_INDEX = {
	MENU: 50,
	OVERLAY: 9999
} as const;

export const NAME_LIMITS = {
	MAX_DISPLAY_LENGTH: 20,
	TRUNCATE_LENGTH: 18
} as const;

// Logout overlay configuration
export const LOGOUT_OVERLAY_CONFIG = {
	ID: 'logout-overlay',
	Z_INDEX: Z_INDEX.OVERLAY,
	ANIMATION_DURATION: {
		FADE_IN: 300,
		SLIDE_IN: 400,
		SPIN: 1200
	},
	SIZES: {
		SPINNER: 56,
		CARD_MAX_WIDTH: 360,
		PADDING: '2.5rem',
		BORDER_RADIUS: '20px'
	},
	COLORS: {
		SPINNER_ACCENT: '#3b82f6',
		SPINNER_SHADOW: 'rgba(59, 130, 246, 0.3)'
	}
} as const;

// Profile menu style constants for better readability
export const MENU_CONTAINER_BASE = [
	'origin-top-right',
	'absolute',
	'right-0',
	'mt-3',
	SIZES.MENU_WIDTH,
	'rounded-2xl',
	'shadow-2xl',
	'py-3',
	'z-50'
] as const;

export const MENU_STYLES = {
	CONTAINER: {
		base: [...MENU_CONTAINER_BASE, 'focus:outline-hidden'],
		background: ['bg-white/95', 'dark:bg-gray-900/95', 'backdrop-blur-xl'],
		border: ['ring-1', 'ring-black/5', 'dark:ring-white/10'],
		animation: ['animate-in', 'slide-in-from-top-2', 'duration-300']
	},
	LOADING_FALLBACK: {
		base: [...MENU_CONTAINER_BASE, 'animate-pulse'],
		background: ['bg-white/95', 'dark:bg-gray-900/95', 'backdrop-blur-xl'],
		border: ['ring-1', 'ring-black/5', 'dark:ring-white/10']
	},
	BUTTON: {
		base: [
			'group',
			'flex',
			'items-center',
			'text-sm',
			'rounded-full',
			'focus:outline-hidden',
			'focus:ring-2',
			'focus:ring-offset-2',
			'focus:ring-theme-primary',
			'transition-all',
			'duration-300',
			'active:scale-95'
		]
	},
	SKELETON: {
		container: 'relative ml-3',
		avatar: [
			'w-10',
			'h-10',
			'bg-linear-to-br',
			'from-slate-200',
			'via-slate-300',
			'to-slate-400',
			'dark:from-slate-700',
			'dark:via-slate-600',
			'dark:to-slate-500',
			'rounded-full',
			'animate-pulse',
			'shadow-lg'
		]
	},
	AVATAR: {
		container: 'relative',
		image: [
			'ring-2',
			'ring-white',
			'dark:ring-gray-800',
			'shadow-lg',
			'group-hover:shadow-xl',
			'transition-all',
			'duration-300'
		],
		onlineIndicator: [
			'absolute',
			'-bottom-0.5',
			'-right-0.5',
			'w-3.5',
			'h-3.5',
			'rounded-full',
			'border-2',
			'border-white',
			'dark:border-gray-800',
			'shadow-xs'
		],
		adminBadge: [
			'absolute',
			'-top-1',
			'-right-1',
			'w-4',
			'h-4',
			'bg-linear-to-r',
			'from-yellow-400',
			'via-orange-500',
			'to-red-500',
			'rounded-full',
			'flex',
			'items-center',
			'justify-center',
			'shadow-lg',
			'animate-pulse'
		]
	}
} as const;
