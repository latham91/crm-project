import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// GET /api/admin/users/[id] - Get a single user (Super Admin only)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super admin can access user management
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
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
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

// PATCH /api/admin/users/[id] - Update a user (Super Admin only)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super admin can update users
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent super admin from demoting themselves
    if (id === session.user.id) {
      return NextResponse.json({ error: "Cannot modify your own account through this endpoint" }, { status: 403 });
    }

    const body = await request.json();
    const { username, email, role, password } = body;

    // Prepare update data
    const updateData: any = {};

    if (username !== undefined) {
      // Check if new username is already taken by another user
      if (username !== existingUser.username) {
        const usernameExists = await db.query.users.findFirst({
          where: eq(users.username, username),
        });
        if (usernameExists && usernameExists.id !== id) {
          return NextResponse.json({ error: "Username already exists" }, { status: 409 });
        }
      }
      updateData.username = username;
    }

    if (email !== undefined) {
      // Check if new email is already taken by another user
      if (email !== existingUser.email) {
        const emailExists = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (emailExists && emailExists.id !== id) {
          return NextResponse.json({ error: "Email already exists" }, { status: 409 });
        }
      }
      updateData.email = email;
    }

    if (role !== undefined) {
      if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      updateData.role = role;
    }

    if (password !== undefined && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, id)).returning({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - Delete a user (Super Admin only)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only super admin can delete users
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent super admin from deleting themselves
    if (id === session.user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 403 });
    }

    // Delete user
    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
