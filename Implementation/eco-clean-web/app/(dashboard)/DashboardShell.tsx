"use client";
import {
  ActionIcon,
  AppShell,
  Box,
  Button,
  Container,
  Divider,
  Flex,
  NavLink,
  Popover,
  Stack,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import {
  IoAddCircleOutline,
  IoBriefcaseOutline,
  IoCogOutline,
  IoHandLeftOutline,
  IoHomeOutline,
  IoLogOutOutline,
  IoMenu,
  IoPeopleOutline,
  IoPersonOutline,
} from "react-icons/io5";
import ClientPropertyModal from "../components/ClientModal";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [opened, { toggle }] = useDisclosure(true);
  const [clientPopoverOpened, setClientPopoverOpened] = useState(false);
  const pathname = usePathname();

  return (
    <AppShell
      padding="md"
      navbar={{
        width: opened ? 240 : 72,
        breakpoint: "sm",
      }}
    >
      <AppShell.Navbar p="md">
        <Stack h="100%" justify="space-between">
          <Stack gap="xs">
            <Flex justify="center">
              <ActionIcon
                variant="subtle"
                onClick={toggle}
                mb="sm"
                aria-label="Toggle sidebar"
              >
                <IoMenu size={20} />
              </ActionIcon>
            </Flex>
            <Flex align="center" justify="center">
              <Popover width={200} position="right" withArrow shadow="md">
                <Popover.Target>
                  {opened ? (
                    <Button
                      leftSection={<IoAddCircleOutline size={18} />}
                      onClick={toggle}
                      fullWidth
                    >
                      Create New
                    </Button>
                  ) : (
                    <ActionIcon
                      variant="filled"
                      onClick={toggle}
                      mb="sm"
                      aria-label="Toggle sidebar"
                    >
                      <IoAddCircleOutline size={20} />
                    </ActionIcon>
                  )}
                </Popover.Target>
                <Popover.Dropdown>
                  <Button
                    color="blue"
                    variant="light"
                    leftSection={<IoPersonOutline />}
                    onClick={() => setClientPopoverOpened(true)}
                    fullWidth
                  >
                    Client
                  </Button>
                  <Button
                    color="grey"
                    variant="light"
                    mt="sm"
                    leftSection={<IoHandLeftOutline />}
                    fullWidth
                  >
                    Job
                  </Button>
                </Popover.Dropdown>
              </Popover>
            </Flex>
            <NavLink
              component={Link}
              href="/"
              bdrs="md"
              label={opened ? "Dashboard" : undefined}
              leftSection={<IoHomeOutline />}
              active={pathname === "/"}
            />
            <NavLink
              component={Link}
              href="/clients"
              bdrs="md"
              label={opened ? "Clients" : undefined}
              leftSection={<IoPeopleOutline />}
              active={pathname.startsWith("/clients")}
            />
            <NavLink
              component={Link}
              href="/users"
              bdrs="md"
              label={opened ? "Employees" : undefined}
              leftSection={<IoBriefcaseOutline />}
              active={pathname.startsWith("/users")}
            />
            <NavLink
              component={Link}
              href="/settings"
              bdrs="md"
              label={opened ? "Settings" : undefined}
              leftSection={<IoCogOutline />}
              active={pathname.startsWith("/settings")}
            />
            <Box>
              <Divider mb="xs" />
              <NavLink
                component="button"
                label={opened ? "Log out" : undefined}
                leftSection={<IoLogOutOutline size={18} />}
                color="red"
                bdrs="md"
                onClick={() => signOut({ callbackUrl: "/login" })}
              />
            </Box>
          </Stack>
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main>
        <Container bg="red" fluid>
          <ClientPropertyModal
            opened={clientPopoverOpened}
            onClose={() => setClientPopoverOpened(false)}
          />
          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
