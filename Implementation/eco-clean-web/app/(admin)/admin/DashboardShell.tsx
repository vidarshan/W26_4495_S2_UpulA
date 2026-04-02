"use client";

import {
  Alert,
  AppShell,
  Box,
  Container,
  Divider,
  Flex,
  Stack,
  Text,
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
  IoHomeOutline,
  IoLogOutOutline,
  IoPeopleOutline,
} from "react-icons/io5";
import ClientPropertyModal from "../../components/popups/ClientModal";
import NewJobModal from "../../components/popups/JobModal";
import UserUpsertModal from "../../components/popups/UserModal";
import { useDashboardUI } from "@/stores/store";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const isNarrow = useMediaQuery("(max-width: 62em)");
  const pathname = usePathname();
  const { selectedInfo } = useDashboardUI();

  const [opened, setOpened] = useState(false);
  const [clientPopoverOpened, setClientPopoverOpened] = useState(false);
  const [jobPopoverOpened, setJobPopoverOpened] = useState(false);
  const [userOpened, setUserOpened] = useState(false);

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeAllOverlays = useCallback(() => {
    setOpened(false);
    setClientPopoverOpened(false);
    setJobPopoverOpened(false);
    setUserOpened(false);
  }, []);

  const closeUserModal = useCallback(() => {
    setUserOpened(false);
  }, []);

  const handleMainClick = useCallback(() => {
    if (opened) setOpened(false);
  }, [opened]);

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
  ];

  return (
    <AppShell
      padding={isNarrow ? "sm" : "md"}
      navbar={{
        width: isNarrow ? 72 : 84,
        breakpoint: 0,
      }}
      className="app-shell-chrome"
    >
      <AppShell.Navbar p="md" className="admin-sidebar">
        <Stack h="100%" justify="space-between">
          <Stack gap="md">
            <Flex justify="center">
              <Link
                href="/admin"
                aria-label="Eco Clean home"
                className="admin-sidebar__brand"
              >
                <Image
                  src="/logo.png"
                  alt="Eco Clean"
                  width={36}
                  height={36}
                  className="admin-sidebar__brand-logo"
                />
                <Text className="admin-sidebar__brand-label">Eco Clean</Text>
              </Link>
            </Flex>

            <Stack gap={8}>
              {navItems.map((item) => (
                <Box
                  key={item.href}
                  component={Link}
                  className={`compact-sidebar-link${item.active ? " compact-sidebar-link--active" : ""}${isSigningOut ? " compact-sidebar-link--disabled" : ""}`}
                  href={item.href}
                  onClick={() => setOpened(false)}
                >
                  <Box className="compact-sidebar-link__icon">{item.icon}</Box>
                  <Box className="compact-sidebar-link__content">
                    <Text className="compact-sidebar-link__label">
                      {item.label}
                    </Text>
                  </Box>
                </Box>
              ))}
            </Stack>

            <Box>
              <Divider mb="sm" />

              <Box
                component="button"
                type="button"
                onClick={handleLogout}
                disabled={isSigningOut}
                className="compact-sidebar-link compact-sidebar-link--danger"
              >
                <Box className="compact-sidebar-link__icon">
                  <IoLogOutOutline size={18} />
                </Box>
                <Box className="compact-sidebar-link__content">
                  <Text className="compact-sidebar-link__label">
                    {isSigningOut ? "Signing out..." : "Sign out"}
                  </Text>
                </Box>
              </Box>
            </Box>
          </Stack>
        </Stack>
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
              radius="md"
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
