"use client";

import TopBar from "@/app/components/pwa/TopBar";
import { useStaffUiStore } from "@/stores/store";
import {
  Box,
  Container,
  Drawer,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
  alpha,
} from "@mantine/core";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IoCalendarClearOutline,
  IoCashOutline,
  IoCheckboxOutline,
  IoClipboardOutline,
  IoLogOutOutline,
  IoPersonOutline,
  IoTimeOutline,
} from "react-icons/io5";

const PANEL_RADIUS = 18;
const ITEM_RADIUS = 16;
const ICON_RADIUS = 14;

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  active: boolean;
};

type MenuItemProps = NavItem & {
  onClick: () => void;
};

function MenuItem({
  href,
  label,
  description,
  icon,
  active,
  onClick,
}: MenuItemProps) {
  return (
    <UnstyledButton
      component={Link}
      href={href}
      onClick={onClick}
      style={(theme) => ({
        display: "block",
        width: "100%",
        padding: "10px 12px",
        borderRadius: ITEM_RADIUS,
        background: active ? alpha(theme.colors.lime[0], 0.9) : "transparent",
        border: `1px solid ${
          active ? alpha(theme.colors.lime[4], 0.32) : "transparent"
        }`,
        transition:
          "background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
      })}
    >
      <Group gap="xs" wrap="nowrap">
        <ThemeIcon
          size={36}
          radius={ICON_RADIUS}
          variant={active ? "filled" : "light"}
          color={active ? "lime" : "gray"}
        >
          {icon}
        </ThemeIcon>

        <Box style={{ minWidth: 0, flex: 1 }}>
          <Text fw={active ? 700 : 500} size="sm" c="dark.9" truncate>
            {label}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {description}
          </Text>
        </Box>
      </Group>
    </UnstyledButton>
  );
}

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

  const navItems: NavItem[] = [
    {
      href: "/staff/tasks",
      label: "My Tasks",
      description: "Assignments and updates",
      icon: <IoCheckboxOutline size={18} />,
      active: pathname === "/staff" || pathname.startsWith("/staff/tasks"),
    },
    {
      href: "/staff/profile",
      label: "Profile",
      description: "Personal and job details",
      icon: <IoPersonOutline size={18} />,
      active:
        pathname.startsWith("/staff/profile") ||
        pathname.startsWith("/staff/staff-profile"),
    },
    {
      href: "/staff/enter-time",
      label: "Your Time",
      description: "Timesheets and entries",
      icon: <IoClipboardOutline size={18} />,
      active: pathname.startsWith("/staff/enter-time"),
    },
    {
      href: "/staff/your-pay",
      label: "Your Pay",
      description: "Statements and history",
      icon: <IoCashOutline size={18} />,
      active:
        pathname.startsWith("/staff/your-pay") ||
        pathname.startsWith("/staff/pay-history") ||
        pathname.startsWith("/staff/pay-periods"),
    },
    {
      href: "/staff/apply-leave",
      label: "Time-off",
      description: "Leave requests",
      icon: <IoCalendarClearOutline size={18} />,
      active: pathname.startsWith("/staff/apply-leave"),
    },
    {
      href: "/staff/enter-availability",
      label: "Availability",
      description: "Schedule preferences",
      icon: <IoTimeOutline size={18} />,
      active: pathname.startsWith("/staff/enter-availability"),
    },
  ];

  return (
    <Container p={0} mih="100vh" className="staff-shell__content">
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        withCloseButton={false}
        position="left"
        size="72%"
        overlayProps={{ backgroundOpacity: 0.45, blur: 0 }}
        styles={{
          body: {
            padding: 0,
            height: "100%",
          },
          content: {
            background:
              "linear-gradient(180deg, rgba(247, 254, 231, 0.34), rgba(255, 255, 255, 0.98))",
          },
        }}
      >
        <Stack h="100%" p="sm" gap="sm">
          <Paper
            radius={PANEL_RADIUS}
            p="xs"
            withBorder
            className="staff-shell-nav-card"
          >
            <Group justify="space-between" align="center" wrap="nowrap">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon
                  size={40}
                  radius={ICON_RADIUS}
                  variant="light"
                  color="lime"
                >
                  <Image src="/logo.png" alt="Eco Clean" width={22} height={22} />
                </ThemeIcon>
                <Box>
                  <Text size="sm" fw={700} c="dark.9">
                    Eco Clean
                  </Text>
                  <Text size="xs" c="dimmed">
                    Staff workspace
                  </Text>
                </Box>
              </Group>
            </Group>
          </Paper>

          <Stack gap={4}>
            {navItems.map((item) => (
              <MenuItem key={item.href} {...item} onClick={closeDrawer} />
            ))}
          </Stack>

          <Box mt="auto">
            <UnstyledButton
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={(theme) => ({
                display: "block",
                width: "100%",
                padding: "10px 12px",
                borderRadius: ITEM_RADIUS,
                background: alpha(theme.colors.red[0], 0.75),
                border: `1px solid ${alpha(theme.colors.red[2], 0.55)}`,
              })}
            >
              <Group gap="xs" wrap="nowrap">
                <ThemeIcon
                  size={36}
                  radius={ICON_RADIUS}
                  variant="light"
                  color="red"
                >
                  <IoLogOutOutline size={18} />
                </ThemeIcon>
                <Box style={{ minWidth: 0 }}>
                  <Text fw={700} size="sm" c="red.8" truncate>
                    Logout
                  </Text>
                </Box>
              </Group>
            </UnstyledButton>
          </Box>
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
