import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { members } from "@/db/schema";
import { desc, or, ilike, eq } from "drizzle-orm";

// GET /api/members - List all members with optional search
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    let query = db.select().from(members);

    // Apply search filter
    if (search) {
      query = query.where(
        or(
          ilike(members.firstName, `%${search}%`),
          ilike(members.lastName, `%${search}%`),
          ilike(members.email, `%${search}%`),
          ilike(members.company, `%${search}%`)
        )
      ) as any;
    }

    // Apply status filter
    if (status) {
      query = query.where(eq(members.membershipType, status as any)) as any;
    }

    const result = await query.orderBy(desc(members.createdAt));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

// POST /api/members - Create a new member
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, email, phone, company, category, membershipType, notes } = body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "First name, last name, and email are required" }, { status: 400 });
    }

    const newMember = await db
      .insert(members)
      .values({
        firstName,
        lastName,
        email,
        phone: phone || null,
        company: company || null,
        category: category || null,
        membershipType: membershipType || "PENDING",
        notes: notes || null,
      })
      .returning();

    return NextResponse.json(newMember[0], { status: 201 });
  } catch (error) {
    console.error("Error creating member:", error);
    return NextResponse.json({ error: "Failed to create member" }, { status: 500 });
  }
}
