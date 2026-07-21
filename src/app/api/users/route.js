import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUsers, createUser, getUserByEmail } from "@/features/users/user-queries";

export async function GET(request) {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50", 10) || 50;

  const data = await getUsers({ role, limit });
  return NextResponse.json(data);
}

export async function POST(request) {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, password, role } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const user = await createUser({ name, email, password, role });
  return NextResponse.json(user, { status: 201 });
}
