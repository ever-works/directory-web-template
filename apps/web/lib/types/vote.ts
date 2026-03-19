import { z } from 'zod';

export const voteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  createdAt: z.date(),
});

export type Vote = z.infer<typeof voteSchema>;

export interface VoteResponse {
  success: boolean;
  voteCount: number;
  hasVoted: boolean;
  message?: string;
}

export interface VoteError {
  error: string;
  code?: string;
}

export interface VoteState {
  voteCount: number;
  hasVoted: boolean;
  isLoading: boolean;
  error?: string;
} 