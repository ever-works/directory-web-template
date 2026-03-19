	export const getCustomerAvatar = (email: string) => {
		const initial = email.charAt(0).toUpperCase();
		return (
			<div className="w-8 h-8 bg-theme-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
				{initial}
			</div>
		);
	};