import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

// Singleton PrismaClient to avoid hot-reloading dupes in dev
const globalForPrisma = globalThis

// Creates a new PrismaClient with the Postgres adapter
const prismaClientSingleton = () => {
  const adapter = new PrismaPg()
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
