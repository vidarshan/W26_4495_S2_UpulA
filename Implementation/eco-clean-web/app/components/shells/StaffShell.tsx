"use client";

import { Button, Container, Drawer, NavLink, Stack } from "@mantine/core";
import { signOut } from "next-auth/react";
import Link from "next/link";
import TopBar from "@/app/components/pwa/TopBar";
import { useStaffUiStore } from "@/stores/store";
import {
  IoCheckboxOutline,
  IoPersonAdd,
  IoPersonAddOutline,
  IoPersonAddSharp,
  IoPersonOutline,
  IoPersonSharp,
} from "react-icons/io5";

export default function StaffShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    drawerOpened,
    openDrawer,
    closeDrawer,
    title,
    back,
    refreshing,
    onRefresh,
  } = useStaffUiStore();

  return (
    <Container p={0} mih="100vh">
      <Drawer
        size="60%"
        opened={drawerOpened}
        onClose={closeDrawer}
        title="Eco Clean"
      >
        <Stack gap="xs">
          <Button
            component={Link}
            px={0}
            href="/staff/tasks"
            variant="subtle"
            radius="lg"
            fullWidth
            justify="flex-start"
            onClick={closeDrawer}
            color="dark"
            leftSection={<IoCheckboxOutline />}
          >
            My Tasks
          </Button>

          <Button
            component={Link}
            px={0}
            href="/staff/profile"
            variant="subtle"
            radius="lg"
            fullWidth
            color="dark"
            justify="flex-start"
            onClick={closeDrawer}
            leftSection={<IoPersonOutline />}
          >
            Profile
          </Button>

          <Button
            radius="lg"
            onClick={() => signOut({ callbackUrl: "/login" })}
            fullWidth
          >
            Logout
          </Button>
        </Stack>
      </Drawer>

      <TopBar
        back={back}
        onClick={openDrawer}
        title={title}
        onRefresh={() => onRefresh?.()}
        refreshing={refreshing}
      />

      {children}
    </Container>
  );
}
