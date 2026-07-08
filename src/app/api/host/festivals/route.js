import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Lists festivals owned by the authenticated host
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const festivals = await prisma.festival.findMany({
    where: { hostId: session.user.id },
    include: { schedules: true },
    orderBy: { startDate: "asc" },
  })
  return NextResponse.json(festivals)
}
