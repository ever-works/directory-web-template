'use client';
import { Tag } from '@/lib/content';
import { ListingTagsContent } from './listing-tags-content';

export default function ListingTags({
	tags,
	total,
	page,
	basePath
}: {
	tags: Tag[];
	total: number;
	page: number;
	basePath: string;
}) {
	return <ListingTagsContent tags={tags} total={total} page={page} basePath={basePath} />;
}
