import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/settings/profile - Get current user's profile
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// PATCH /api/settings/profile - Update current user's profile
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { username, email } = body;

    // Get current user
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};

    if (username !== undefined && username !== currentUser.username) {
      // Check if new username is already taken
      const usernameExists = await db.query.users.findFirst({
        where: eq(users.username, username),
      });
      if (usernameExists && usernameExists.id !== session.user.id) {
        return NextResponse.json({ error: "Username already exists" }, { status: 409 });
      }
      updateData.username = username;
    }

    if (email !== undefined && email !== currentUser.email) {
      // Check if new email is already taken
      const emailExists = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (emailExists && emailExists.id !== session.user.id) {
        return NextResponse.json({ error: "Email already exists" }, { status: 409 });
      }
      updateData.email = email;
    }

    // If nothing to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No changes to update" }, { status: 400 });
    }

    // Update user
    const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, session.user.id)).returning({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
