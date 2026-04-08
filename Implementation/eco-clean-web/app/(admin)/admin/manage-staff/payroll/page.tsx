'use client';

import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { generateBiweeklyPeriods } from '@/lib/actions/periods';
import {
  IoCalendarOutline,
  IoCheckmarkCircleOutline,
  IoLockClosedOutline,
  IoRefreshOutline,
} from 'react-icons/io5';
import { useRouter } from 'next/navigation';
import AdminPageFrame from '@/app/components/admin/AdminPageFrame';

type TimesheetPeriod = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ManagePayPeriodsPage() {
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<TimesheetPeriod[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchPeriods = async () => {
    setFetching(true);
    setError(null);

    try {
      const res = await fetch('/api/timesheet-periods', { cache: 'no-store' });

      if (!res.ok) {
        throw new Error('Failed to fetch payroll periods.');
      }

      const data = (await res.json()) as TimesheetPeriod[];
      setPeriods(data);
    } catch (err) {
      console.error('Failed to fetch periods:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payroll periods.');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    void fetchPeriods();
  }, []);

  const handleGenerate = async () => {
    const targetYear = 2026;

    if (!confirm(`This will generate all biweekly periods for ${targetYear}. Continue?`)) {
      return;
    }

    setLoading(true);
    const result = await generateBiweeklyPeriods(targetYear);
    setLoading(false);

    if (result.success) {
      alert(`Success. Created ${result.count} pay periods for ${targetYear}.`);
      await fetchPeriods();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const summary = useMemo(() => {
    const locked = periods.filter((period) => period.status === 'LOCKED').length;

    return {
      total: periods.length,
      locked,
      open: periods.length - locked,
    };
  }, [periods]);

  return (
    <AdminPageFrame
      eyebrow="Payroll setup"
      title="Payroll Periods"
      description="Generate payroll periods once, review what already exists, and jump into payroll processing from a clearer admin layout."
      stats={[
        { label: 'Total periods', value: String(summary.total), icon: IoCalendarOutline },
        { label: 'Locked', value: String(summary.locked), icon: IoLockClosedOutline },
        { label: 'Open', value: String(summary.open), icon: IoCheckmarkCircleOutline },
      ]}
    >
      <Stack gap="lg">
        {error ? (
          <Alert color="red" title="Unable to load payroll periods">
            {error}
          </Alert>
        ) : null}

        <SimpleGrid cols={{ base: 1, lg: 12 }} spacing="lg">
          <Box style={{ gridColumn: 'span 4' }}>
            <Stack gap="md">
              <Badge color="lime" variant="light" radius="xl">
                Period generator
              </Badge>

              <div>
                <Text fw={700} c="#0f172a">
                  Generate the annual period set
                </Text>
                <Text size="sm" c="#475569" mt={6}>
                  This creates the biweekly periods used by timesheets and payroll. Run it only when the year has not been generated yet.
                </Text>
              </div>

              <div>
                <Text size="xs" fw={700} c="#64748b">
                  Current setup target
                </Text>
                <Text fw={700} c="#0f172a" mt={6}>
                  Payroll year 2026
                </Text>
              </div>

              <Button
                leftSection={<IoCalendarOutline size={18} />}
                color="lime"
                loading={loading}
                onClick={handleGenerate}
              >
                Generate 2026 periods
              </Button>
            </Stack>
          </Box>

          <Box style={{ gridColumn: 'span 8' }}>
            <Stack gap="lg">
              <Group justify="space-between" align="flex-start" gap="md">
                <div>
                  <Text fw={700} c="#0f172a">
                    Existing payroll periods
                  </Text>
                  <Text size="sm" c="#475569" mt={6}>
                    Review the period list here, then open the payroll admin screen when you are ready to generate statements.
                  </Text>
                </div>

                <Button
                  variant="light"
                  color="lime"
                  leftSection={<IoRefreshOutline size={16} />}
                  onClick={() => void fetchPeriods()}
                >
                  Refresh
                </Button>
              </Group>

              {fetching ? (
                <Center py="xl">
                  <Loader color="lime" />
                </Center>
              ) : (
                <Table.ScrollContainer minWidth={760}>
                  <Table withTableBorder striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Start date</Table.Th>
                        <Table.Th>End date</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th ta="right">Action</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {periods.length ? (
                        periods.map((period) => (
                          <Table.Tr key={period.id}>
                            <Table.Td>{formatDate(period.startDate)}</Table.Td>
                            <Table.Td>{formatDate(period.endDate)}</Table.Td>
                            <Table.Td>
                              <Badge
                                color={period.status === 'LOCKED' ? 'red' : 'lime'}
                                variant="light"
                              >
                                {period.status}
                              </Badge>
                            </Table.Td>
                            <Table.Td ta="right">
                              <Button
                                variant="light"
                                color="lime"
                                size="xs"
                                onClick={() => router.push('/admin/pay-periods')}
                              >
                                Open payroll admin
                              </Button>
                            </Table.Td>
                          </Table.Tr>
                        ))
                      ) : (
                        <Table.Tr>
                          <Table.Td colSpan={4} ta="center" py="xl">
                            <Text c="dimmed">No periods generated yet.</Text>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Stack>
          </Box>
        </SimpleGrid>
      </Stack>
    </AdminPageFrame>
  );
}
