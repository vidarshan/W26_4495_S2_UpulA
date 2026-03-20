"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
  SegmentedControl,
} from "@mantine/core";
import { DatePickerInput, TimeInput } from "@mantine/dates";
import { useMediaQuery } from "@mantine/hooks";

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

export default function ApplyLeavePage() {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [mode, setMode] = useState<Mode>("balances");
  const [selectedDate, setSelectedDate] = useState<string | null>(
    new Date().toISOString().slice(0, 10),
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

  // TODO: replace with session-based user context
  const staffId = "3b32d468-9f20-4808-9f25-bffabed6a9cb";

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

  const sickHoursUsed = useMemo(() => {
    return leaveData
      .filter((l) => l.type.includes("SICK"))
      .reduce((acc, curr) => {
        const diff =
          new Date(curr.endAt).getTime() - new Date(curr.startAt).getTime();
        return acc + diff / 3600000;
      }, 0);
  }, [leaveData]);

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
            radius="md"
            value={mode}
            onChange={(value) => setMode(value as Mode)}
            data={[
              { label: "Balances", value: "balances" },
              { label: "Request", value: "request" },
            ]}
          />
        )}

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" verticalSpacing="md">
          <Card withBorder radius="md" p={{ base: "sm", sm: "md" }}>
            <Stack gap="sm">
              <Group justify="space-between" wrap="wrap">
                <Text fw={700}>Calendar</Text>
                <Text size="sm" c="dimmed">
                  Tap a date to request leave
                </Text>
              </Group>

              <Box
                style={{
                  overflowX: "auto",
                }}
              >
                <Box
                  style={{
                    minWidth: isMobile ? 0 : 0,
                  }}
                >
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                      left: "prev,next",
                      center: "title",
                      right: isMobile
                        ? "dayGridMonth,timeGridWeek"
                        : "dayGridMonth,timeGridWeek,timeGridDay",
                    }}
                    height="auto"
                    events={calendarEvents}
                    dateClick={onDateClick}
                    selectable
                    dayMaxEventRows={isMobile ? 2 : 3}
                  />
                </Box>
              </Box>
            </Stack>
          </Card>

          <Stack gap="md">
            {mode === "balances" ? (
              <BalancesCard
                balances={[
                  { policy: "Vacation Remaining", hours: vacationBalance },
                  { policy: "Sick Used", hours: sickHoursUsed },
                ]}
                onRequest={() => setMode("request")}
              />
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
                hoursAvailable={reason === "VACATION" ? vacationBalance : 40}
                onPrevious={() => setMode("balances")}
                onSubmit={handleSubmitLeave}
                submitting={submitting}
                isMobile={!!isMobile}
              />
            )}

            <Card withBorder radius="md" p="lg">
              <Stack gap={6}>
                <Text fw={700}>Quick info</Text>
                <Text size="sm" c="dimmed">
                  Vacation is calculated from your remaining balance. Sick and
                  personal leave availability can be adjusted to match your
                  policy rules later.
                </Text>
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
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text fw={800}>Time Off Balances</Text>
          <Button size="sm" radius="md" onClick={onRequest}>
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
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Title order={3}>Leave Request</Title>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Box>
            <Text fw={700} mb={6}>
              Date
            </Text>
            <DatePickerInput
              value={props.selectedDate}
              onChange={props.setSelectedDate}
              minDate={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)}
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
            radius="md"
            variant="default"
            onClick={props.onPrevious}
            fullWidth={props.isMobile}
          >
            Back
          </Button>

          <Button
            size="md"
            radius="md"
            color="dark"
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
      <Card withBorder radius="md" p="md" bg="gray.1">
        <Text fw={800} ta="center">
          {value}
        </Text>
      </Card>
    </Box>
  );
}
