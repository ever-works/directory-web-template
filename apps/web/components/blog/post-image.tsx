import Image from 'next/image';
import { isAllowedImageDomain, isValidImageUrl } from '@/lib/utils/image-domains';

interface PostImageProps {
	src?: string;
	alt: string;
	/** `sizes` hint for the responsive srcset. */
	sizes: string;
	className?: string;
	/** Set on the first above-the-fold image (the detail page hero). */
	priority?: boolean;
}

/**
 * Featured image for a post.
 *
 * Data repositories can point `image` at any host, and `next/image` rejects
 * hosts that are not in `next.config.ts`'s `remotePatterns` with a 400. So the
 * image is optimized only when the host is allow-listed and falls back to
 * `unoptimized` otherwise — the same tactic `components/item.tsx` and
 * `components/shared/site-logo` already use. Renders nothing when the
 * frontmatter has no usable image.
 */
export function PostImage({ src, alt, sizes, className, priority = false }: PostImageProps) {
	if (!src || !isValidImageUrl(src)) return null;

	return (
		<Image
			src={src}
			alt={alt}
			fill
			sizes={sizes}
			priority={priority}
			unoptimized={!isAllowedImageDomain(src)}
			className={className ?? 'object-cover'}
		/>
	);
}
