import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// Seeds the database with initial admin user and sample data
async function main() {
  console.log("Seeding database...")

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12)
  const admin = await prisma.user.upsert({
    where: { email: "admin@savephillyfestivals.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@savephillyfestivals.com",
      password: adminPassword,
      role: "ADMIN",
    },
  })
  console.log("Admin user created:", admin.email)

  // Create a sample host
  const hostPassword = await bcrypt.hash("host123", 12)
  const host = await prisma.user.upsert({
    where: { email: "host@example.com" },
    update: {},
    create: {
      name: "Jane Host",
      email: "host@example.com",
      password: hostPassword,
      role: "HOST",
    },
  })
  console.log("Host created:", host.email)

  // Create a sample CRM user
  const crmPassword = await bcrypt.hash("crm123", 12)
  const crm = await prisma.user.upsert({
    where: { email: "crm@example.com" },
    update: {},
    create: {
      name: "Bob CRM",
      email: "crm@example.com",
      password: crmPassword,
      role: "CRM",
    },
  })
  console.log("CRM user created:", crm.email)

  // Create a sample festival
  const festival = await prisma.festival.upsert({
    where: { id: "sample-festival-1" },
    update: {},
    create: {
      id: "sample-festival-1",
      title: "Philly Jazz Fest",
      description: "A weekend of live jazz across Philadelphia venues.",
      location: "Various venues, Philadelphia",
      startDate: new Date("2026-09-15"),
      endDate: new Date("2026-09-17"),
      status: "PUBLISHED",
      hostId: host.id,
    },
  })
  console.log("Sample festival created:", festival.title)

  // Add schedules to the sample festival
  await prisma.schedule.createMany({
    data: [
      {
        festivalId: festival.id,
        day: new Date("2026-09-15"),
        startTime: "18:00",
        endTime: "22:00",
        activity: "Opening Night Concert",
        description: "Main stage at Love Park",
      },
      {
        festivalId: festival.id,
        day: new Date("2026-09-16"),
        startTime: "12:00",
        endTime: "20:00",
        activity: "All-Day Festival",
        description: "Multiple stages across the city",
      },
    ],
    skipDuplicates: true,
  })
  console.log("Schedules added to festival")

  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
