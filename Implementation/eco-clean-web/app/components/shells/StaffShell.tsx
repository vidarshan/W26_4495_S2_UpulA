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
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  IoCalendarClear,
  IoCash,
  IoCheckbox,
  IoClipboard,
  IoLogOut,
  IoPerson,
  IoTime,
} from "@/lib/icons";

const PANEL_RADIUS = 14;
const ITEM_RADIUS = 12;
const ICON_RADIUS = 10;

const PRIMARY_NAV_ROUTES = [
  "/staff/tasks",
  "/staff/profile",
  "/staff/enter-time",
  "/staff/your-pay",
  "/staff/apply-leave",
  "/staff/enter-availability",
] as const;

function resolveRouteMeta(pathname: string) {
  if (pathname === "/staff" || pathname.startsWith("/staff/tasks")) {
    if (pathname === "/staff" || pathname === "/staff/tasks") {
      return { title: "Tasks", backHref: null };
    }

    return { title: "Task Details", backHref: "/staff/tasks" };
  }

  if (
    pathname.startsWith("/staff/profile") ||
    pathname.startsWith("/staff/staff-profile")
  ) {
    return { title: "Profile", backHref: null };
  }

  if (pathname.startsWith("/staff/enter-time")) {
    return { title: "Time", backHref: null };
  }

  if (pathname.startsWith("/staff/your-pay")) {
    return { title: "Pay", backHref: null };
  }

  if (pathname.startsWith("/staff/pay-history")) {
    return { title: "Pay History", backHref: "/staff/your-pay" };
  }

  if (pathname.startsWith("/staff/pay-periods")) {
    return { title: "Pay Periods", backHref: "/staff/your-pay" };
  }

  if (pathname.startsWith("/staff/pay-stub")) {
    return { title: "Pay Stub", backHref: "/staff/your-pay" };
  }

  if (pathname.startsWith("/staff/apply-leave")) {
    return { title: "Time-off", backHref: null };
  }

  if (pathname.startsWith("/staff/enter-availability")) {
    return { title: "Availability", backHref: null };
  }

  return { title: "Eco Clean", backHref: null };
}

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
  const router = useRouter();
  const {
    drawerOpened,
    openDrawer,
    closeDrawer,
    refreshing,
    onRefresh,
    onBack,
  } = useStaffUiStore();

  const pathname = usePathname();
  const routeMeta = useMemo(() => resolveRouteMeta(pathname), [pathname]);
  const isPrimaryRoute = useMemo(
    () =>
      PRIMARY_NAV_ROUTES.some((route) =>
        pathname === route || pathname.startsWith(`${route}/`),
      ) || pathname === "/staff",
    [pathname],
  );
  const effectiveTitle = routeMeta.title;
  const effectiveBack = !isPrimaryRoute && !!routeMeta.backHref;
  const handleTopBarClick = () => {
    if (effectiveBack) {
      if (onBack) {
        onBack();
        return;
      }

      if (routeMeta.backHref) {
        router.push(routeMeta.backHref);
        return;
      }

      router.back();
      return;
    }

    openDrawer();
  };

  const navItems: NavItem[] = [
    {
      href: "/staff/tasks",
      label: "My Tasks",
      description: "Assignments and updates",
      icon: <IoCheckbox size={18} />,
      active: pathname === "/staff" || pathname.startsWith("/staff/tasks"),
    },
    {
      href: "/staff/profile",
      label: "Profile",
      description: "Personal and job details",
      icon: <IoPerson size={18} />,
      active:
        pathname.startsWith("/staff/profile") ||
        pathname.startsWith("/staff/staff-profile"),
    },
    {
      href: "/staff/enter-time",
      label: "Your Time",
      description: "Timesheets and entries",
      icon: <IoClipboard size={18} />,
      active: pathname.startsWith("/staff/enter-time"),
    },
    {
      href: "/staff/your-pay",
      label: "Your Pay",
      description: "Statements and history",
      icon: <IoCash size={18} />,
      active:
        pathname.startsWith("/staff/your-pay") ||
        pathname.startsWith("/staff/pay-history") ||
        pathname.startsWith("/staff/pay-periods"),
    },
    {
      href: "/staff/apply-leave",
      label: "Time-off",
      description: "Leave requests",
      icon: <IoCalendarClear size={18} />,
      active: pathname.startsWith("/staff/apply-leave"),
    },
    {
      href: "/staff/enter-availability",
      label: "Availability",
      description: "Schedule preferences",
      icon: <IoTime size={18} />,
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
          header: {
            background:
              "linear-gradient(180deg, rgba(250, 252, 245, 0.98), rgba(244, 247, 236, 0.98))",
          },
          body: {
            padding: 0,
            height: "100%",
            background:
              "linear-gradient(180deg, rgba(250, 252, 245, 0.98), rgba(244, 247, 236, 0.98))",
          },
          content: {
            background:
              "linear-gradient(180deg, rgba(250, 252, 245, 0.99), rgba(242, 247, 231, 0.99))",
            borderRight: "1px solid rgba(190, 201, 166, 0.45)",
            boxShadow: "14px 0 32px rgba(15, 23, 42, 0.12)",
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
                  <IoLogOut size={18} />
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
        back={effectiveBack}
        onClick={handleTopBarClick}
        title={effectiveTitle}
        onRefresh={onRefresh ?? undefined}
        refreshing={refreshing}
      />

      <Box className="staff-shell__main">{children}</Box>
    </Container>
  );
}
