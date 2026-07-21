import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserById, updateUser, deleteUser } from "@/features/users/user-queries";

export async function GET(request, { params }) {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function PATCH(request, { params }) {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, email, role, password } = body;

  const user = await getUserById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Only super_admin can promote to super_admin
  if (role === "super_admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admins can assign this role" }, { status: 403 });
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) updateData.role = role;
  if (password) updateData.password = password;

  const updated = await updateUser(id, updateData);
  return NextResponse.json(updated);
}

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;

  // Cannot delete yourself
  if (id === session.user.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const user = await getUserById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await deleteUser(id);
  return NextResponse.json({ success: true });
}
