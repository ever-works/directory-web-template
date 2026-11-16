import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClientProfileByUserId, getCommentById, updateCommentRatingForOwner } from "@/lib/db/queries";
import { checkDatabaseAvailability } from "@/lib/utils/database-check";

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string; commentId: string }> }) {
    try {
        // Check database availability
        const dbCheck = checkDatabaseAvailability();
        if (dbCheck) return dbCheck;

        // Require authentication — without this gate any anonymous caller
        // could mutate any comment's rating.
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { commentId } = await params;
        // Parse body explicitly so a malformed JSON / wrong-content-type
        // request returns 400 instead of falling into the generic 500
        // catch below.
        let payload: { rating?: unknown } = {};
        try {
            payload = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON body" },
                { status: 400 }
            );
        }
        const { rating } = payload;
        // The column is an integer, so 2.5 would fail in Postgres and surface as a 500.
        if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: "Rating must be an integer between 1 and 5" },
                { status: 400 }
            );
        }
        // Comment ids are public (returned by the comments list), so only the
        // comment's author may change its rating.
        const clientProfile = await getClientProfileByUserId(session.user.id);
        if (!clientProfile) {
            return NextResponse.json(
                { error: "Client profile not found" },
                { status: 404 }
            );
        }
        const comment = await updateCommentRatingForOwner(commentId, clientProfile.id, rating);
        if (!comment) {
            return NextResponse.json(
                { error: "Comment not found or not authorized" },
                { status: 404 }
            );
        }
        return NextResponse.json(comment);
    } catch (error) {
        console.error("Failed to update comment rating:", error);
        return NextResponse.json({ error: "Failed to update comment rating" }, { status: 500 });
    }
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; commentId: string }> }) {
    try {
        // Check database availability
        const dbCheck = checkDatabaseAvailability();
        if (dbCheck) return dbCheck;

        const { commentId } = await params;
        const comment = await getCommentById(commentId);
        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }
        return NextResponse.json(comment);
    } catch (error) {
        console.error("Failed to fetch comment by id:", error);
        // Degrade to 404 instead of 500 — most failures here (tenant
        // not found, db query error on probe slug) are client-error-shape
        // outcomes for the caller, not server bugs.
        return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
}