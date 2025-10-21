import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { memberNotes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/members/[id]/notes - Get all notes for a member
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notes = await db.query.memberNotes.findMany({
      where: eq(memberNotes.memberId, id),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: [desc(memberNotes.createdAt)],
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching member notes:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

// POST /api/members/[id]/notes - Add a new note to a member
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { note } = body;

    if (!note || note.trim() === "") {
      return NextResponse.json({ error: "Note content is required" }, { status: 400 });
    }

    const [newNote] = await db
      .insert(memberNotes)
      .values({
        memberId: id,
        userId: session.user.id,
        note: note.trim(),
      })
      .returning();

    // Fetch the note with user details
    const noteWithUser = await db.query.memberNotes.findFirst({
      where: eq(memberNotes.id, newNote.id),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(noteWithUser, { status: 201 });
  } catch (error) {
    console.error("Error creating member note:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
