import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { groups, groupMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// DELETE /api/groups/[id]/members/[memberId] - Remove a member from a group
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, memberId } = await params;

    // Check if group exists and user has access
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check access: ADMIN can only modify their own groups
    if (session.user.role === "ADMIN" && group.leaderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if membership exists
    const membership = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.memberId, memberId)),
    });

    if (!membership) {
      return NextResponse.json({ error: "Member is not in this group" }, { status: 404 });
    }

    // Remove member from group
    await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.memberId, memberId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member from group:", error);
    return NextResponse.json({ error: "Failed to remove member from group" }, { status: 500 });
  }
}
