"use client";

import TopBar from "@/app/components/pwa/TopBar";
import { useStaffUiStore } from "@/stores/store";
import {
  ActionIcon,
  Box,
  Button,
  Container,
  Drawer,
  Group,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IoCalendarClearOutline,
  IoCheckboxOutline,
  IoCloseOutline,
  IoPersonOutline,
  IoTimeOutline,
  IoClipboardOutline,
  IoCashOutline
} from "react-icons/io5";

type MenuItemProps = {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
};

function MenuItem({ href, label, icon, active, onClick }: MenuItemProps) {
  return (
    <UnstyledButton
      component={Link}
      href={href}
      onClick={onClick}
      style={{
        width: "100%",
        padding: "10px 4px",
        borderRadius: 12,
      }}
    >
      <Group gap="sm">
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            color: "var(--mantine-color-dark-8)",
          }}
        >
          {icon}
        </Box>

        <Text fw={active ? 700 : 500} size="lg">
          {label}
        </Text>
      </Group>
    </UnstyledButton>
  );
}
////
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
    onBack,
  } = useStaffUiStore();

  const pathname = usePathname();

  return (
    <Container p={0} mih="100vh">
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        withCloseButton={false}
        position="left"
        size="78%"
        overlayProps={{ backgroundOpacity: 0.45, blur: 0 }}
        styles={{
          body: {
            padding: 0,
            height: "100%",
          },
          content: {
            backgroundColor: "white",
          },
        }}
      >
        <Box pt="lg" px="sm">
          <Group justify="space-between" align="center" mb="xl">
            <Text size="xl" fw={500}>
              Eco Clean
            </Text>

            <ActionIcon
              variant="subtle"
              color="dark"
              radius="xl"
              onClick={closeDrawer}
            >
              <IoCloseOutline size={28} />
            </ActionIcon>
          </Group>
        </Box>
        <Stack px="sm" gap="xs">
          <Button
            component={Link}
            href="/staff/tasks"
            variant="subtle"
            radius="md"
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
            href="/staff/profile"
            variant="subtle"
            radius="md"
            fullWidth
            color="dark"
            justify="flex-start"
            onClick={closeDrawer}
            leftSection={<IoPersonOutline />}
          >
            Profile
          </Button>
          <Button
            component={Link}
            variant="subtle"
            href="/staff/enter-time"
            radius="md"
            fullWidth
            justify="flex-start"
            onClick={closeDrawer}
            color="dark"
            leftSection={<IoClipboardOutline />}
          >
            Your Time
          </Button>
          <Button
            component={Link}
            variant="subtle"
            href="/staff/your-pay"
            radius="md"
            fullWidth
            justify="flex-start"
            onClick={closeDrawer}
            color="dark"
            leftSection={<IoCashOutline />}
          >
            Your Pay
          </Button>
          <Button
            component={Link}
            variant="subtle"
            href="/staff/apply-leave"
            radius="md"
            fullWidth
            justify="flex-start"
            onClick={closeDrawer}
            color="dark"
            leftSection={<IoCalendarClearOutline />}
          >
            Time-off
          </Button>
          <Button
            component={Link}
            variant="subtle"
            href="/staff/enter-availability"
            radius="md"
            fullWidth
            justify="flex-start"
            onClick={closeDrawer}
            color="dark"
            leftSection={<IoTimeOutline />}
          >
            Availability
          </Button>

          <Button
            radius="md"
            onClick={() => signOut({ callbackUrl: "/login" })}
            fullWidth
          >
            Logout
          </Button>
        </Stack>
      </Drawer>

      <TopBar
        back={back}
        onClick={back ? (onBack ?? (() => window.history.back())) : openDrawer}
        title={title}
        onRefresh={() => onRefresh?.()}
        refreshing={refreshing}
      />

      {children}
    </Container>
  );
}
