'use client';

import {
  ActionIcon,
  Box,
  Button,
  Container,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Title,
  Loader,
  Center,
} from '@mantine/core';
import { useMemo, useState, useEffect } from 'react';
import { IoClipboardOutline, IoChevronDown } from 'react-icons/io5';

type Week = 1 | 2;

type PayPeriod = {
  id: string;
  startDate: string;
  endDate: string;
};

type DayCell = {
  dow: string;
  dateLabel: string;
  fullDate: Date;
  isToday?: boolean;
  hours: string;
};

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatMinutesToHHMM(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

export default function EnterTimePage() {
  const [allPeriods, setAllPeriods] = useState<PayPeriod[]>([]);
  const [payPeriodOptions, setPayPeriodOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [payPeriodId, setPayPeriodId] = useState<string | null>(null);
  const [loadingPeriods, setLoadingPeriods] = useState(true);

  const [dayMinutes, setDayMinutes] = useState<Record<string, number>>({});
  const [loadingEntries, setLoadingEntries] = useState(false);

  const [week, setWeek] = useState<Week>(1);
  const [openDay, setOpenDay] = useState<{ week: Week; idx: number } | null>(
    null,
  );

  useEffect(() => {
    async function fetchRelevantPeriods() {
      try {
        const res = await fetch('/api/timesheet-periods');
        const fetched: PayPeriod[] = await res.json();
        setAllPeriods(fetched);

        const now = new Date();
        const currentIndex = fetched.findIndex((p) => {
          const start = new Date(p.startDate);
          const end = new Date(p.endDate);
          return now >= start && now <= end;
        });

        if (currentIndex !== -1) {
          const startIdx = Math.max(0, currentIndex - 1);
          const endIdx = Math.min(fetched.length, currentIndex + 3);
          const filtered = fetched.slice(startIdx, endIdx);

          const options = filtered.map((p) => ({
            value: p.id,
            label: `${new Date(p.startDate).toLocaleDateString('en-GB')} to ${new Date(p.endDate).toLocaleDateString('en-GB')}`,
          }));

          setPayPeriodOptions(options);

          const defaultIdx = currentIndex === 0 ? 0 : 1;
          setPayPeriodId(options[defaultIdx]?.value ?? null);
        }
      } catch (error) {
        console.error('Failed to load periods:', error);
      } finally {
        setLoadingPeriods(false);
      }
    }

    fetchRelevantPeriods();
  }, []);

  useEffect(() => {
    async function fetchTimesheetEntries() {
      const selected = allPeriods.find((p) => p.id === payPeriodId);

      if (!selected) {
        setDayMinutes({});
        return;
      }

      try {
        setLoadingEntries(true);

        const res = await fetch(
          `/api/staff/time-sheet?startDate=${encodeURIComponent(selected.startDate)}&endDate=${encodeURIComponent(selected.endDate)}`,
        );

        const result = await res.json();

        if (!res.ok) {
          console.error('Failed to load timesheet entries:', result.error);
          setDayMinutes({});
          return;
        }

        setDayMinutes(result.dailyTotals ?? {});
      } catch (error) {
        console.error('Failed to load timesheet entries:', error);
        setDayMinutes({});
      } finally {
        setLoadingEntries(false);
      }
    }

    if (payPeriodId && allPeriods.length > 0) {
      fetchTimesheetEntries();
    }
  }, [payPeriodId, allPeriods]);

  const days = useMemo(() => {
    const selected = allPeriods.find((p) => p.id === payPeriodId);
    if (!selected) return { 1: [], 2: [] as DayCell[] };

    const startDate = new Date(selected.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const generateWeek = (weekNum: number): DayCell[] => {
      const weekDays: DayCell[] = [];
      const offset = (weekNum - 1) * 7;

      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + offset + i);
        d.setHours(0, 0, 0, 0);

        const isToday = d.getTime() === today.getTime();
        const key = toDateKey(d);
        const minutes = dayMinutes[key] ?? 0;

        weekDays.push({
          dow: d.toLocaleDateString('en-US', { weekday: 'short' }),
          dateLabel: isToday
            ? 'Today'
            : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: d,
          isToday,
          hours: formatMinutesToHHMM(minutes),
        });
      }

      return weekDays;
    };

    return {
      1: generateWeek(1),
      2: generateWeek(2),
    };
  }, [payPeriodId, allPeriods, dayMinutes]);

  const activeDays = days[week];

  if (loadingPeriods) {
    return (
      <Center h="80vh">
        <Loader size="xl" color="green" />
      </Center>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="center" gap="xl">
          <Text fw={600}>Pay Period</Text>
          <Box w={420}>
            <Select
              value={payPeriodId}
              onChange={setPayPeriodId}
              data={payPeriodOptions}
              rightSection={<IoChevronDown size={18} />}
              styles={{
                input: { height: 52, fontWeight: 700, textAlign: 'center' },
              }}
            />
          </Box>
        </Group>

        <Group justify="center" gap="md">
          <Button
            size="lg"
            radius="md"
            color={week === 1 ? 'green' : 'gray'}
            onClick={() => setWeek(1)}
            styles={{ root: { width: 240, height: 56, fontWeight: 700 } }}
          >
            Week 1
          </Button>
          <Button
            size="lg"
            radius="md"
            color={week === 2 ? 'green' : 'gray'}
            onClick={() => setWeek(2)}
            styles={{ root: { width: 240, height: 56, fontWeight: 700 } }}
          >
            Week 2
          </Button>
        </Group>

        <Paper withBorder radius="md" p="xl">
          <Group justify="space-between" mb="lg">
            <Title order={3}>My hours for this week</Title>
            {loadingEntries && <Loader size="sm" color="green" />}
          </Group>

          <Box style={{ overflowX: 'auto' }}>
            <Table
              withRowBorders
              withColumnBorders={false}
              verticalSpacing="md"
              horizontalSpacing="md"
              style={{ minWidth: 860 }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th />
                  {activeDays.map((d, i) => (
                    <Table.Th key={i} style={{ textAlign: 'center' }}>
                      <Text size="sm" c="dimmed">
                        {d.dow}
                      </Text>
                      <Text fw={800} c={d.isToday ? 'blue' : undefined}>
                        {d.dateLabel}
                      </Text>
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>
                    <Text fw={700}>General</Text>
                  </Table.Td>
                  {activeDays.map((d, i) => (
                    <Table.Td key={i} style={{ textAlign: 'center' }}>
                      <Text fw={700}>{d.hours}</Text>
                    </Table.Td>
                  ))}
                </Table.Tr>

                <Table.Tr>
                  <Table.Td>
                    <Text fw={700}>Total Hours:</Text>
                  </Table.Td>
                  {activeDays.map((d, i) => (
                    <Table.Td key={i} style={{ textAlign: 'center' }}>
                      <Text fw={700}>{d.hours}</Text>
                    </Table.Td>
                  ))}
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Box>

          <Group
            justify="space-between"
            mt="lg"
            px="sm"
            style={{ minWidth: 860 }}
          >
            {activeDays.map((_, i) => (
              <Box
                key={i}
                w={100}
                style={{ display: 'flex', justifyContent: 'center' }}
              >
                <ActionIcon
                  variant="subtle"
                  size={56}
                  onClick={() => setOpenDay({ week, idx: i })}
                >
                  <IoClipboardOutline size={40} />
                </ActionIcon>
              </Box>
            ))}
          </Group>
        </Paper>

        <Group justify="flex-end" gap="lg">
          {week === 1 ? (
            <Button
              size="xl"
              radius="md"
              color="green"
              onClick={() => setWeek(2)}
              styles={{ root: { width: 260, height: 64, fontWeight: 800 } }}
            >
              Next
            </Button>
          ) : (
            <>
              <Button
                size="xl"
                radius="md"
                color="green"
                variant="filled"
                onClick={() => setWeek(1)}
                styles={{ root: { width: 260, height: 64, fontWeight: 800 } }}
              >
                Previous
              </Button>
              <Button
                size="xl"
                radius="md"
                color="dark"
                onClick={() => console.log('Submit timesheet')}
                styles={{ root: { width: 260, height: 64, fontWeight: 800 } }}
              >
                Submit
              </Button>
            </>
          )}
        </Group>
      </Stack>

      <Modal
        opened={openDay !== null}
        onClose={() => setOpenDay(null)}
        title="Day details"
        centered
      >
        {openDay && (
          <Stack gap="sm">
            <Text>
              <b>Date:</b>{' '}
              {activeDays[openDay.idx]?.fullDate.toLocaleDateString()}
            </Text>
            <Text>
              <b>Day:</b> {activeDays[openDay.idx]?.dow}
            </Text>
            <Text>
              <b>Hours:</b> {activeDays[openDay.idx]?.hours}
            </Text>
            <Text c="dimmed" size="sm">
              Loaded from assignment planned time for the selected pay period.
            </Text>
            <Button onClick={() => setOpenDay(null)}>Close</Button>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
