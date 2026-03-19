import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  console.log(session);
  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "STAFF") {
    redirect("/staff/tasks");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  redirect("/login");
}
