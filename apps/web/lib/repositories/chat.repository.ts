import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { chatConversations, chatMessages, type ChatConversation, type ChatMessage } from '@/lib/db/schema';
import { getTenantId } from '@/lib/auth/tenant';

/**
 * Optional persistence layer for the AI-chat plugin (Spec 023).
 *
 * Writes happen only when `aiChat.persist === true` in `works.yml`
 * **and** the visitor is authenticated. Anonymous chats stay in the
 * client's `localStorage`. All reads are tenant-scoped where the
 * tenant is resolvable, with a graceful userId-only fallback for
 * single-tenant deployments.
 */

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

function clampLimit(value: number | undefined, max = MAX_LIST_LIMIT): number {
	if (!value || value <= 0) return DEFAULT_LIST_LIMIT;
	return Math.min(value, max);
}

export interface CreateConversationInput {
	userId: string;
	locale: string;
	scenario?: string | null;
	title?: string | null;
}

export interface AppendMessageInput {
	conversationId: string;
	role: 'user' | 'assistant' | 'tool' | 'system';
	parts: unknown;
	toolCalls?: unknown;
	toolResults?: unknown;
}

export interface ConversationWithMessages {
	conversation: ChatConversation;
	messages: ChatMessage[];
}

/**
 * Insert a new conversation row scoped to the active tenant (when
 * resolvable). Returns the inserted row.
 */
export async function createConversation(input: CreateConversationInput): Promise<ChatConversation> {
	const tenantId = await getTenantId();
	const rows = await db
		.insert(chatConversations)
		.values({
			userId: input.userId,
			locale: input.locale,
			scenario: input.scenario ?? null,
			title: input.title ?? null,
			tenantId: tenantId ?? null
		})
		.returning();
	const row = rows[0];
	if (!row) {
		throw new Error('chat.repository: createConversation returned no rows');
	}
	return row;
}

/**
 * Append a batch of messages to a conversation in a single round-trip
 * and bump the conversation's `updated_at`. The caller is expected to
 * have already verified ownership (e.g. via `requireOwnership` or by
 * resolving `conversationId` from the active session).
 */
export async function appendMessages(
	conversationId: string,
	messages: ReadonlyArray<Omit<AppendMessageInput, 'conversationId'>>
): Promise<ChatMessage[]> {
	if (messages.length === 0) return [];
	const inserted = await db
		.insert(chatMessages)
		.values(
			messages.map((m) => ({
				conversationId,
				role: m.role,
				parts: m.parts as ChatMessage['parts'],
				toolCalls: (m.toolCalls ?? null) as ChatMessage['toolCalls'],
				toolResults: (m.toolResults ?? null) as ChatMessage['toolResults']
			}))
		)
		.returning();
	await db.update(chatConversations).set({ updatedAt: new Date() }).where(eq(chatConversations.id, conversationId));
	return inserted;
}

/**
 * List the visitor's conversations, most-recently-updated first.
 */
export async function listConversations(userId: string, options: { limit?: number } = {}): Promise<ChatConversation[]> {
	const tenantId = await getTenantId();
	const where = tenantId
		? and(eq(chatConversations.userId, userId), eq(chatConversations.tenantId, tenantId))
		: eq(chatConversations.userId, userId);
	return db
		.select()
		.from(chatConversations)
		.where(where)
		.orderBy(desc(chatConversations.updatedAt))
		.limit(clampLimit(options.limit));
}

/**
 * Fetch a single conversation plus its messages. Returns `null` when
 * the conversation does not exist or does not belong to `userId` —
 * we deliberately treat "not yours" and "not found" identically so
 * the caller can't probe for IDs.
 */
export async function getConversation(
	userId: string,
	conversationId: string
): Promise<ConversationWithMessages | null> {
	const tenantId = await getTenantId();
	const where = tenantId
		? and(
				eq(chatConversations.id, conversationId),
				eq(chatConversations.userId, userId),
				eq(chatConversations.tenantId, tenantId)
			)
		: and(eq(chatConversations.id, conversationId), eq(chatConversations.userId, userId));

	const conversationRows = await db.select().from(chatConversations).where(where).limit(1);
	const conversation = conversationRows[0];
	if (!conversation) return null;

	const messages = await db
		.select()
		.from(chatMessages)
		.where(eq(chatMessages.conversationId, conversation.id))
		.orderBy(chatMessages.createdAt);

	return { conversation, messages };
}

/**
 * Verify ownership of a conversation by `userId`. Returns the
 * conversation if owned, `null` otherwise.
 */
export async function requireOwnership(userId: string, conversationId: string): Promise<ChatConversation | null> {
	const tenantId = await getTenantId();
	const where = tenantId
		? and(
				eq(chatConversations.id, conversationId),
				eq(chatConversations.userId, userId),
				eq(chatConversations.tenantId, tenantId)
			)
		: and(eq(chatConversations.id, conversationId), eq(chatConversations.userId, userId));
	const rows = await db.select().from(chatConversations).where(where).limit(1);
	return rows[0] ?? null;
}
