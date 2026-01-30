"use client";

import { Container, MantineProvider } from "@mantine/core";
import { signOut } from "next-auth/react";

export default function DashboardClient({ role }: { role: string }) {
  return (
    <MantineProvider defaultColorScheme="light">
      <Container>
        <h1>Dashboard</h1>
        <p>Role: {role}</p>
        <button onClick={() => signOut({ callbackUrl: "/login" })}>
          Logout
        </button>
      </Container>
    </MantineProvider>
  );
}
