import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Lists all schedules
export async function GET() {
  const schedules = await prisma.schedule.findMany({ orderBy: { day: "asc" } })
  return NextResponse.json(schedules)
}

// Creates a schedule entry for a festival
export async function POST(req) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const schedule = await prisma.schedule.create({ data: body })
  return NextResponse.json(schedule, { status: 201 })
}
