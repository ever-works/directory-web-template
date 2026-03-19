import { NextResponse } from "next/server";
import { getCommentById, updateCommentRating } from "@/lib/db/queries";
import { checkDatabaseAvailability } from "@/lib/utils/database-check";

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string; commentId: string }> }) {
    try {
        // Check database availability
        const dbCheck = checkDatabaseAvailability();
        if (dbCheck) return dbCheck;

        const { commentId } = await params;
        const { rating } = await request.json();
        console.log("============rating=============>", rating);
        const comment = await updateCommentRating(commentId, rating);
        return NextResponse.json(comment);
    } catch (error) {
        console.error("Failed to update comment rating:", error);
        return NextResponse.json({ error: "Failed to update comment rating" }, { status: 500 });
    }
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; commentId: string }> }) {
    // Check database availability
    const dbCheck = checkDatabaseAvailability();
    if (dbCheck) return dbCheck;

    const { commentId } = await params;
    const comment = await getCommentById(commentId);
    return NextResponse.json(comment);
}