import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

<<<<<<< Updated upstream
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
=======

// export async function verifyUser(email: string, password: string) {
//   return {
//     id: "dev-user",
//     name: "Developer",
//     email,
//     role: "ADMIN",
//   };
// }

export async function verifyUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;
>>>>>>> Stashed changes

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
