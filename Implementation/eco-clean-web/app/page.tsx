import { authOptions } from "@/lib/auth-options";
import { Container } from "@mantine/core";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard/dashboard-client";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <Container size="xl">
      <DashboardClient role={session.user.role} />
    </Container>
  );
}
