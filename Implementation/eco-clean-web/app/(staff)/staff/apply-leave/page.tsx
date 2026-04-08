"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  SegmentedControl,
} from "@mantine/core";
import {
  DateInput,
  DatePicker,
  DatePickerInput,
  TimeInput,
} from "@mantine/dates";
import { useMediaQuery } from "@mantine/hooks";
import { useSession } from "next-auth/react";
import { IoCalendarOutline, IoDocumentTextOutline } from "react-icons/io5";
import {
  APP_TZ,
  addAppDays,
  appDateKeyToDate,
  appNowDate,
  dateKeyAndHHmmToIso,
  formatAppDate,
  formatAppTime,
  toAppDateKey,
} from "@/lib/dateTime";

type Mode = "balances" | "request";
type Balance = { policy: string; hours: number };

type LeaveRecord = {
  id: string;
  type: string;
  startAt: string;
  endAt: string;
  reason?: string | null;
};

type LeaveReason = "PAID_SICK" | "UNPAID_SICK" | "PERSONAL" | "VACATION";
type LeaveDuration = "FULL_DAY" | "HALF_DAY";

type LeaveRequestCardProps = {
  selectedDate: string | null;
  setSelectedDate: (value: string | null) => void;
  leaveType: LeaveDuration | null;
  setLeaveType: (value: LeaveDuration | null) => void;
  reason: LeaveReason | null;
  setReason: (value: LeaveReason | null) => void;
  startTime: string;
  setStartTime: (value: string) => void;
  endTime: string;
  setEndTime: (value: string) => void;
  comments: string;
  setComments: (value: string) => void;
  hoursScheduled: number;
  hoursAvailable: number;
  onPrevious: () => void;
  onSubmit: () => void;
  submitting: boolean;
  isMobile: boolean;
};

const MIN_LEAVE_REQUEST_DATE = addAppDays(appNowDate(), 14);

function formatLeaveType(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getLeaveAccent(type: string) {
  if (type === "VACATION") return "blue";
  if (type.includes("SICK")) return "orange";
  return "lime";
}

function BoxDot({ visible }: { visible: boolean }) {
  if (!visible) return <Box h={6} />;

  return (
    <Box
      w={6}
      h={6}
      style={{
        borderRadius: "999px",
        background: "var(--mantine-color-lime-6)",
      }}
    />
  );
}

export default function ApplyLeavePage() {
  const isMobile = useMediaQuery("(max-width: 48em)", false, {
    getInitialValueInEffect: true,
  });
  const [mode, setMode] = useState<Mode>("balances");
  const [selectedDate, setSelectedDate] = useState<string | null>(
    toAppDateKey(new Date()),
  );

  const [leaveType, setLeaveType] = useState<LeaveDuration | null>("FULL_DAY");
  const [reason, setReason] = useState<LeaveReason | null>("UNPAID_SICK");
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [comments, setComments] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [leaveData, setLeaveData] = useState<LeaveRecord[]>([]);
  const [summary, setSummary] = useState({
    vacationRemaining: 0,
    sickUsed: 0,
  });

  const { data: session, status } = useSession();

  const staffId = session?.user?.id;

  useEffect(() => {
    if (!staffId) return;

    async function fetchSummary() {
      const res = await fetch(`/api/staff/${staffId}/leave/leave-summary`);
      const data = await res.json();
      setSummary(data);
    }

    fetchSummary();
  }, [staffId]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const leaveRes = await fetch(`/api/staff/${staffId}/leave`);
        if (!leaveRes.ok) throw new Error("Could not fetch leave records");
        const data = await leaveRes.json();
        setLeaveData(data);
      } catch {
        setErrorMessage("Failed to load records from the server.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [staffId, successMessage]);

  const vacationBalance = useMemo(() => {
    const startingEntitlement = 80;

    const hoursUsed = leaveData
      .filter((l) => l.type === "VACATION")
      .reduce((acc, curr) => {
        const start = new Date(curr.startAt);
        const end = new Date(curr.endAt);

        const days =
          Math.ceil(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
          ) || 1;

        return acc + days * 8;
      }, 0);

    return startingEntitlement - hoursUsed;
  }, [leaveData]);

  const sickHoursUsed = useMemo(() => {
    return leaveData
      .filter((l) => l.type.includes("SICK"))
      .reduce((acc, curr) => {
        const start = new Date(curr.startAt);
        const end = new Date(curr.endAt);

        const days =
          Math.ceil(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
          ) || 1;
        return acc + days * 8;
      }, 0);
  }, [leaveData]);

  const leaveMarkers = useMemo(
    () => new Set(leaveData.map((record) => toAppDateKey(record.startAt))),
    [leaveData],
  );

  const sortedLeaveData = useMemo(
    () =>
      [...leaveData].sort(
        (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
      ),
    [leaveData],
  );

  const hoursScheduled = useMemo(() => {
    return leaveType === "FULL_DAY" ? 8 : 3.5;
  }, [leaveType]);

  const calendarEvents = useMemo(() => {
    return leaveData.map((l) => ({
      title: l.type.replaceAll("_", " "),
      start: l.startAt,
      end: l.endAt,
      color: l.type === "VACATION" ? "#228be6" : "#fab005",
    }));
  }, [leaveData]);

  const onDateClick = (arg: DateClickArg) => {
    setSelectedDate(arg.dateStr);
    setMode("request");
  };

  function combineDateAndTime(date: string, time: string) {
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  }

  async function handleSubmitLeave() {
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!selectedDate || !reason) {
        throw new Error("Please select a date and reason.");
      }

      const startAt = dateKeyAndHHmmToIso(selectedDate, startTime);
      const endAt = dateKeyAndHHmmToIso(selectedDate, endTime);
      const startAtDt = DateTime.fromISO(startAt, { zone: "utc" });
      const endAtDt = DateTime.fromISO(endAt, { zone: "utc" });

      if (endAtDt <= startAtDt) {
        throw new Error("End time must be after start time.");
      }

      const response = await fetch(`/api/staff/${staffId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reason,
          startAt,
          endAt,
          reason: comments || reason,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit request.");
      }

      setSuccessMessage("Leave request submitted successfully.");
      setMode("balances");
      setComments("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <Container size="sm" py="xl">
        <Stack align="center" py="xl">
          <Loader size="lg" />
          <Text c="dimmed">Loading your profile...</Text>
        </Stack>
      </Container>
    );
  }

  if (!staffId) {
    return (
      <Container size="sm" py="xl">
        <Alert color="red">No user found.</Alert>
      </Container>
    );
  }

  if (loading && leaveData.length === 0) {
    return (
      <Container size="sm" py="xl">
        <Stack align="center" py="xl">
          <Loader size="lg" />
          <Text c="dimmed">Loading your leave data...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        <Stack gap={4}>
          <Title order={2}>Your Schedule</Title>
          <Text c="dimmed" size="sm">
            View time off, check balances, and submit leave requests.
          </Text>
        </Stack>

        {(errorMessage || successMessage) && (
          <Stack gap="xs">
            {errorMessage && <Alert color="red">{errorMessage}</Alert>}
            {successMessage && <Alert color="green">{successMessage}</Alert>}
          </Stack>
        )}

        {isMobile && (
          <SegmentedControl
            fullWidth
            radius="lg"
            color="lime"
            value={mode}
            onChange={(value) => setMode(value as Mode)}
            data={[
              { label: "Balances", value: "balances" },
              { label: "Request", value: "request" },
            ]}
          />
        )}

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" verticalSpacing="md">
          <Card withBorder radius="lg" p={{ base: "sm", sm: "md" }}>
            <Stack gap="sm">
              <Group justify="space-between" wrap="wrap">
                <Text fw={700}>Calendar</Text>
                <Text size="sm" c="dimmed">
                  Tap a date to request leave
                </Text>
              </Group>

              <Paper withBorder radius="lg" p="xs">
                <DatePicker
                  value={selectedDate ? appDateKeyToDate(selectedDate) : null}
                  onChange={(value) =>
                    setSelectedDate(value ? toAppDateKey(value) : null)
                  }
                  minDate={addAppDays(appNowDate(), 14)}
                  size="sm"
                  styles={{
                    calendarHeader: { marginBottom: 8 },
                    monthCell: { padding: 2 },
                  }}
                  renderDay={(date) => {
                    const dateKey = toAppDateKey(date);
                    const hasLeave = leaveMarkers.has(dateKey);
                    const dayNumber = appDateKeyToDate(dateKey).getDate();

                    return (
                      <Stack
                        align="center"
                        justify="center"
                        gap={3}
                        style={{ minHeight: 30 }}
                      >
                        <Text size="sm" lh={1}>
                          {dayNumber}
                        </Text>
                        <BoxDot visible={hasLeave} />
                      </Stack>
                    );
                  }}
                />
              </Paper>
            </Stack>
          </Card>

          <Stack gap="md">
            {mode === "balances" ? (
              <Card withBorder radius="lg" p="lg">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text fw={800}>Time Off Balances</Text>
                    <Button size="sm" onClick={() => setMode("request")}>
                      Request time off
                    </Button>
                  </Group>

                  <Divider />

                  <DateInput
                    label="Date"
                    value={selectedDate ? appDateKeyToDate(selectedDate) : null}
                    onChange={(value) =>
                      setSelectedDate(value ? toAppDateKey(value) : null)
                    }
                    minDate={addAppDays(appNowDate(), 14)}
                  />

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <Card withBorder p="md">
                      <Text size="sm" c="dimmed">
                        Vacation remaining
                      </Text>
                      <Text fw={800} size="lg">
                        {summary.vacationRemaining.toFixed(1)} hrs
                      </Text>
                    </Card>

                    <Card withBorder p="md">
                      <Text size="sm" c="dimmed">
                        Sick used
                      </Text>
                      <Text fw={800} size="lg">
                        {summary.sickUsed.toFixed(1)} hrs
                      </Text>
                    </Card>
                  </SimpleGrid>
                </Stack>
              </Card>
            ) : (
              <LeaveRequestCard
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                leaveType={leaveType}
                setLeaveType={setLeaveType}
                reason={reason}
                setReason={setReason}
                startTime={startTime}
                setStartTime={setStartTime}
                endTime={endTime}
                setEndTime={setEndTime}
                comments={comments}
                setComments={setComments}
                hoursScheduled={hoursScheduled}
                hoursAvailable={
                  reason === "VACATION" ? summary.vacationRemaining : 40
                }
                onPrevious={() => setMode("balances")}
                onSubmit={handleSubmitLeave}
                submitting={submitting}
                isMobile={!!isMobile}
              />
            )}

            <Card withBorder radius="lg" p="lg" className="staff-app-surface">
              <Stack gap="sm">
                <Group justify="space-between" wrap="wrap">
                  <Text fw={700}>Recent requests</Text>
                  <ThemeIcon radius="xl" size="lg" variant="light" color="lime">
                    <IoDocumentTextOutline size={18} />
                  </ThemeIcon>
                </Group>

                {sortedLeaveData.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    No leave requests recorded yet.
                  </Text>
                ) : (
                  <Stack gap="sm">
                    {sortedLeaveData.slice(0, 6).map((record, index) => (
                      <Paper key={record.id} withBorder radius="lg" p="md">
                        <Stack gap="xs">
                          <Group justify="space-between" wrap="wrap" gap="xs">
                            <Badge
                              variant="light"
                              color={getLeaveAccent(record.type)}
                            >
                              {formatLeaveType(record.type)}
                            </Badge>
                            <Text size="sm" c="dimmed">
                              {formatAppDate(record.startAt)}
                            </Text>
                          </Group>

                          <Text fw={600}>
                            {formatAppTime(record.startAt)} to{" "}
                            {formatAppTime(record.endAt)}
                          </Text>

                          {record.reason ? (
                            <Text size="sm" c="dimmed">
                              {record.reason}
                            </Text>
                          ) : null}

                          {index < Math.min(sortedLeaveData.length, 6) - 1 ? (
                            <Divider />
                          ) : null}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Card>
          </Stack>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}

function BalancesCard({
  balances,
  onRequest,
}: {
  balances: Balance[];
  onRequest: () => void;
}) {
  return (
    <Card withBorder radius="lg" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text fw={800}>Time Off Balances</Text>
          <Button size="sm" radius="lg" onClick={onRequest}>
            Request time off
          </Button>
        </Group>

        <Divider />

        <Table withRowBorders withTableBorder highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Policy</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Balance</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {balances.map((b) => (
              <Table.Tr key={b.policy}>
                <Table.Td>{b.policy}</Table.Td>
                <Table.Td style={{ textAlign: "right" }}>
                  <Text fw={700}>{b.hours.toFixed(2)} hours</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Card>
  );
}

function LeaveRequestCard(props: LeaveRequestCardProps) {
  return (
    <Card withBorder radius="lg" p="lg">
      <Stack gap="md">
        <Title order={3}>Leave Request</Title>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Box>
            <Text fw={700} mb={6}>
              Date
            </Text>
            <DatePickerInput
              value={
                props.selectedDate ? appDateKeyToDate(props.selectedDate) : null
              }
              onChange={(value) =>
                props.setSelectedDate(value ? toAppDateKey(value) : null)
              }
              minDate={MIN_LEAVE_REQUEST_DATE}
            />
          </Box>

          <Box>
            <Text fw={700} mb={6}>
              Reason
            </Text>
            <Select
              value={props.reason}
              onChange={(value) => props.setReason(value as LeaveReason | null)}
              data={[
                { value: "PAID_SICK", label: "Paid Sick" },
                { value: "UNPAID_SICK", label: "Unpaid Sick" },
                { value: "PERSONAL", label: "Personal" },
                { value: "VACATION", label: "Vacation" },
              ]}
            />
          </Box>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Box>
            <Text fw={700} mb={6}>
              Type
            </Text>
            <Select
              value={props.leaveType}
              onChange={(value) =>
                props.setLeaveType(value as LeaveDuration | null)
              }
              data={[
                { value: "FULL_DAY", label: "Full Day" },
                { value: "HALF_DAY", label: "Half Day" },
              ]}
            />
          </Box>

          <Box>
            <Text fw={700} mb={6}>
              Comments
            </Text>
            <Textarea
              value={props.comments}
              onChange={(e) => props.setComments(e.currentTarget.value)}
              minRows={4}
              autosize
            />
          </Box>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Box>
            <Text fw={700} mb={6}>
              Start time
            </Text>
            <TimeInput
              value={props.startTime}
              onChange={(e) => props.setStartTime(e.currentTarget.value)}
            />
          </Box>

          <Box>
            <Text fw={700} mb={6}>
              End time
            </Text>
            <TimeInput
              value={props.endTime}
              onChange={(e) => props.setEndTime(e.currentTarget.value)}
            />
          </Box>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <InfoTile
            label="Hours Scheduled"
            value={`${props.hoursScheduled} hours`}
          />
          <InfoTile
            label="Hours Available"
            value={`${props.hoursAvailable.toFixed(1)} hours`}
          />
        </SimpleGrid>

        <Group grow={props.isMobile} justify="space-between" mt="sm">
          <Button
            size="md"
            variant="default"
            onClick={props.onPrevious}
            fullWidth={props.isMobile}
          >
            Back
          </Button>

          <Button
            size="md"
            onClick={props.onSubmit}
            loading={props.submitting}
            fullWidth={props.isMobile}
          >
            Submit Request
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Text fw={700} mb={6}>
        {label}
      </Text>
      <Card withBorder radius="lg" p="md" bg="gray.1">
        <Text fw={800} ta="center">
          {value}
        </Text>
      </Card>
    </Box>
  );
}
