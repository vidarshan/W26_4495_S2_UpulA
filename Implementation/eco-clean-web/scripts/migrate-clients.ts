import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import "dotenv/config";

async function migrateClients() {
  const users = await prisma.user.findMany({
    where: { role: Role.CLIENT },
  });

  for (const user of users) {
    const [firstName, ...rest] = user.name.split(" ");

    await prisma.client.create({
      data: {
        firstName,
        lastName: rest.join(" "),
        email: user.email,
        phone: "",
        preferredContact: "email",
      },
    });
  }
}

migrateClients()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
export {};
