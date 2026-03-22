"use client";

import {
  ActionIcon,
  Alert,
  AppShell,
  Box,
  Container,
  Divider,
  Flex,
  NavLink,
  Popover,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";
import {
  IoAlertCircleOutline,
  IoBriefcaseOutline,
  IoHammerOutline,
  IoHomeOutline,
  IoLogOutOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoPersonCircleOutline,
  IoPeopleSharp
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

  const openUserModal = useCallback(() => {
    setError(null);
    setUserOpened(true);
  }, []);

  const closeUserModal = useCallback(() => {
    setUserOpened(false);
  }, []);

  const handleOpenJob = useCallback(() => {
    setError(null);
    setOpened(false);
    setJobPopoverOpened(true);
  }, []);

  const handleOpenClient = useCallback(() => {
    setError(null);
    setOpened(false);
    setClientPopoverOpened(true);
  }, []);

  const handleOpenUser = useCallback(() => {
    setError(null);
    setOpened(false);
    openUserModal();
  }, [openUserModal]);

  const handleToggleQuickActions = useCallback(() => {
    setError(null);
    setOpened((prev) => !prev);
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
    closeAllOverlays();
    setError(null);
  }, [pathname, closeAllOverlays]);

  return (
    <AppShell
      padding="md"
      navbar={{
        width: 72,
        breakpoint: 0,
      }}
    >
      <AppShell.Navbar p="md">
        <Stack h="100%" justify="space-between">
          <Stack gap="xs">
            <Flex justify="center" />

            <Flex align="center" justify="center">
              <Popover
                radius="xl"
                opened={opened}
                position="right"
                withArrow
                shadow="md"
                onChange={setOpened}
              >
                <Popover.Target>
                  <ActionIcon
                    variant="filled"
                    mb="sm"
                    size="xl"
                    radius="xl"
                    onClick={handleToggleQuickActions}
                    aria-label="Open quick actions"
                    disabled={isSigningOut}
                    loading={false}
                  >
                    <FaPlus
                      size={20}
                      style={{
                        transform: opened ? "rotate(405deg)" : "rotate(0deg)",
                        transition: "transform 0.35s ease",
                      }}
                    />
                  </ActionIcon>
                </Popover.Target>

                <Popover.Dropdown p="xs">
                  <Flex direction="column" gap="md">
                    <Flex direction="column" align="center">
                      <ActionIcon
                        variant="light"
                        size="xl"
                        radius="xl"
                        onClick={handleOpenJob}
                        aria-label="Create job"
                        disabled={isSigningOut}
                      >
                        <IoHammerOutline />
                      </ActionIcon>
                      <Text mt="xs" size="xs" fw={600} c="green">
                        Job
                      </Text>
                    </Flex>

                    <Divider />

                    <Flex direction="column" align="center">
                      <ActionIcon
                        variant="light"
                        color="orange"
                        radius="xl"
                        size="xl"
                        onClick={handleOpenClient}
                        aria-label="Create client"
                        disabled={isSigningOut}
                      >
                        <IoPersonOutline />
                      </ActionIcon>
                      <Text mt="xs" size="xs" fw={600} c="orange">
                        Client
                      </Text>
                    </Flex>

                    <Divider />

                    <Flex direction="column" align="center">
                      <ActionIcon
                        variant="light"
                        radius="xl"
                        color="violet"
                        size="xl"
                        onClick={handleOpenUser}
                        aria-label="Create user"
                        disabled={isSigningOut}
                      >
                        <IoBriefcaseOutline />
                      </ActionIcon>
                      <Text mt="xs" size="xs" fw={600} c="violet">
                        User
                      </Text>
                    </Flex>
                  </Flex>
                </Popover.Dropdown>
              </Popover>
            </Flex>

            <Tooltip label="Dashboard" position="right" withArrow>
              <NavLink
                onClick={() => setOpened(false)}
                component={Link}
                href="/admin"
                bdrs="md"
                leftSection={<IoHomeOutline />}
                active={pathname === "/admin"}
                disabled={isSigningOut}
              />
            </Tooltip>

            <Tooltip label="Clients" position="right" withArrow>
              <NavLink
                onClick={() => setOpened(false)}
                component={Link}
                href="/admin/clients"
                bdrs="md"
                leftSection={<IoPeopleOutline />}
                active={pathname.startsWith("/admin/clients")}
                disabled={isSigningOut}
              />
            </Tooltip>

            <Tooltip label="Employees" position="right" withArrow>
              <NavLink
                onClick={() => setOpened(false)}
                component={Link}
                href="/admin/employees"
                bdrs="md"
                leftSection={<IoBriefcaseOutline />}
                active={pathname.startsWith("/admin/employees")}
                disabled={isSigningOut}
              />
            </Tooltip>

            <Tooltip label="Manage Staff" position="right" withArrow>
              <NavLink
                onClick={() => setOpened(false)}
                component={Link}
                href="/admin/manage-staff"
                bdrs="md"
                leftSection={<IoPeopleSharp />}
                active={pathname.startsWith("/admin/staff-profile")}
                disabled={isSigningOut}
              />
            </Tooltip>

            <Box>
              <Divider mb="xs" />
              <NavLink
                component="button"
                leftSection={<IoLogOutOutline size={18} />}
                color="red"
                bdrs="md"
                onClick={handleLogout}
                disabled={isSigningOut}
                label={isSigningOut ? "Signing out..." : undefined}
              />
            </Box>
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container fluid onClick={handleMainClick}>
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
