"use client";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { data } = useSession();

  if (data?.user.role === "STAFF") {
    redirect("/staff/tasks");
  }

  redirect("/admin");
}
