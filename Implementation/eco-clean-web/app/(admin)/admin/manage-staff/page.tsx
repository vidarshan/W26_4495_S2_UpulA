'use client';

import {
  Box,
  Button,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  IoArrowForwardOutline,
  IoCalendarClearOutline,
  IoCashOutline,
  IoPeopleOutline,
  IoTimeOutline,
} from 'react-icons/io5';
import AdminPageFrame from '@/app/components/admin/AdminPageFrame';
import AdminStaffWorkspaceNav from '@/app/components/admin/AdminStaffWorkspaceNav';

type StaffSectionKey = 'leave' | 'payroll' | 'time';

type StaffSection = {
  key: StaffSectionKey;
  label: string;
  title: string;
  description: string;
  icon: typeof IoPeopleOutline;
  links: { label: string; href: string; description: string }[];
};

const SECTIONS: StaffSection[] = [
  {
    key: 'leave',
    label: 'Leave',
    title: 'Leave management',
    description:
      'Review requests, monitor balances, and move approvals through the same cleaner admin layout used across the newer workspace.',
    icon: IoCalendarClearOutline,
    links: [
      {
        label: 'Pending approvals',
        href: '/admin/manage-staff/leave-approval',
        description: 'Review and decide current leave requests.',
      },
    ],
  },
  {
    key: 'payroll',
    label: 'Payroll',
    title: 'Payroll operations',
    description:
      'Move between payroll generation, period review, and statement workflows without the older accordion-heavy UI.',
    icon: IoCashOutline,
    links: [
      {
        label: 'Payroll admin',
        href: '/admin/pay-periods',
        description: 'Generate statements and adjust payroll inputs.',
      },
      {
        label: 'Payroll periods',
        href: '/admin/manage-staff/payroll',
        description: 'Review staff payroll period records.',
      },
    ],
  },
  {
    key: 'time',
    label: 'Timesheets',
    title: 'Time and attendance',
    description:
      'Compare planned time against submitted entries and approve staff timesheets from a more structured overview.',
    icon: IoTimeOutline,
    links: [
      {
        label: 'Timesheet overview',
        href: '/admin/timesheets',
        description: 'Inspect and approve submitted timesheets.',
      },
    ],
  },
];

export default function ManageStaffPage() {
  const [activeSection, setActiveSection] = useState<StaffSectionKey>('leave');

  const selectedSection = useMemo(
    () => SECTIONS.find((section) => section.key === activeSection) ?? SECTIONS[0],
    [activeSection],
  );

  return (
    <AdminPageFrame
      eyebrow="Admin tools"
      title="Manage Staff"
      description="Bring leave, payroll, and timesheet workflows into the same modern admin workspace used by the dashboard and newer app screens."
      stats={[
        {
          label: 'Workstreams',
          value: String(SECTIONS.length),
          icon: IoPeopleOutline,
        },
        {
          label: 'Active section',
          value: selectedSection.label,
          icon: selectedSection.icon,
        },
        {
          label: 'Quick actions',
          value: String(selectedSection.links.length),
          icon: IoArrowForwardOutline,
        },
      ]}
    >
      <Stack gap="lg">
        <AdminStaffWorkspaceNav />

        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
          <Paper
            withBorder
            radius="lg"
            p="md"
            className="admin-page-frame__stat"
          >
            <Stack gap="xs">
              <Text size="sm" fw={700} c="#0f172a">
                Staff functions
              </Text>
              <Text size="sm" c="dimmed">
                Pick a workspace to reveal focused actions and context.
              </Text>
            </Stack>

            <Stack gap="sm" mt="lg">
              {SECTIONS.map((section) => {
                const active = section.key === activeSection;

                return (
                  <Paper
                    key={section.key}
                    withBorder
                    radius="lg"
                    p="md"
                    className="quick-action-card"
                    onClick={() => setActiveSection(section.key)}
                    style={{
                      cursor: 'pointer',
                      borderColor: active ? 'rgba(14, 116, 144, 0.32)' : undefined,
                      background: active
                        ? 'linear-gradient(180deg, rgba(240, 249, 255, 0.96), rgba(236, 253, 245, 0.92))'
                        : undefined,
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap">
                        <ThemeIcon radius="lg" size={40} variant="light" color="teal">
                          <section.icon size={18} />
                        </ThemeIcon>
                        <Box>
                          <Text fw={700} c="#0f172a">
                            {section.title}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {section.links.length} action
                            {section.links.length === 1 ? '' : 's'}
                          </Text>
                        </Box>
                      </Group>
                      <IoArrowForwardOutline size={18} color="#0f172a" />
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          </Paper>

          <Paper
            withBorder
            radius="lg"
            p="lg"
            className="admin-page-frame__surface"
            style={{ gridColumn: 'span 2' }}
          >
            <Stack gap="lg">
              <Group justify="space-between" align="flex-start" gap="md">
                <Box maw={680}>
                  <Group gap="sm" mb={10}>
                    <ThemeIcon radius="lg" size={42} variant="light" color="teal">
                      <selectedSection.icon size={20} />
                    </ThemeIcon>
                    <Text size="xl" fw={700} c="#0f172a">
                      {selectedSection.title}
                    </Text>
                  </Group>
                  <Text c="#475569">{selectedSection.description}</Text>
                </Box>
              </Group>

              <Divider />

              <SimpleGrid cols={{ base: 1, md: selectedSection.links.length > 1 ? 2 : 1 }} spacing="md">
                {selectedSection.links.map((link) => (
                  <Paper
                    key={link.href}
                    withBorder
                    radius="lg"
                    p="lg"
                    className="quick-action-card"
                  >
                    <Stack gap="sm" h="100%" justify="space-between">
                      <div>
                        <Text fw={700} c="#0f172a">
                          {link.label}
                        </Text>
                        <Text size="sm" c="dimmed" mt={6}>
                          {link.description}
                        </Text>
                      </div>

                      <Button
                        component={Link}
                        href={link.href}
                        variant="light"
                        color="teal"
                        rightSection={<IoArrowForwardOutline size={16} />}
                      >
                        Open workspace
                      </Button>
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>
            </Stack>
          </Paper>
        </SimpleGrid>
      </Stack>
    </AdminPageFrame>
  );
}
