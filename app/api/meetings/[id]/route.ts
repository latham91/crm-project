import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/meetings/[id] - Get a single meeting with attendance
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const meeting = await db.query.meetings.findFirst({
      where: eq(meetings.id, id),
      with: {
        group: {
          with: {
            leader: {
              columns: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        attendance: {
          with: {
            member: true,
          },
          orderBy: (attendance, { asc }) => [asc(attendance.checkedInAt)],
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // All users can view any meeting (view-only access)
    return NextResponse.json(meeting);
  } catch (error) {
    console.error("Error fetching meeting:", error);
    return NextResponse.json({ error: "Failed to fetch meeting" }, { status: 500 });
  }
}

// PATCH /api/meetings/[id] - Update a meeting
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if meeting exists and user has access
    const existingMeeting = await db.query.meetings.findFirst({
      where: eq(meetings.id, id),
      with: {
        group: true,
      },
    });

    if (!existingMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Check access: ADMIN can only update meetings for their own groups
    if (session.user.role === "ADMIN" && existingMeeting.group.leaderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, date, location, notes } = body;

    // Prepare update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (date !== undefined) updateData.date = new Date(date);
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;

    const [updatedMeeting] = await db.update(meetings).set(updateData).where(eq(meetings.id, id)).returning();

    // Fetch with all details
    const meetingWithDetails = await db.query.meetings.findFirst({
      where: eq(meetings.id, id),
      with: {
        group: {
          with: {
            leader: {
              columns: {
                id: true,
                username: true,
              },
            },
          },
        },
        attendance: {
          with: {
            member: true,
          },
        },
      },
    });

    return NextResponse.json(meetingWithDetails);
  } catch (error) {
    console.error("Error updating meeting:", error);
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
  }
}

// DELETE /api/meetings/[id] - Delete a meeting
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if meeting exists and user has access
    const existingMeeting = await db.query.meetings.findFirst({
      where: eq(meetings.id, id),
      with: {
        group: true,
      },
    });

    if (!existingMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Check access: ADMIN can only delete meetings for their own groups
    if (session.user.role === "ADMIN" && existingMeeting.group.leaderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete meeting (attendance records will be cascade deleted)
    await db.delete(meetings).where(eq(meetings.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meeting:", error);
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
  }
}
