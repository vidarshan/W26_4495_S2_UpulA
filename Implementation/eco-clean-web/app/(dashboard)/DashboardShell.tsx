"use client";
import {
  ActionIcon,
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
import React, { useState } from "react";
import { FaPlus } from "react-icons/fa";
import {
  IoAccessibilityOutline,
  IoBriefcaseOutline,
  IoCogOutline,
  IoHammerOutline,
  IoHomeOutline,
  IoLogOutOutline,
  IoPeopleOutline,
  IoPersonOutline,
} from "react-icons/io5";
import ClientPropertyModal from "../components/ClientModal";
import NewJobModal from "../components/popups/JobModal";
import { useDashboardUI } from "@/stores/store";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [opened, setOpened] = useState(false);
  const [clientPopoverOpened, setClientPopoverOpened] = useState(false);
  const [jobPopoverOpened, setJobPopoverOpened] = useState(false);
  const pathname = usePathname();
  const { selectedInfo } = useDashboardUI();

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
            <Flex justify="center"></Flex>
            <Flex align="center" justify="center">
              <Popover opened={opened} position="right" withArrow shadow="md">
                <Popover.Target>
                  <ActionIcon
                    variant="filled"
                    mb="sm"
                    size="xl"
                    onClick={() => setOpened((o) => !o)}
                    aria-label="Toggle sidebar"
                  >
                    <FaPlus
                      size={20}
                      style={{
                        transform: opened ? "rotate(405deg)" : "rotate(0deg)",

                        transition: "transform 0.5s",
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
                        onClick={() => {
                          setOpened(false);
                          setJobPopoverOpened(true);
                        }}
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
                        size="xl"
                        onClick={() => {
                          setOpened(false);
                          setClientPopoverOpened(true);
                        }}
                      >
                        <IoPersonOutline />
                      </ActionIcon>
                      <Text mt="xs" size="xs" fw={600} c="orange">
                        Client
                      </Text>
                    </Flex>
                  </Flex>
                </Popover.Dropdown>
              </Popover>
            </Flex>
            <Tooltip label="Dashboard" position="right" withArrow>
              <NavLink
                component={Link}
                href="/"
                bdrs="md"
                leftSection={<IoHomeOutline />}
                active={pathname === "/"}
              />
            </Tooltip>
            <Tooltip label="Clients" position="right" withArrow>
              <NavLink
                component={Link}
                href="/clients"
                bdrs="md"
                leftSection={<IoPeopleOutline />}
                active={pathname.startsWith("/clients")}
              />
            </Tooltip>
            <Tooltip label="Employees" position="right" withArrow>
              <NavLink
                component={Link}
                href="/users"
                bdrs="md"
                leftSection={<IoBriefcaseOutline />}
                active={pathname.startsWith("/users")}
              />
            </Tooltip>
            <Tooltip label="Employees" position="right" withArrow>
              <NavLink
                component={Link}
                href="/pay"
                bdrs="md"
                leftSection={<IoAccessibilityOutline />}
                active={pathname.startsWith("/pay")}
              />
            </Tooltip>
            <Tooltip label="Settings" position="right" withArrow>
              <NavLink
                component={Link}
                href="/settings"
                bdrs="md"
                leftSection={<IoCogOutline />}
                active={pathname.startsWith("/settings")}
              />
            </Tooltip>

            <Box>
              <Divider mb="xs" />
              <NavLink
                component="button"
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
        <Container fluid>
          <ClientPropertyModal
            opened={clientPopoverOpened}
            onClose={() => setClientPopoverOpened(false)}
          />
          <NewJobModal
            opened={jobPopoverOpened}
            onClose={() => setJobPopoverOpened(false)}
            selectedInfo={selectedInfo}
            onSuccess={() => console.log("refresh")}
          />
          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
