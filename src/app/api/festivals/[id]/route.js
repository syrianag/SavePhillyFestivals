import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Gets a single festival by ID
export async function GET(_, { params }) {
  const festival = await prisma.festival.findUnique({
    where: { id: params.id },
    include: { schedules: true },
  })
  if (!festival) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(festival)
}

// Updates a festival (owner or admin only)
export async function PUT(req, { params }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const festival = await prisma.festival.findUnique({ where: { id: params.id } })
  if (!festival) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (festival.hostId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const updated = await prisma.festival.update({
    where: { id: params.id },
    data: body,
  })
  return NextResponse.json(updated)
}

// Deletes a festival (owner or admin only)
export async function DELETE(_, { params }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const festival = await prisma.festival.findUnique({ where: { id: params.id } })
  if (!festival) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (festival.hostId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.festival.delete({ where: { id: params.id } })
  return NextResponse.json({ message: "Deleted" })
}
