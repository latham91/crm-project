import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { memberNotes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// DELETE /api/members/[id]/notes/[noteId] - Delete a note
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, noteId } = await params;

    // Check if the note exists and belongs to the current user or user is super admin
    const note = await db.query.memberNotes.findFirst({
      where: eq(memberNotes.id, noteId),
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Only allow deletion if the user created the note or is a super admin
    if (note.userId !== session.user.id && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(memberNotes).where(and(eq(memberNotes.id, noteId), eq(memberNotes.memberId, id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting member note:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
