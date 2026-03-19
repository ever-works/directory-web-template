import { comments } from "@/lib/db/schema";

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export interface CommentWithUser extends Comment {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
} 