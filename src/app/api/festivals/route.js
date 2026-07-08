import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Lists all published festivals (public)
export async function GET() {
  const festivals = await prisma.festival.findMany({
    where: { status: "PUBLISHED" },
    include: { schedules: true },
    orderBy: { startDate: "asc" },
  })
  return NextResponse.json(festivals)
}

// Creates a festival (authenticated hosts only)
export async function POST(req) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const festival = await prisma.festival.create({
    data: { ...body, hostId: session.user.id },
  })
  return NextResponse.json(festival, { status: 201 })
}
