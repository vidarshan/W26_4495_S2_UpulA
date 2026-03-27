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
  TextInput,
  Divider,
  Alert,
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

type DaySession = {
  id: string;
  appointmentId: string;
  startedAt: string;
  endedAt: string | null;
  jobTitle: string;
  clientName: string;
  minutesForDay: number;
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

function toLocalDateTimeInputValue(dateString: string | null) {
  if (!dateString) return '';
  const d = new Date(dateString);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EnterTimePage() {
  const [allPeriods, setAllPeriods] = useState<PayPeriod[]>([]);
  const [payPeriodOptions, setPayPeriodOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [payPeriodId, setPayPeriodId] = useState<string | null>(null);
  const [loadingPeriods, setLoadingPeriods] = useState(true);

  const [dayMinutes, setDayMinutes] = useState<Record<string, number>>({});
  const [daySessions, setDaySessions] = useState<Record<string, DaySession[]>>(
    {},
  );
  const [loadingEntries, setLoadingEntries] = useState(false);

  const [week, setWeek] = useState<Week>(1);
  const [openDay, setOpenDay] = useState<{ week: Week; idx: number } | null>(
    null,
  );

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editStartedAt, setEditStartedAt] = useState('');
  const [editEndedAt, setEditEndedAt] = useState('');
  const [savingSession, setSavingSession] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

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
            label: `${new Date(p.startDate).toLocaleDateString('en-GB')} to ${new Date(
              p.endDate,
            ).toLocaleDateString('en-GB')}`,
          }));

          setPayPeriodOptions(options);

          const defaultIdx = currentIndex === 0 ? 0 : 1;
          setPayPeriodId(options[defaultIdx]?.value ?? null);
        } else {
          const options = fetched.map((p) => ({
            value: p.id,
            label: `${new Date(p.startDate).toLocaleDateString('en-GB')} to ${new Date(
              p.endDate,
            ).toLocaleDateString('en-GB')}`,
          }));
          setPayPeriodOptions(options);
          setPayPeriodId(options[0]?.value ?? null);
        }
      } catch (error) {
        console.error('Failed to load periods:', error);
      } finally {
        setLoadingPeriods(false);
      }
    }

    fetchRelevantPeriods();
  }, []);

  async function handleSubmitTimesheet() {
    if (!payPeriodId) return;

    try {
      setSubmitting(true);

      const res = await fetch('/api/staff/time-sheet/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodId: payPeriodId,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error(result.error);
        alert(result.error ?? 'Failed to submit timesheet');
        return;
      }

      alert('Timesheet submitted successfully');
    } catch (error) {
      console.error(error);
      alert('Failed to submit timesheet');
    } finally {
      setSubmitting(false);
    }
  }

  async function fetchTimesheetEntries(selectedPeriodId: string | null) {
    const selected = allPeriods.find((p) => p.id === selectedPeriodId);

    if (!selected) {
      setDayMinutes({});
      setDaySessions({});
      return;
    }

    try {
      setLoadingEntries(true);

      const res = await fetch(
        `/api/staff/time-sheet?startDate=${encodeURIComponent(
          selected.startDate,
        )}&endDate=${encodeURIComponent(selected.endDate)}`,
      );

      const result = await res.json();

      if (!res.ok) {
        console.error('Failed to load timesheet entries:', result.error);
        setDayMinutes({});
        setDaySessions({});
        return;
      }

      setDayMinutes(result.dailyTotals ?? {});
      setDaySessions(result.dailySessions ?? {});
    } catch (error) {
      console.error('Failed to load timesheet entries:', error);
      setDayMinutes({});
      setDaySessions({});
    } finally {
      setLoadingEntries(false);
    }
  }

  useEffect(() => {
    if (payPeriodId && allPeriods.length > 0) {
      fetchTimesheetEntries(payPeriodId);
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
  const selectedDay = openDay ? activeDays[openDay.idx] : null;
  const selectedDayKey = selectedDay ? toDateKey(selectedDay.fullDate) : null;
  const selectedDaySessions = selectedDayKey
    ? (daySessions[selectedDayKey] ?? [])
    : [];

  function beginEdit(session: DaySession) {
    setModalError(null);
    setEditingSessionId(session.id);
    setEditStartedAt(toLocalDateTimeInputValue(session.startedAt));
    setEditEndedAt(toLocalDateTimeInputValue(session.endedAt));
  }

  function cancelEdit() {
    setEditingSessionId(null);
    setEditStartedAt('');
    setEditEndedAt('');
    setModalError(null);
  }

  async function saveSession() {
    if (!editingSessionId) return;

    try {
      setSavingSession(true);
      setModalError(null);

      const res = await fetch('/api/staff/time-sheet', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: editingSessionId,
          startedAt: new Date(editStartedAt).toISOString(),
          endedAt: editEndedAt ? new Date(editEndedAt).toISOString() : null,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setModalError(result.error ?? 'Failed to save changes');
        return;
      }

      await fetchTimesheetEntries(payPeriodId);
      cancelEdit();
    } catch (error) {
      console.error('Failed to update session:', error);
      setModalError('Failed to save changes');
    } finally {
      setSavingSession(false);
    }
  }

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
                  onClick={() => {
                    setModalError(null);
                    setOpenDay({ week, idx: i });
                    cancelEdit();
                  }}
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
                onClick={handleSubmitTimesheet}
                loading={submitting}
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
        onClose={() => {
          setOpenDay(null);
          cancelEdit();
        }}
        title="Day details"
        centered
        size="lg"
      >
        {selectedDay && (
          <Stack gap="md">
            <Text>
              <b>Date:</b> {selectedDay.fullDate.toLocaleDateString()}
            </Text>
            <Text>
              <b>Day:</b> {selectedDay.dow}
            </Text>
            <Text>
              <b>Total Hours:</b> {selectedDay.hours}
            </Text>

            <Divider />

            {modalError && (
              <Alert color="red" title="Error">
                {modalError}
              </Alert>
            )}

            {selectedDaySessions.length === 0 ? (
              <Text c="dimmed" size="sm">
                No work sessions found for this day.
              </Text>
            ) : (
              <Stack gap="md">
                {selectedDaySessions.map((session) => {
                  const isEditing = editingSessionId === session.id;

                  return (
                    <Paper key={session.id} withBorder p="md" radius="md">
                      <Stack gap="xs">
                        <Text fw={700}>{session.jobTitle}</Text>
                        <Text size="sm" c="dimmed">
                          Client: {session.clientName}
                        </Text>
                        <Text size="sm">
                          Hours counted for this day:{' '}
                          <b>{formatMinutesToHHMM(session.minutesForDay)}</b>
                        </Text>

                        {!isEditing ? (
                          <>
                            <Text size="sm">
                              Start:{' '}
                              {new Date(session.startedAt).toLocaleString()}
                            </Text>
                            <Text size="sm">
                              End:{' '}
                              {session.endedAt
                                ? new Date(session.endedAt).toLocaleString()
                                : 'Still running'}
                            </Text>

                            <Group mt="xs">
                              <Button
                                size="xs"
                                variant="light"
                                onClick={() => beginEdit(session)}
                              >
                                Edit
                              </Button>
                            </Group>
                          </>
                        ) : (
                          <>
                            <TextInput
                              label="Started At"
                              type="datetime-local"
                              value={editStartedAt}
                              onChange={(e) =>
                                setEditStartedAt(e.currentTarget.value)
                              }
                            />

                            <TextInput
                              label="Ended At"
                              type="datetime-local"
                              value={editEndedAt}
                              onChange={(e) =>
                                setEditEndedAt(e.currentTarget.value)
                              }
                              placeholder="Leave blank if still running"
                            />

                            <Group mt="xs">
                              <Button
                                size="xs"
                                color="green"
                                loading={savingSession}
                                onClick={saveSession}
                              >
                                Save
                              </Button>
                              <Button
                                size="xs"
                                variant="default"
                                onClick={cancelEdit}
                                disabled={savingSession}
                              >
                                Cancel
                              </Button>
                            </Group>
                          </>
                        )}
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}

            <Text c="dimmed" size="sm">
              These values are loaded from AppointmentWorkSession records for
              the selected pay period.
            </Text>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
