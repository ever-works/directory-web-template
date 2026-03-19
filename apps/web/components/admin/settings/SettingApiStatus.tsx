'use client';

import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface ApiStatusItem {
	name: string;
	isConfigured: boolean;
	envVar: string;
	docsUrl?: string;
}

interface SettingApiStatusProps {
	label: string;
	description?: string;
	apis: ApiStatusItem[];
}

export function SettingApiStatus({ label, description, apis }: SettingApiStatusProps) {
	return (
		<div className="py-3">
			<p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{label}</p>
			{description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{description}</p>}
			<div className="space-y-2 bg-gray-50 dark:bg-[#0a0a0a]/50 rounded-lg p-4 max-w-md">
				{apis.map((api) => (
					<div key={api.envVar} className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							{api.isConfigured ? (
								<CheckCircle className="w-4 h-4 text-green-500" />
							) : (
								<XCircle className="w-4 h-4 text-gray-400" />
							)}
							<span className="text-sm text-gray-700 dark:text-gray-300">{api.name}</span>
						</div>
						<div className="flex items-center gap-2">
							<code className="text-xs bg-gray-200 dark:bg-white/[0.08] px-2 py-0.5 rounded">
								{api.envVar}
							</code>
							{api.docsUrl && (
								<a
									href={api.docsUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-theme-primary hover:underline"
									aria-label={`${api.name} documentation`}
								>
									<ExternalLink className="w-3 h-3" />
								</a>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
