import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/groups/[id] - Get a single group with members
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, id),
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
          orderBy: (groupMembers, { desc }) => [desc(groupMembers.joinedAt)],
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // All users can view any group (view-only access)
    return NextResponse.json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}

// PATCH /api/groups/[id] - Update a group
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if group exists and user has access
    const existingGroup = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check access: ADMIN can only update their own groups
    if (session.user.role === "ADMIN" && existingGroup.leaderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, meetingFrequency, location, leaderId } = body;

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (meetingFrequency !== undefined) updateData.meetingFrequency = meetingFrequency;
    if (location !== undefined) updateData.location = location;

    // Only SUPER_ADMIN can change leader
    if (leaderId !== undefined && session.user.role === "SUPER_ADMIN") {
      updateData.leaderId = leaderId;
    }

    const updatedGroup = await db.update(groups).set(updateData).where(eq(groups.id, id)).returning();

    // Fetch with leader details
    const groupWithLeader = await db.query.groups.findFirst({
      where: eq(groups.id, id),
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

    return NextResponse.json(groupWithLeader);
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

// DELETE /api/groups/[id] - Delete a group
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if group exists and user has access
    const existingGroup = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check access: ADMIN can only delete their own groups
    if (session.user.role === "ADMIN" && existingGroup.leaderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(groups).where(eq(groups.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
