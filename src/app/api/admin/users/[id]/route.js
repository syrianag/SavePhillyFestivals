import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"

// Updates a user (admin only)
export async function PUT(req, { params }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  if (body.password) {
    body.password = await bcrypt.hash(body.password, 12)
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: body,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  return NextResponse.json(user)
}

// Deletes a user (admin only)
export async function DELETE(_, { params }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ message: "Deleted" })
}
