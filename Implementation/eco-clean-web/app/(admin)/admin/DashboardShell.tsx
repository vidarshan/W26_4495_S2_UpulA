"use client";

import {
  Alert,
  AppShell,
  Box,
  Burger,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
  alpha,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import Image from "next/image";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

import {
  IoAlertCircleOutline,
  IoBriefcaseOutline,
  IoCalendarClearOutline,
  IoCashOutline,
  IoHomeOutline,
  IoLogOutOutline,
  IoPeopleOutline,
  IoTimeOutline,
} from "react-icons/io5";
import ClientPropertyModal from "../../components/popups/ClientModal";
import NewJobModal from "../../components/popups/JobModal";
import UserUpsertModal from "../../components/popups/UserModal";
import { useDashboardUI } from "@/stores/store";

const DESKTOP_COLLAPSED_WIDTH = 96;
const DESKTOP_EXPANDED_WIDTH = 292;
const MOBILE_NAVBAR_WIDTH = 304;
const SHELL_RADIUS = 18;
const ITEM_RADIUS = 16;
const ICON_RADIUS = 14;

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useMediaQuery("(max-width: 62em)", false, {
    getInitialValueInEffect: true,
  });
  const pathname = usePathname();
  const { selectedInfo } = useDashboardUI();

  const [mobileOpened, setMobileOpened] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [clientPopoverOpened, setClientPopoverOpened] = useState(false);
  const [jobPopoverOpened, setJobPopoverOpened] = useState(false);
  const [userOpened, setUserOpened] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expanded = isMobile || hovered;
  const closeAllOverlays = useCallback(() => {
    setMobileOpened(false);
    setClientPopoverOpened(false);
    setJobPopoverOpened(false);
    setUserOpened(false);
  }, []);

  const closeUserModal = useCallback(() => {
    setUserOpened(false);
  }, []);

  const handleMainClick = useCallback(() => {
    if (mobileOpened) {
      setMobileOpened(false);
    }
  }, [mobileOpened]);

  const handleLogout = useCallback(async () => {
    if (isSigningOut) return;

    try {
      setError(null);
      setIsSigningOut(true);
      await signOut({ callbackUrl: "/login", redirect: true });
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Failed to sign out. Please try again.");
      setIsSigningOut(false);
    }
  }, [isSigningOut]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      closeAllOverlays();
      setError(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname, closeAllOverlays]);

  const navItems = [
    {
      href: "/admin",
      label: "Dashboard",
      description: "Calendar and operations",
      icon: <IoHomeOutline size={18} />,
      active: pathname === "/admin",
    },
    {
      href: "/admin/clients",
      label: "Clients",
      description: "Accounts and properties",
      icon: <IoPeopleOutline size={18} />,
      active: pathname.startsWith("/admin/clients"),
    },
    {
      href: "/admin/employees",
      label: "Employees",
      description: "Payroll and team setup",
      icon: <IoBriefcaseOutline size={18} />,
      active: pathname.startsWith("/admin/employees"),
    },
    {
      href: "/admin/manage-staff/leave-approval",
      label: "Leave",
      description: "Requests and approvals",
      icon: <IoCalendarClearOutline size={18} />,
      active: pathname.startsWith("/admin/manage-staff/leave-approval"),
    },
    {
      href: "/admin/pay-periods",
      label: "Payroll",
      description: "Statements and pay runs",
      icon: <IoCashOutline size={18} />,
      active:
        pathname.startsWith("/admin/pay-periods") ||
        pathname.startsWith("/admin/pay/"),
    },
    {
      href: "/admin/timesheets",
      label: "Timesheets",
      description: "Time review and approval",
      icon: <IoTimeOutline size={18} />,
      active: pathname.startsWith("/admin/timesheets"),
    },
  ];
  return (
    <AppShell
      padding={{ base: "sm", md: "md" }}
      header={{ height: 72, collapsed: !isMobile }}
      navbar={{
        width: isMobile
          ? MOBILE_NAVBAR_WIDTH
          : expanded
            ? DESKTOP_EXPANDED_WIDTH
            : DESKTOP_COLLAPSED_WIDTH,
        breakpoint: "md",
        collapsed: { mobile: !mobileOpened, desktop: false },
      }}
      className="app-shell-chrome"
    >
      <AppShell.Header withBorder={false} bg="transparent">
        <Box px="sm" pt="sm">
          <Paper
            radius={SHELL_RADIUS}
            px="sm"
            py="xs"
            shadow="xs"
            style={(theme) => ({
              background: alpha(theme.white, 0.94),
              border: `1px solid ${alpha(theme.colors.gray[3], 0.9)}`,
              backdropFilter: "blur(14px)",
            })}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon
                  size={40}
                  radius={ICON_RADIUS}
                  variant="light"
                  color="lime"
                >
                  <Image
                    src="/logo.png"
                    alt="Eco Clean"
                    width={22}
                    height={22}
                  />
                </ThemeIcon>
                <Box>
                  <Text fw={800} size="sm" c="dark.9">
                    Eco Clean
                  </Text>
                  <Text size="xs" c="dimmed">
                    Admin workspace
                  </Text>
                </Box>
              </Group>

              <Burger
                opened={mobileOpened}
                onClick={() => setMobileOpened((current) => !current)}
                aria-label="Toggle navigation"
                size="sm"
              />
            </Group>
          </Paper>
        </Box>
      </AppShell.Header>

      <AppShell.Navbar
        p={{ base: "sm", md: "md" }}
        withBorder={false}
        onMouseEnter={() => {
          if (!isMobile) setHovered(true);
        }}
        onMouseLeave={() => {
          if (!isMobile) setHovered(false);
        }}
        style={(theme) => ({
          background:
            "linear-gradient(180deg, rgba(247, 254, 231, 0.5), rgba(255, 255, 255, 0.96))",
          borderRight: `1px solid ${alpha(theme.colors.lime[2], 0.42)}`,
          boxShadow: `10px 0 30px ${alpha(theme.black, 0.04)}`,
          overflow: "hidden",
          transition: "width 220ms ease, padding 220ms ease",
          backdropFilter: "blur(14px)",
        })}
      >
        <AppShell.Section>
          <Paper
            radius={SHELL_RADIUS}
            p={expanded ? "md" : "xs"}
            style={(theme) => ({
              background:
                "linear-gradient(180deg, rgba(247, 254, 231, 0.9), rgba(255, 255, 255, 0.96))",
              border: `1px solid ${alpha(theme.colors.lime[2], 0.45)}`,
              boxShadow: `0 12px 28px ${alpha(theme.black, 0.05)}`,
              transition: "padding 220ms ease",
            })}
          >
            <Group
              justify={expanded ? "space-between" : "center"}
              wrap="nowrap"
            >
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon
                  size={40}
                  radius={ICON_RADIUS}
                  variant="light"
                  color="lime"
                >
                  <Image
                    src="/logo.png"
                    alt="Eco Clean"
                    width={26}
                    height={26}
                  />
                </ThemeIcon>
                {expanded && (
                  <Box
                    style={{
                      maxWidth: 160,
                      opacity: expanded ? 1 : 0,
                      overflow: "hidden",
                      transform: `translateX(${expanded ? "0" : "-8px"})`,
                      transition:
                        "max-width 180ms ease, opacity 140ms ease, transform 180ms ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Text fw={800} size="md" c="dark.9">
                      Eco Clean
                    </Text>
                    <Text size="xs" c="dimmed">
                      Admin workspace
                    </Text>
                  </Box>
                )}
              </Group>
            </Group>
          </Paper>
        </AppShell.Section>

        <AppShell.Section grow mt="lg">
          <Stack gap="xs">
            {navItems.map((item) => (
              <UnstyledButton
                key={item.href}
                component={Link}
                href={item.href}
                onClick={() => setMobileOpened(false)}
                style={(theme) => ({
                  display: "block",
                  width: "100%",
                  borderRadius: ITEM_RADIUS,
                  padding: expanded ? "12px 14px" : "10px 12px",
                  background: item.active
                    ? alpha(theme.colors.lime[0], 0.9)
                    : alpha(theme.white, 0.64),
                  border: `1px solid ${
                    item.active
                      ? alpha(theme.colors.lime[4], 0.32)
                      : alpha(theme.colors.gray[3], 0.42)
                  }`,
                  boxShadow: item.active
                    ? `0 10px 24px ${alpha(theme.colors.lime[9], 0.08)}`
                    : "none",
                  transition:
                    "background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease, padding 220ms ease",
                  opacity: isSigningOut ? 0.6 : 1,
                  pointerEvents: isSigningOut ? "none" : "auto",
                })}
              >
                <Group
                  gap={expanded ? "sm" : 0}
                  justify={expanded ? "flex-start" : "center"}
                  wrap="nowrap"
                >
                  <ThemeIcon
                    size={40}
                    radius={ICON_RADIUS}
                    variant={item.active ? "filled" : "light"}
                    color={item.active ? "lime" : "gray"}
                  >
                    {item.icon}
                  </ThemeIcon>

                  <Box
                    style={{
                      flex: 1,
                      minWidth: 0,
                      maxWidth: expanded ? 180 : 0,
                      opacity: expanded ? 1 : 0,
                      overflow: "hidden",
                      transform: `translateX(${expanded ? "0" : "-8px"})`,
                      transition:
                        "max-width 180ms ease, opacity 140ms ease, transform 180ms ease",
                    }}
                  >
                    <Text fw={700} size="sm" c="dark.9" truncate>
                      {item.label}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {item.description}
                    </Text>
                  </Box>
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          <Paper
            radius={SHELL_RADIUS}
            p={expanded ? "xs" : 0}
            bg="transparent"
            style={{ transition: "padding 220ms ease" }}
          >
            <UnstyledButton
              type="button"
              onClick={handleLogout}
              disabled={isSigningOut}
              style={(theme) => ({
                display: "block",
                width: "100%",
                borderRadius: ITEM_RADIUS,
                padding: expanded ? "12px 14px" : "10px 12px",
                background: alpha(theme.colors.red[0], 0.75),
                border: `1px solid ${alpha(theme.colors.red[2], 0.55)}`,
                boxShadow: `0 10px 24px ${alpha(theme.black, 0.04)}`,
                transition:
                  "background-color 150ms ease, border-color 150ms ease, padding 220ms ease",
                opacity: isSigningOut ? 0.7 : 1,
                pointerEvents: isSigningOut ? "none" : "auto",
              })}
            >
              <Group
                gap={expanded ? "sm" : 0}
                justify={expanded ? "flex-start" : "center"}
                wrap="nowrap"
              >
                <ThemeIcon
                  size={40}
                  radius={ICON_RADIUS}
                  variant="light"
                  color="red"
                >
                  <IoLogOutOutline size={18} />
                </ThemeIcon>

                <Box
                  style={{
                    flex: 1,
                    minWidth: 0,
                    maxWidth: expanded ? 180 : 0,
                    opacity: expanded ? 1 : 0,
                    overflow: "hidden",
                    transform: `translateX(${expanded ? "0" : "-8px"})`,
                    transition:
                      "max-width 180ms ease, opacity 140ms ease, transform 180ms ease",
                  }}
                >
                  <Text fw={700} size="sm" c="red.8" truncate>
                    {isSigningOut ? "Signing out..." : "Sign out"}
                  </Text>
                </Box>
              </Group>
            </UnstyledButton>
          </Paper>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main className="app-shell-main">
        <Container
          fluid
          onClick={handleMainClick}
          className="app-shell-main__inner"
        >
          {error && (
            <Alert
              mb="md"
              icon={<IoAlertCircleOutline size={18} />}
              color="red"
              radius="lg"
              variant="light"
              withCloseButton
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <UserUpsertModal
            key="new"
            opened={userOpened}
            onClose={closeUserModal}
            mode="create"
            user={null}
          />

          <ClientPropertyModal
            opened={clientPopoverOpened}
            onClose={() => setClientPopoverOpened(false)}
          />

          <NewJobModal
            opened={jobPopoverOpened}
            onClose={() => setJobPopoverOpened(false)}
            selectedInfo={selectedInfo}
            onSuccess={() => {
              setJobPopoverOpened(false);
            }}
          />

          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
