	export const getStatusBadge = (status: string) => {
		const statusConfig = {
			active: { color: 'bg-green-100 text-green-800', icon: '✓' },
			on_trial: { color: 'bg-blue-100 text-blue-800', icon: '✓' },
			past_due: { color: 'bg-red-100 text-red-800', icon: '⚠' },
			paused: { color: 'bg-yellow-100 text-yellow-800', icon: '⏸' },
			cancelled: { color: 'bg-gray-100 text-gray-800', icon: '✗' },
		};

		const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;

		return (
			<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
				<span className="mr-1">{config.icon}</span>
				{status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
			</span>
		);
	};