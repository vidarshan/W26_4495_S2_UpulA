"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import {
  IoCalendarOutline,
  IoChevronDown,
  IoClipboardOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { APP_TZ } from "@/lib/dateTime";

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
  return DateTime.fromJSDate(date, { zone: APP_TZ }).toFormat("yyyy-LL-dd");
}

function formatMinutesToHHMM(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function toLocalDateTimeInputValue(dateString: string | null) {
  if (!dateString) return "";
  const d = new Date(dateString);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EnterTimePage() {
  const isMobile = useMediaQuery("(max-width: 48em)");
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
  const [editStartedAt, setEditStartedAt] = useState("");
  const [editEndedAt, setEditEndedAt] = useState("");
  const [savingSession, setSavingSession] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchRelevantPeriods() {
      try {
        const res = await fetch("/api/timesheet-periods");
        const fetched: PayPeriod[] = await res.json();
        setAllPeriods(fetched);

        const now = DateTime.now().setZone(APP_TZ);
        const currentIndex = fetched.findIndex((p) => {
          const start = DateTime.fromISO(p.startDate, { zone: "utc" })
            .setZone(APP_TZ)
            .startOf("day");
          const end = DateTime.fromISO(p.endDate, { zone: "utc" })
            .setZone(APP_TZ)
            .endOf("day");
          return now >= start && now <= end;
        });

        if (currentIndex !== -1) {
          const startIdx = Math.max(0, currentIndex - 1);
          const endIdx = Math.min(fetched.length, currentIndex + 3);
          const filtered = fetched.slice(startIdx, endIdx);

          const options = filtered.map((p) => ({
            value: p.id,
            label: `${DateTime.fromISO(p.startDate, { zone: "utc" })
              .setZone(APP_TZ)
              .toFormat("dd/LL/yyyy")} to ${DateTime.fromISO(p.endDate, {
              zone: "utc",
            })
              .setZone(APP_TZ)
              .toFormat("dd/LL/yyyy")}`,
          }));

          setPayPeriodOptions(options);

          const defaultIdx = currentIndex === 0 ? 0 : 1;
          setPayPeriodId(options[defaultIdx]?.value ?? null);
        } else {
          const options = fetched.map((p) => ({
            value: p.id,
            label: `${DateTime.fromISO(p.startDate, { zone: "utc" })
              .setZone(APP_TZ)
              .toFormat("dd/LL/yyyy")} to ${DateTime.fromISO(p.endDate, {
              zone: "utc",
            })
              .setZone(APP_TZ)
              .toFormat("dd/LL/yyyy")}`,
          }));
          setPayPeriodOptions(options);
          setPayPeriodId(options[0]?.value ?? null);
        }
      } catch (error) {
        console.error("Failed to load periods:", error);
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

      const res = await fetch("/api/staff/time-sheet/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          periodId: payPeriodId,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.error ?? "Failed to submit timesheet");
        return;
      }

      alert("Timesheet submitted successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to submit timesheet");
    } finally {
      setSubmitting(false);
    }
  }

  const fetchTimesheetEntries = useCallback(async (selectedPeriodId: string | null) => {
    const selected = allPeriods.find((p) => p.id === selectedPeriodId);

    if (!selected) {
      setDayMinutes({});
      setDaySessions({});
      return;
    }

    try {
      setLoadingEntries(true);

      const startDateParam = DateTime.fromISO(selected.startDate, {
        zone: "utc",
      })
        .setZone(APP_TZ)
        .toFormat("yyyy-LL-dd");
      const endDateParam = DateTime.fromISO(selected.endDate, {
        zone: "utc",
      })
        .setZone(APP_TZ)
        .toFormat("yyyy-LL-dd");

      const res = await fetch(
        `/api/staff/time-sheet?startDate=${encodeURIComponent(
          startDateParam,
        )}&endDate=${encodeURIComponent(endDateParam)}`,
      );

      const result = await res.json();

      if (!res.ok) {
        console.error("Failed to load timesheet entries:", result.error);
        setDayMinutes({});
        setDaySessions({});
        return;
      }

      setDayMinutes(result.dailyTotals ?? {});
      setDaySessions(result.dailySessions ?? {});
    } catch (error) {
      console.error("Failed to load timesheet entries:", error);
      setDayMinutes({});
      setDaySessions({});
    } finally {
      setLoadingEntries(false);
    }
  }, [allPeriods]);

  useEffect(() => {
    if (payPeriodId && allPeriods.length > 0) {
      fetchTimesheetEntries(payPeriodId);
    }
  }, [payPeriodId, allPeriods, fetchTimesheetEntries]);

  const days = useMemo(() => {
    const selected = allPeriods.find((p) => p.id === payPeriodId);
    if (!selected) return { 1: [], 2: [] as DayCell[] };

    const startDate = DateTime.fromISO(selected.startDate, { zone: "utc" })
      .setZone(APP_TZ)
      .startOf("day");
    const todayKey = DateTime.now().setZone(APP_TZ).toFormat("yyyy-LL-dd");

    const generateWeek = (weekNum: number): DayCell[] => {
      const weekDays: DayCell[] = [];
      const offset = (weekNum - 1) * 7;

      for (let i = 0; i < 7; i++) {
        const d = startDate.plus({ days: offset + i });
        const key = d.toFormat("yyyy-LL-dd");
        const minutes = dayMinutes[key] ?? 0;
        const isToday = key === todayKey;

        weekDays.push({
          dow: d.toFormat("ccc"),
          dateLabel: isToday
            ? "Today"
            : d.toFormat("LLL d"),
          fullDate: d.toJSDate(),
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

  const totalWeekMinutes = useMemo(
    () =>
      activeDays.reduce((sum, day) => {
        const [hours, minutes] = day.hours.split(":").map(Number);
        return sum + hours * 60 + minutes;
      }, 0),
    [activeDays],
  );

  function beginEdit(session: DaySession) {
    setModalError(null);
    setEditingSessionId(session.id);
    setEditStartedAt(toLocalDateTimeInputValue(session.startedAt));
    setEditEndedAt(toLocalDateTimeInputValue(session.endedAt));
  }

  function cancelEdit() {
    setEditingSessionId(null);
    setEditStartedAt("");
    setEditEndedAt("");
    setModalError(null);
  }

  async function saveSession() {
    if (!editingSessionId) return;

    try {
      setSavingSession(true);
      setModalError(null);

      const res = await fetch("/api/staff/time-sheet", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: editingSessionId,
          startedAt: new Date(editStartedAt).toISOString(),
          endedAt: editEndedAt ? new Date(editEndedAt).toISOString() : null,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setModalError(result.error ?? "Failed to save changes");
        return;
      }

      await fetchTimesheetEntries(payPeriodId);
      cancelEdit();
    } catch (error) {
      console.error("Failed to update session:", error);
      setModalError("Failed to save changes");
    } finally {
      setSavingSession(false);
    }
  }

  if (loadingPeriods) {
    return (
      <Container p={0} className="staff-app-page">
        <Center mih="70vh">
          <Loader size="lg" color="lime" />
        </Center>
      </Container>
    );
  }

  return (
    <Container p={0} className="staff-app-page">
      <Stack gap="md" p="md">
        <Card
          radius="lg"
          withBorder
          p="lg"
          className="staff-app-surface staff-app-surface--hero"
        >
          <Stack gap="xs">
            <Title order={3}>Enter Time</Title>
            <Text size="sm" c="dimmed">
              Review daily work sessions, verify totals, and submit your timesheet.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mt="md">
            <SummaryStat label="Current Week" value={`Week ${week}`} icon={IoCalendarOutline} />
            <SummaryStat
              label="Week Total"
              value={formatMinutesToHHMM(totalWeekMinutes)}
              icon={IoTimeOutline}
            />
            <SummaryStat
              label="Sessions"
              value={String(activeDays.reduce((sum, d) => sum + (daySessions[toDateKey(d.fullDate)]?.length ?? 0), 0))}
              icon={IoClipboardOutline}
            />
          </SimpleGrid>
        </Card>

        <Card radius="lg" withBorder p="lg" className="staff-app-surface">
          <Stack gap="md">
            <Group justify="space-between" align="end" wrap="wrap">
              <Box style={{ flex: 1, minWidth: isMobile ? "100%" : 260, maxWidth: 420 }}>
                <Text size="sm" fw={700} mb={6}>
                  Pay Period
                </Text>
                <Select
                  value={payPeriodId}
                  onChange={setPayPeriodId}
                  data={payPeriodOptions}
                  rightSection={<IoChevronDown size={18} />}
                  placeholder="Select pay period"
                  w="100%"
                />
              </Box>

              <SegmentedControl
                fullWidth={isMobile}
                value={String(week)}
                onChange={(value) => setWeek(Number(value) as Week)}
                color="lime"
                radius="xl"
                data={[
                  { label: "Week 1", value: "1" },
                  { label: "Week 2", value: "2" },
                ]}
              />
            </Group>

            <Divider />

            {loadingEntries ? (
              <Group gap="xs">
                <Loader size="sm" />
                <Text size="sm" c="dimmed">
                  Refreshing timesheet entries...
                </Text>
              </Group>
            ) : null}

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
              {activeDays.map((day, index) => (
                <Paper key={index} withBorder radius="lg" p="md">
                  <Stack gap="xs">
                    <Group justify="space-between" align="start">
                      <Box>
                        <Text size="xs" fw={700} c="dimmed">
                          {day.dow}
                        </Text>
                        <Text fw={800} c={day.isToday ? "lime.8" : undefined}>
                          {day.dateLabel}
                        </Text>
                      </Box>
                      <ThemeIcon radius="lg" variant="light" color="lime">
                        <IoClipboardOutline size={16} />
                      </ThemeIcon>
                    </Group>

                    <Text size="xs" c="dimmed">
                      Logged hours
                    </Text>
                    <Text size="xl" fw={800}>
                      {day.hours}
                    </Text>

                    <Button
                      variant="light"
                      color="lime"
                      radius="md"
                      onClick={() => {
                        setModalError(null);
                        setOpenDay({ week, idx: index });
                        cancelEdit();
                      }}
                    >
                      View details
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Card>

        <Card radius="lg" withBorder p="lg" className="staff-app-surface">
          <Stack gap="sm">
            <Text fw={700}>Week summary</Text>
            {isMobile ? (
              <Stack gap="xs">
                {activeDays.map((day) => (
                  <Paper key={toDateKey(day.fullDate)} withBorder radius="lg" p="sm">
                    <Group justify="space-between" wrap="nowrap">
                      <Box>
                        <Text fw={700}>{day.dow}</Text>
                        <Text size="sm" c="dimmed">
                          {day.dateLabel}
                        </Text>
                      </Box>
                      <Text fw={800}>{day.hours}</Text>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Day</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th ta="right">Hours</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {activeDays.map((day) => (
                    <Table.Tr key={toDateKey(day.fullDate)}>
                      <Table.Td>{day.dow}</Table.Td>
                      <Table.Td>{day.dateLabel}</Table.Td>
                      <Table.Td ta="right">
                        <Text fw={700}>{day.hours}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Card>

        <Group justify="flex-end" grow={isMobile}>
          {week === 1 ? (
            <Button radius="md" color="lime" onClick={() => setWeek(2)}>
              Next Week
            </Button>
          ) : (
            <>
              <Button radius="md" variant="subtle" color="gray" onClick={() => setWeek(1)}>
                Previous Week
              </Button>
              <Button
                radius="md"
                color="lime"
                onClick={handleSubmitTimesheet}
                loading={submitting}
              >
                Submit Timesheet
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
            <Paper withBorder radius="lg" p="md">
              <Group justify="space-between" align="start">
                <Box>
                  <Text fw={700}>{selectedDay.fullDate.toLocaleDateString()}</Text>
                  <Text size="sm" c="dimmed">
                    {selectedDay.dow}
                  </Text>
                </Box>
                <Text fw={800}>{selectedDay.hours}</Text>
              </Group>
            </Paper>

            {modalError ? (
              <Alert color="red" title="Error">
                {modalError}
              </Alert>
            ) : null}

            {selectedDaySessions.length === 0 ? (
              <Text c="dimmed" size="sm">
                No work sessions found for this day.
              </Text>
            ) : (
              <Stack gap="md">
                {selectedDaySessions.map((session) => {
                  const isEditing = editingSessionId === session.id;

                  return (
                    <Paper key={session.id} withBorder p="md" radius="lg">
                      <Stack gap="xs">
                        <Text fw={700}>{session.jobTitle}</Text>
                        <Text size="sm" c="dimmed">
                          Client: {session.clientName}
                        </Text>
                        <Text size="sm">
                          Hours counted for this day:{" "}
                          <b>{formatMinutesToHHMM(session.minutesForDay)}</b>
                        </Text>

                        {!isEditing ? (
                          <>
                            <Text size="sm">
                              Start: {new Date(session.startedAt).toLocaleString()}
                            </Text>
                            <Text size="sm">
                              End:{" "}
                              {session.endedAt
                                ? new Date(session.endedAt).toLocaleString()
                                : "Still running"}
                            </Text>

                            <Group mt="xs">
                              <Button size="xs" variant="light" color="lime" onClick={() => beginEdit(session)}>
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
                              onChange={(e) => setEditStartedAt(e.currentTarget.value)}
                            />

                            <TextInput
                              label="Ended At"
                              type="datetime-local"
                              value={editEndedAt}
                              onChange={(e) => setEditEndedAt(e.currentTarget.value)}
                              placeholder="Leave blank if still running"
                            />

                            <Group mt="xs">
                              <Button
                                size="xs"
                                color="lime"
                                loading={savingSession}
                                onClick={saveSession}
                              >
                                Save
                              </Button>
                              <Button
                                size="xs"
                                variant="subtle"
                                color="gray"
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
          </Stack>
        )}
      </Modal>
    </Container>
  );
}

function SummaryStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof IoCalendarOutline;
}) {
  return (
    <Paper withBorder radius="lg" p="md">
      <Group justify="space-between" align="start" wrap="nowrap">
        <Box>
          <Text size="xs" fw={700} c="dimmed">
            {label}
          </Text>
          <Text size="xl" fw={800} mt={6}>
            {value}
          </Text>
        </Box>
        <ThemeIcon radius="lg" variant="light" color="lime">
          <Icon size={16} />
        </ThemeIcon>
      </Group>
    </Paper>
  );
}
