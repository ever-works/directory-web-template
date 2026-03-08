import Image from 'next/image';
import { useState } from 'react';
import { isValidImageUrl } from '@/lib/utils/image-domains';

interface AvatarProps {
	src?: string | null;
	alt?: string;
	fallback?: string;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

const sizeMap = {
	sm: 'h-8 w-8 text-xs',
	md: 'h-10 w-10 text-sm',
	lg: 'h-12 w-12 text-base'
};

export function Avatar({ src, alt = '', fallback, size = 'sm', className }: AvatarProps) {
	const [imageError, setImageError] = useState(false);
	const tailwindUnit = Number.parseInt(sizeMap[size].split(' ')[0].replace('h-', ''), 10);
	const dimensions = tailwindUnit * 4;

	if (src && !imageError && isValidImageUrl(src)) {
		return (
			<div className={`relative rounded-full overflow-hidden ${sizeMap[size]} ${className ?? ''}`}>
				<Image
					src={src}
					alt={alt}
					width={dimensions}
					height={dimensions}
					className="object-cover rounded-full"
					onError={() => setImageError(true)}
					priority
				/>
			</div>
		);
	}

	return (
		<div
			className={`rounded-full bg-linear-to-br from-theme-primary-600 to-theme-primary-700 flex items-center justify-center text-white font-medium ${sizeMap[size]} ${
				className ?? ''
			}`}
			title={alt}
		>
			{fallback || alt.charAt(0).toUpperCase()}
		</div>
	);
}
