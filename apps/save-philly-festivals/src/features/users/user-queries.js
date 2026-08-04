import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  image: true,
  created_at: true,
  updated_at: true,
};

export async function getUsers({ role, limit = 50 } = {}) {
  const where = {};
  if (role) where.role = role;

  const users = await prisma.user.findMany({
    where,
    select: USER_SELECT,
    orderBy: { created_at: "desc" },
    take: Math.min(limit, 100),
  });

  const total = await prisma.user.count({ where });
  return { users, total };
}

export async function getUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: USER_SELECT,
  });
}

export async function getUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function createUser({ name, email, password, role = "public" }) {
  const password_hash = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: { name, email, password_hash, role },
    select: USER_SELECT,
  });
}

export async function updateUserRole(id, role) {
  return prisma.user.update({
    where: { id },
    data: { role },
    select: USER_SELECT,
  });
}

export async function updateUser(id, data) {
  if (data.password) {
    data.password_hash = await bcrypt.hash(data.password, 12);
    delete data.password;
  }
  return prisma.user.update({
    where: { id },
    data,
    select: USER_SELECT,
  });
}

export async function deleteUser(id) {
  return prisma.user.delete({ where: { id } });
}
