import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { attendance, meetings, groups, groupMembers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/members/[id]/history - Get member's activity history
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get member's attendance history with meeting details
    const attendanceHistoryRaw = await db
      .select({
        id: attendance.id,
        status: attendance.status,
        checkedInAt: attendance.checkedInAt,
        meetingId: meetings.id,
        meetingTitle: meetings.title,
        meetingDate: meetings.date,
        meetingLocation: meetings.location,
      })
      .from(attendance)
      .innerJoin(meetings, eq(attendance.meetingId, meetings.id))
      .innerJoin(groups, eq(meetings.groupId, groups.id))
      .where(eq(attendance.memberId, id))
      .orderBy(desc(meetings.date));

    // Transform the data to nested structure
    const attendanceHistory = attendanceHistoryRaw.map((record) => ({
      id: record.id,
      status: record.status,
      checkedInAt: record.checkedInAt,
      meeting: {
        id: record.meetingId,
        title: record.meetingTitle,
        date: record.meetingDate,
        location: record.meetingLocation,
      },
    }));

    // Get member's group memberships
    const memberGroups = await db
      .select({
        id: groupMembers.id,
        groupName: groups.name,
        groupId: groups.id,
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.memberId, id))
      .orderBy(desc(groupMembers.joinedAt));

    return NextResponse.json({
      attendance: attendanceHistory,
      groups: memberGroups,
    });
  } catch (error) {
    console.error("Error fetching member history:", error);
    return NextResponse.json({ error: "Failed to fetch member history" }, { status: 500 });
  }
}
