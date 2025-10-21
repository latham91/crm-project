import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

// GET /api/groups - List all groups (filtered by role)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // All users can see all groups (view-only access for groups they don't own)
    const result = await db.query.groups.findMany({
      with: {
        leader: {
          columns: {
            id: true,
            username: true,
            email: true,
          },
        },
        groupMembers: {
          with: {
            member: true,
          },
        },
      },
      orderBy: [desc(groups.createdAt)],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

// POST /api/groups - Create a new group
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, meetingFrequency, location, leaderId } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    // Determine the leader
    let finalLeaderId = leaderId;

    // If no leader specified or user is ADMIN, use current user
    if (!leaderId || session.user.role === "ADMIN") {
      finalLeaderId = session.user.id;
    }

    // SUPER_ADMIN can assign any leader, but validate it exists
    if (session.user.role === "SUPER_ADMIN" && leaderId) {
      const leaderExists = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, leaderId),
      });

      if (!leaderExists) {
        return NextResponse.json({ error: "Invalid leader specified" }, { status: 400 });
      }
      finalLeaderId = leaderId;
    }

    const newGroup = await db
      .insert(groups)
      .values({
        name,
        description: description || null,
        meetingFrequency: meetingFrequency || null,
        location: location || null,
        leaderId: finalLeaderId,
      })
      .returning();

    // Fetch the group with leader details
    const groupWithLeader = await db.query.groups.findFirst({
      where: eq(groups.id, newGroup[0].id),
      with: {
        leader: {
          columns: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(groupWithLeader, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
