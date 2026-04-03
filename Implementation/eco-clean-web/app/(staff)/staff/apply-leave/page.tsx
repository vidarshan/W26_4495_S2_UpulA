"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { DateInput, DatePicker, TimeInput } from "@mantine/dates";
import { useSession } from "next-auth/react";
import { IoCalendarOutline, IoDocumentTextOutline } from "react-icons/io5";

type Mode = "balances" | "request";

type LeaveRecord = {
  id: string;
  type: string;
  startAt: string;
  endAt: string;
  reason?: string | null;
};

type LeaveReason = "PAID_SICK" | "UNPAID_SICK" | "PERSONAL" | "VACATION";
type LeaveDuration = "FULL_DAY" | "HALF_DAY";

type SelectFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  data: { value: string; label: string }[];
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

export default function ApplyLeavePage() {
  const { data: session } = useSession();
  const [mode, setMode] = useState<Mode>("balances");
  const [selectedDate, setSelectedDate] = useState<string | null>(
    toDateKey(new Date()),
  );

  const [leaveType, setLeaveType] = useState<LeaveDuration | null>("FULL_DAY");
  const [reason, setReason] = useState<LeaveReason | null>("UNPAID_SICK");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [comments, setComments] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [leaveData, setLeaveData] = useState<LeaveRecord[]>([]);

  const staffId = session?.user?.id || "3b32d468-9f20-4808-9f25-bffabed6a9cb";

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
        const diff =
          new Date(curr.endAt).getTime() - new Date(curr.startAt).getTime();
        return acc + diff / 3600000;
      }, 0);

    return startingEntitlement - hoursUsed;
  }, [leaveData]);

  const sickHoursUsed = useMemo(
    () =>
      leaveData
        .filter((l) => l.type.includes("SICK"))
        .reduce((acc, curr) => {
          const diff =
            new Date(curr.endAt).getTime() - new Date(curr.startAt).getTime();
          return acc + diff / 3600000;
        }, 0),
    [leaveData],
  );

  const hoursScheduled = useMemo(
    () => (leaveType === "FULL_DAY" ? 8 : 3.5),
    [leaveType],
  );

  const leaveMarkers = useMemo(
    () =>
      new Set(
        leaveData.map((record) => toDateKey(new Date(record.startAt))),
      ),
    [leaveData],
  );

  const sortedLeaveData = useMemo(
    () =>
      [...leaveData].sort(
        (a, b) =>
          new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
      ),
    [leaveData],
  );

  function combineDateAndTime(date: string, time: string) {
    const [hours, minutes] = time.split(":").map(Number);
    const [year, month, day] = date.split("-").map(Number);
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

      const startAt = combineDateAndTime(selectedDate, startTime);
      const endAt = combineDateAndTime(selectedDate, endTime);

      if (endAt <= startAt) {
        throw new Error("End time must be after start time.");
      }

      const response = await fetch(`/api/staff/${staffId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reason,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
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

  if (loading && leaveData.length === 0) {
    return (
      <Container p={0} className="staff-app-page">
        <Center mih="70vh">
          <Stack align="center" gap="sm">
            <Loader size="lg" color="lime" />
            <Text c="dimmed">Loading your leave data...</Text>
          </Stack>
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
            <Title order={3}>Time-off</Title>
            <Text size="sm" c="dimmed">
              Check balances, review existing leave, and submit a new request.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
            <StatCard label="Vacation Remaining" value={`${vacationBalance.toFixed(1)} hrs`} />
            <StatCard label="Sick Used" value={`${sickHoursUsed.toFixed(1)} hrs`} />
          </SimpleGrid>
        </Card>

        {(errorMessage || successMessage) && (
          <Stack gap="xs">
            {errorMessage ? <Alert color="red">{errorMessage}</Alert> : null}
            {successMessage ? <Alert color="lime">{successMessage}</Alert> : null}
          </Stack>
        )}

        <SegmentedControl
          fullWidth
          radius="xl"
          color="lime"
          value={mode}
          onChange={(value) => setMode(value as Mode)}
          data={[
            { label: "Balances", value: "balances" },
            { label: "Request", value: "request" },
          ]}
        />

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" verticalSpacing="md">
          <Card withBorder radius="lg" p="lg" className="staff-app-surface">
            <Stack gap="md">
              <Group justify="space-between" wrap="wrap">
                <Stack gap={2}>
                  <Text fw={700}>Choose a date</Text>
                  <Text size="sm" c="dimmed">
                    Dates with a dot already have a leave entry.
                  </Text>
                </Stack>
                <ThemeIcon radius="xl" size="lg" variant="light" color="lime">
                  <IoCalendarOutline size={18} />
                </ThemeIcon>
              </Group>

              <Paper withBorder radius="lg" p="xs">
                <DatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  minDate={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)}
                  size="sm"
                  styles={{
                    calendarHeader: { marginBottom: 8 },
                    monthCell: { padding: 2 },
                  }}
                  renderDay={(date) => {
                    const hasLeave = leaveMarkers.has(date);
                    const dayNumber = new Date(`${date}T00:00:00`).getDate();

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
              <Card withBorder radius="lg" p="lg" className="staff-app-surface">
                <Stack gap="md">
                  <Group justify="space-between" align="center" wrap="wrap">
                    <Text fw={700}>Time-off balances</Text>
                    <Button
                      size="sm"
                      radius="md"
                      color="lime"
                      variant="light"
                      onClick={() => setMode("request")}
                    >
                      Request time off
                    </Button>
                  </Group>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <InfoRow label="Vacation Remaining" value={`${vacationBalance.toFixed(2)} hours`} />
                    <InfoRow label="Sick Used" value={`${sickHoursUsed.toFixed(2)} hours`} />
                  </SimpleGrid>
                </Stack>
              </Card>
            ) : (
              <Card withBorder radius="lg" p="lg" className="staff-app-surface">
                <Stack gap="md">
                  <Title order={4}>Leave request</Title>

                  <DateInput
                    label="Date"
                    value={selectedDate}
                    onChange={setSelectedDate}
                    minDate={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)}
                  />

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <SelectField
                      label="Reason"
                      value={reason}
                      onChange={(value) => setReason(value as LeaveReason | null)}
                      data={[
                        { value: "PAID_SICK", label: "Paid Sick" },
                        { value: "UNPAID_SICK", label: "Unpaid Sick" },
                        { value: "PERSONAL", label: "Personal" },
                        { value: "VACATION", label: "Vacation" },
                      ]}
                    />
                    <SelectField
                      label="Type"
                      value={leaveType}
                      onChange={(value) => setLeaveType(value as LeaveDuration | null)}
                      data={[
                        { value: "FULL_DAY", label: "Full Day" },
                        { value: "HALF_DAY", label: "Half Day" },
                      ]}
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TimeInput
                      label="Start time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.currentTarget.value)}
                    />
                    <TimeInput
                      label="End time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.currentTarget.value)}
                    />
                  </SimpleGrid>

                  <Textarea
                    label="Comments"
                    value={comments}
                    onChange={(e) => setComments(e.currentTarget.value)}
                    minRows={3}
                    autosize
                  />

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <InfoRow label="Hours Scheduled" value={`${hoursScheduled} hours`} />
                    <InfoRow
                      label="Hours Available"
                      value={`${(reason === "VACATION" ? vacationBalance : 40).toFixed(1)} hours`}
                    />
                  </SimpleGrid>

                  <Group justify="space-between" wrap="wrap">
                    <Button variant="subtle" color="gray" radius="md" onClick={() => setMode("balances")}>
                      Back
                    </Button>
                    <Button
                      radius="md"
                      color="lime"
                      onClick={handleSubmitLeave}
                      loading={submitting}
                    >
                      Submit Request
                    </Button>
                  </Group>
                </Stack>
              </Card>
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
                            <Badge variant="light" color={getLeaveAccent(record.type)}>
                              {formatLeaveType(record.type)}
                            </Badge>
                            <Text size="sm" c="dimmed">
                              {new Date(record.startAt).toLocaleDateString()}
                            </Text>
                          </Group>

                          <Text fw={600}>
                            {new Date(record.startAt).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}{" "}
                            to{" "}
                            {new Date(record.endAt).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder radius="lg" p="md">
      <Text size="xs" fw={700} c="dimmed">
        {label}
      </Text>
      <Text size="xl" fw={800} mt={6}>
        {value}
      </Text>
    </Paper>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder radius="lg" p="md">
      <Text size="xs" fw={700} c="dimmed">
        {label}
      </Text>
      <Text fw={700} mt={6}>
        {value}
      </Text>
    </Paper>
  );
}

function BoxDot({ visible }: { visible: boolean }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: visible ? "var(--mantine-color-lime-6)" : "transparent",
        display: "inline-block",
      }}
    />
  );
}

function SelectField({
  label,
  value,
  onChange,
  data,
}: SelectFieldProps) {
  return <Select label={label} value={value} onChange={onChange} data={data} />;
}
