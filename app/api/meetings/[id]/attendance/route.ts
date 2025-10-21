import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { attendance, meetings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// PATCH /api/meetings/[id]/attendance - Update attendance status for a member
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: meetingId } = await params;
    const body = await request.json();
    const { memberId, status } = body;

    if (!memberId || !status) {
      return NextResponse.json({ error: "Member ID and status are required" }, { status: 400 });
    }

    // Validate status
    const validStatuses = ["ATTENDED", "NO_SHOW", "CANCELLED", "EXCUSED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Check if meeting exists and user has access
    const meeting = await db.query.meetings.findFirst({
      where: eq(meetings.id, meetingId),
      with: {
        group: true,
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Check access: ADMIN can only update attendance for their own groups' meetings
    if (session.user.role === "ADMIN" && meeting.group.leaderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if attendance record exists
    const existingAttendance = await db.query.attendance.findFirst({
      where: and(eq(attendance.meetingId, meetingId), eq(attendance.memberId, memberId)),
    });

    if (!existingAttendance) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    // Update attendance status
    const [updatedAttendance] = await db
      .update(attendance)
      .set({
        status: status as "ATTENDED" | "NO_SHOW" | "CANCELLED" | "EXCUSED",
        checkedInAt: status === "ATTENDED" ? new Date() : null,
      })
      .where(and(eq(attendance.meetingId, meetingId), eq(attendance.memberId, memberId)))
      .returning();

    // Fetch with member details
    const attendanceWithMember = await db.query.attendance.findFirst({
      where: eq(attendance.id, updatedAttendance.id),
      with: {
        member: true,
      },
    });

    return NextResponse.json(attendanceWithMember);
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
  }
}

// POST /api/meetings/[id]/attendance - Bulk update attendance (mark multiple at once)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: meetingId } = await params;
    const body = await request.json();
    const { updates } = body; // Array of { memberId, status }

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: "Updates array is required" }, { status: 400 });
    }

    // Check if meeting exists and user has access
    const meeting = await db.query.meetings.findFirst({
      where: eq(meetings.id, meetingId),
      with: {
        group: true,
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Check access: ADMIN can only update attendance for their own groups' meetings
    if (session.user.role === "ADMIN" && meeting.group.leaderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update each attendance record
    const updatePromises = updates.map(async ({ memberId, status }) => {
      return db
        .update(attendance)
        .set({
          status: status as "ATTENDED" | "NO_SHOW" | "CANCELLED" | "EXCUSED",
          checkedInAt: status === "ATTENDED" ? new Date() : null,
        })
        .where(and(eq(attendance.meetingId, meetingId), eq(attendance.memberId, memberId)));
    });

    await Promise.all(updatePromises);

    // Fetch updated meeting with attendance
    const updatedMeeting = await db.query.meetings.findFirst({
      where: eq(meetings.id, meetingId),
      with: {
        attendance: {
          with: {
            member: true,
          },
        },
      },
    });

    return NextResponse.json(updatedMeeting);
  } catch (error) {
    console.error("Error bulk updating attendance:", error);
    return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
  }
}
