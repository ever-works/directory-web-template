'use client';

type PlausibleOptions = {
	props?: Record<string, string | number | boolean>;
};

export function usePlausible() {
	const trackEvent = (eventName: string, options?: PlausibleOptions) => {
		if (typeof window === 'undefined') return;

		const win = window as any;
		win.plausible =
			win.plausible ||
			function () {
				(win.plausible.q = win.plausible.q || []).push(arguments);
			};
		win.plausible(eventName, options);

		if (process.env.NODE_ENV === 'development') {
			console.log(`[Plausible Event] 📊 ${eventName}`, options || '');
		}
	};

	return { trackEvent };
}
