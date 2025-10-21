import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { groups, groupMembers, members } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/groups/[id]/members - Get all members in a group
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if group exists and user has access
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, id),
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check access: ADMIN can only access their own groups
    if (session.user.role === "ADMIN" && group.leaderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const groupMembersList = await db.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, id),
      with: {
        member: true,
      },
      orderBy: (groupMembers, { desc }) => [desc(groupMembers.joinedAt)],
    });

    return NextResponse.json(groupMembersList);
  } catch (error) {
    console.error("Error fetching group members:", error);
    return NextResponse.json({ error: "Failed to fetch group members" }, { status: 500 });
  }
}

// POST /api/groups/[id]/members - Add a member to a group (with category validation)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

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

    // Get the member being added
    const member = await db.query.members.findFirst({
      where: eq(members.id, memberId),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if member is already in the group
    const existingMembership = await db.query.groupMembers.findFirst({
      where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.memberId, memberId)),
    });

    if (existingMembership) {
      return NextResponse.json({ error: "Member is already in this group" }, { status: 400 });
    }

    // CATEGORY EXCLUSIVITY VALIDATION
    // Check if member has a category and if so, ensure no other member in the group has the same category
    if (member.category) {
      const existingMembers = await db
        .select({
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          category: members.category,
        })
        .from(groupMembers)
        .innerJoin(members, eq(groupMembers.memberId, members.id))
        .where(eq(groupMembers.groupId, groupId));

      const categoryConflict = existingMembers.find(
        (m) => m.category && m.category.toLowerCase() === member.category!.toLowerCase()
      );

      if (categoryConflict) {
        return NextResponse.json(
          {
            error: "Category conflict",
            message: `Cannot add member. ${categoryConflict.firstName} ${categoryConflict.lastName} is already in this group with the category "${categoryConflict.category}". Only one member per category is allowed in a group.`,
            conflictingMember: {
              id: categoryConflict.id,
              name: `${categoryConflict.firstName} ${categoryConflict.lastName}`,
              category: categoryConflict.category,
            },
          },
          { status: 409 }
        );
      }
    }

    // Add member to group
    const newMembership = await db
      .insert(groupMembers)
      .values({
        groupId,
        memberId,
      })
      .returning();

    // Fetch the membership with member details
    const membershipWithDetails = await db.query.groupMembers.findFirst({
      where: eq(groupMembers.id, newMembership[0].id),
      with: {
        member: true,
      },
    });

    return NextResponse.json(membershipWithDetails, { status: 201 });
  } catch (error) {
    console.error("Error adding member to group:", error);
    return NextResponse.json({ error: "Failed to add member to group" }, { status: 500 });
  }
}
