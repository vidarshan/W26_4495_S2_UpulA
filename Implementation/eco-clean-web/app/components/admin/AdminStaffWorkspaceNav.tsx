"use client";

import { Group, Paper, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IoArrowForwardOutline,
  IoCalendarClearOutline,
  IoCashOutline,
  IoDocumentTextOutline,
  IoPeopleOutline,
  IoTimeOutline,
} from "react-icons/io5";

type WorkspaceItem = {
  href: string;
  label: string;
  description: string;
  icon: typeof IoPeopleOutline;
  match: (pathname: string) => boolean;
};

const WORKSPACE_ITEMS: WorkspaceItem[] = [
  {
    href: "/admin/manage-staff",
    label: "Overview",
    description: "Navigate leave, payroll, and time workflows from one entry point.",
    icon: IoPeopleOutline,
    match: (pathname) => pathname === "/admin/manage-staff",
  },
  {
    href: "/admin/pay-periods",
    label: "Pay Periods",
    description: "Prepare payroll, review totals, and generate statements.",
    icon: IoCashOutline,
    match: (pathname) => pathname.startsWith("/admin/pay-periods"),
  },
  {
    href: "/admin/timesheets",
    label: "Timesheets",
    description: "Approve staff time with planned-versus-actual review.",
    icon: IoTimeOutline,
    match: (pathname) => pathname.startsWith("/admin/timesheets"),
  },
  {
    href: "/admin/manage-staff/leave-approval",
    label: "Leave",
    description: "Process leave requests and review approvals.",
    icon: IoCalendarClearOutline,
    match: (pathname) => pathname.startsWith("/admin/manage-staff/leave-approval"),
  },
];

export default function AdminStaffWorkspaceNav() {
  const pathname = usePathname();

  return (
    <Paper withBorder radius="lg" p="md" className="admin-workspace-nav">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" gap="md">
          <div>
            <Text size="sm" fw={700} c="#0f172a">
              Staff operations workspace
            </Text>
            <Text size="sm" c="dimmed" mt={4}>
              Move across the redesigned staff admin flow without dropping back into older isolated pages.
            </Text>
          </div>

          <Group gap="xs" c="dimmed">
            <IoDocumentTextOutline size={16} />
            <Text size="sm">Unified navigation</Text>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
          {WORKSPACE_ITEMS.map((item) => {
            const active = item.match(pathname);

            return (
              <Paper
                key={item.href}
                component={Link}
                href={item.href}
                withBorder
                radius="lg"
                p="md"
                className="admin-workspace-nav__item"
                style={{
                  borderColor: active ? "rgba(13, 148, 136, 0.28)" : undefined,
                  background: active
                    ? "linear-gradient(180deg, rgba(240, 253, 250, 0.98), rgba(239, 246, 255, 0.95))"
                    : undefined,
                }}
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Group gap="sm" align="flex-start" wrap="nowrap">
                    <ThemeIcon
                      size={40}
                      radius="lg"
                      variant={active ? "filled" : "light"}
                      color={active ? "teal" : "gray"}
                    >
                      <item.icon size={18} />
                    </ThemeIcon>

                    <div>
                      <Text fw={700} c="#0f172a">
                        {item.label}
                      </Text>
                      <Text size="sm" c="dimmed" mt={4}>
                        {item.description}
                      </Text>
                    </div>
                  </Group>

                  <IoArrowForwardOutline size={16} color="#64748b" />
                </Group>
              </Paper>
            );
          })}
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}
