import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function verifyUser(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      deletedAt: true,
      password: true,
    },
  });

  if (!user || user.deletedAt) {
    return null;
  }

  const ok = await bcrypt.compare(password, user.password);

  if (!ok) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
