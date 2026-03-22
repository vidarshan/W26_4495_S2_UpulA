"use client";

import { useState } from "react";
import {
  Burger,
  Drawer,
  Group,
  NavLink,
  Stack,
  Text,
  Title,
  Box,
  Paper,
  Accordion,
  Divider,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IoPeopleOutline,
  IoCashOutline,
  IoTimeOutline,
  IoCalendarClearOutline,
} from "react-icons/io5";
import DashboardShell from "../DashboardShell";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ManageStaffPage() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [activeSection, setActiveSection] = useState("leave");
  const pathname = usePathname();

  const renderSectionContent = () => {
    switch (activeSection) {
      case "leave":
        return (
          <Accordion defaultValue="leave-overview" variant="separated">
            <Accordion.Item value="leave-overview">
              <Accordion.Control>
                <Text fw={600}>Leave Management</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm">
                  Manage leave requests, approvals, balances, and leave history
                  for staff members.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="leave-actions">
              <Accordion.Control>
                <Text fw={600}>Available Actions</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm">
                  View pending requests, approve or reject leave, and monitor
                  employee leave records.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        );

      case "payroll":
        return (
          <Accordion defaultValue="payroll-overview" variant="separated">
            <Accordion.Item value="payroll-overview">
              <Accordion.Control>
                <Text fw={600}>Payroll Management</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm">
                  Review pay periods, payroll summaries, deductions, and staff
                  payment details.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="payroll-actions">
              <Accordion.Control>
                <Text fw={600}>Available Actions</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm">
                  Edit pay periods, review statements, and manage payroll-related
                  records.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        );

      case "time":
        return (
          <Accordion defaultValue="time-overview" variant="separated">
            <Accordion.Item value="time-overview">
              <Accordion.Control>
                <Text fw={600}>Time & Time-Off</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm">
                  Track work hours, monitor submitted timesheets, and manage
                  time-off related staff activities.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="time-actions">
              <Accordion.Control>
                <Text fw={600}>Available Actions</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm">
                  Review timesheets, update attendance-related data, and manage
                  time-off entries.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        );

      default:
        return null;
    }
  };

  const navItems = (
    <Stack gap="xs">
      <NavLink
        label="Leave Management"
        leftSection={<IoCalendarClearOutline size={18} />}
        active={activeSection === "leave"}
        onClick={() => {
          setActiveSection("leave");
          close();
        }}
      />

      <NavLink
  label="Payroll Management"
  component={Link}
  href="/admin/manage-staff/payroll"
  leftSection={<IoCashOutline size={18} />}
  active={pathname.startsWith("/admin/manage-staff/payroll")}
  onClick={close}
/>

      <NavLink
        label="Time & Time-Off"
        leftSection={<IoTimeOutline size={18} />}
        active={activeSection === "time"}
        onClick={() => {
          setActiveSection("time");
          close();
        }}
      />
    </Stack>
  );

  return (
    <DashboardShell>
      <Drawer
        opened={opened}
        onClose={close}
        title="Manage Staff"
        padding="md"
        size="xs"
        hiddenFrom="sm"
      >
        {navItems}
      </Drawer>

      <Stack gap="md">
        <Group justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <IoPeopleOutline size={22} />
            <Title order={2}>Manage Staff</Title>
          </Group>
        </Group>

        <Text c="dimmed" size="sm">
          Select a section to manage staff-related functions.
        </Text>

        <Divider />

        <Group align="flex-start" wrap="nowrap">
          <Paper
            withBorder
            radius="md"
            p="md"
            visibleFrom="sm"
            miw={260}
          >
            <Text fw={700} mb="md">
              Staff Functions
            </Text>
            {navItems}
          </Paper>

          <Paper withBorder radius="md" p="md" style={{ flex: 1 }}>
            {renderSectionContent()}
          </Paper>
        </Group>
      </Stack>
    </DashboardShell>
  );
}
