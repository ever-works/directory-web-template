/**
 * Spec 027 — Notification module barrel.
 *
 * UI surfaces import from `@/lib/notifications` to keep imports stable
 * even if internal files reshape later.
 */

export * from './registry';
export * from './types';
export { notificationPubSub } from './pubsub';
export { resolveChannels, isInQuietHours } from './preferences';
