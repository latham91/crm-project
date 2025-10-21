import { auth } from "./auth";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

export async function getCurrentUserRole() {
  const user = await getCurrentUser();
  return user?.role;
}

export async function isSuperAdmin() {
  const role = await getCurrentUserRole();
  return role === "SUPER_ADMIN";
}

export async function isAdmin() {
  const role = await getCurrentUserRole();
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function canAccessGroup(groupLeaderId: string) {
  const user = await getCurrentUser();
  if (!user) return false;

  // Super admins can access all groups
  if (user.role === "SUPER_ADMIN") return true;

  // Regular admins can only access groups they lead
  return user.id === groupLeaderId;
}
