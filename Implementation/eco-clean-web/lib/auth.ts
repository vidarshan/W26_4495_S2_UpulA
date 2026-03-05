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
      password: true,
    },
  });

  if (!user) {
    console.log("Login failed: user not found", normalizedEmail);
    return null;
  }

  const ok = await bcrypt.compare(password, user.password);

  if (!ok) {
    console.log("Login failed: wrong password", normalizedEmail);
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
