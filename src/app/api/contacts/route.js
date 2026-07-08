import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Public: submits a contact inquiry
export async function POST(req) {
  const body = await req.json()
  const contact = await prisma.contact.create({ data: body })
  return NextResponse.json(contact, { status: 201 })
}
