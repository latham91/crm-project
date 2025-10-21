import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { meetings, groups, attendance, groupMembers } from "@/db/schema";
import { desc, eq, and, gte } from "drizzle-orm";

// GET /api/meetings - List all meetings (filtered by role and optional filters)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const upcoming = searchParams.get("upcoming") === "true";

    // All users can see all meetings (view-only access for meetings they don't own)
    const result = await db.query.meetings.findMany({
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
            member: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      where: (meetings, { eq, and, gte }) => {
        const conditions = [];

        if (groupId) {
          conditions.push(eq(meetings.groupId, groupId));
        }

        if (upcoming) {
          conditions.push(gte(meetings.date, new Date()));
        }

        return conditions.length > 0 ? and(...conditions) : undefined;
      },
      orderBy: [desc(meetings.date)],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}

// POST /api/meetings - Create a new meeting
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { groupId, title, date, location, notes } = body;

    // Validate required fields
    if (!groupId || !title || !date) {
      return NextResponse.json({ error: "Group, title, and date are required" }, { status: 400 });
    }

    // Check if group exists and user has access
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check access: ADMIN can only create meetings for their own groups
    if (session.user.role === "ADMIN" && group.leaderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create the meeting
    const [newMeeting] = await db
      .insert(meetings)
      .values({
        groupId,
        title,
        date: new Date(date),
        location: location || null,
        notes: notes || null,
      })
      .returning();

    // Get all members of the group
    const groupMembersList = await db
      .select({ memberId: groupMembers.memberId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    // Create attendance records for all group members (default status will be set when marked)
    if (groupMembersList.length > 0) {
      await db.insert(attendance).values(
        groupMembersList.map((gm) => ({
          meetingId: newMeeting.id,
          memberId: gm.memberId,
          status: "ATTENDED" as const, // Default, will be updated when actually marked
          checkedInAt: null,
        }))
      );
    }

    // Fetch the meeting with all details
    const meetingWithDetails = await db.query.meetings.findFirst({
      where: eq(meetings.id, newMeeting.id),
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

    return NextResponse.json(meetingWithDetails, { status: 201 });
  } catch (error) {
    console.error("Error creating meeting:", error);
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}
