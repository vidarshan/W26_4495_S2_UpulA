'use client';

import {
  Container,
  Title,
  Table,
  Button,
  Group,
  Text,
  Paper,
  Box,
  Stack,
  Badge,
  Loader,
  Center,
  Divider,
  Card
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { generateBiweeklyPeriods } from '@/lib/actions/periods';
import { IoCalendarOutline, IoTimeOutline } from 'react-icons/io5';
import { useRouter } from 'next/navigation';

export default function ManagePayPeriodsPage() {
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const router = useRouter();

  // 1. Fetch existing periods to display in the table
  const fetchPeriods = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/timesheet-periods'); // Ensure this GET route exists
      const data = await res.json();
      setPeriods(data);
    } catch (error) {
      console.error("Failed to fetch periods:", error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  // 2. The Generation Logic
  const handleGenerate = async () => {
    const targetYear = 2026; // Set to 2026 as per your requirement

    if (!confirm(`This will generate all biweekly periods for ${targetYear}. This can only be done once. Continue?`)) return;

    setLoading(true);
    const result = await generateBiweeklyPeriods(targetYear);
    setLoading(false);

    if (result.success) {
      alert(`Success! Created ${result.count} pay periods for ${targetYear}.`);
      fetchPeriods(); // Refresh the list
    } else {
      alert("Error: " + result.error);
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Title order={2}>Manage Pay Periods</Title>

        {/* PERIOD GENERATOR CARD */}
        <Paper withBorder p="xl" radius="md" bg="gray.0">
          <Group justify="space-between">
            <Box>
              <Text fw={700} size="lg">Batch Generate 2027</Text>
              <Text size="sm" c="dimmed">
                Creates biweekly periods starting Jan 1st, ending Dec 31st for the year 2027.
              </Text>
            </Box>
            <Button
              leftSection={<IoCalendarOutline size={20} />}
              size="md"
              color="blue"
              loading={loading}
              onClick={handleGenerate}
            >
              Generate 2026 Periods
            </Button>
          </Group>
        </Paper>

        <Divider label="Existing Pay Periods" labelPosition="center" />

        {/* LIST OF PERIODS */}
        <Card withBorder radius="md">
          {fetching ? (
            <Center py="xl"><Loader /></Center>
          ) : (
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr bg="gray.1">
                  <Table.Th>Start Date</Table.Th>
                  <Table.Th>End Date</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th ta="right">Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {periods.length > 0 ? (
                  periods.map((p) => (
                    <Table.Tr key={p.id}>
                      <Table.Td>{new Date(p.startDate).toLocaleDateString()}</Table.Td>
                      <Table.Td>{new Date(p.endDate).toLocaleDateString()}</Table.Td>
                      <Table.Td>
                        <Badge color={p.status === 'LOCKED' ? 'red' : 'green'} variant="light">
                          {p.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Button variant="subtle" size="xs" onClick={()=> router.push('/admin/pay-periods')}>Edit</Button>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={4} ta="center" py="xl">
                      <Text c="dimmed">No periods generated yet. Use the generator above.</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
