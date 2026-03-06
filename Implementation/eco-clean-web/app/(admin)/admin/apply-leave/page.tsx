"use client";

import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import { useRouter } from "next/navigation";


import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput, TimeInput } from "@mantine/dates";

type Mode = "balances" | "request";

type Balance = { policy: string; hours: number };

export default function ApplyLeavePage() {
  const [mode, setMode] = useState<Mode>("balances");

  // Calendar selection -> populates form
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Form state (mock)
  const [leaveType, setLeaveType] = useState<string | null>("FULL_DAY");
  const [reason, setReason] = useState<string | null>("UNPAID_SICK");
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("12:00");
  const [comments, setComments] = useState<string>("");

  const balances: Balance[] = [
    { policy: "SICK_HOURLY_BC", hours: 0 },
    { policy: "UNPAID_SICK_HOURLY_BC", hours: 40 },
    { policy: "VAC_HRLY_BC", hours: 101.33 },
  ];

  const hoursAvailable = useMemo(() => {
    // Example: show the matching policy’s hours
    if (reason === "UNPAID_SICK") return 40;
    if (reason === "PAID_SICK") return 0;
    return 101.33;
  }, [reason]);

  const hoursScheduled = useMemo(() => {
    // Simple placeholder calc. You can compute properly later.
    return leaveType === "FULL_DAY" ? 8 : 3.5;
  }, [leaveType]);

  const events = useMemo(
    () => [
      // Mock shifts + holiday like your screenshot
      { title: "Shift : 8 hrs", start: "2026-02-02" },
      { title: "Shift : 8 hrs", start: "2026-02-03" },
      { title: "Shift : 8 hrs", start: "2026-02-06" },
      { title: "Shift : 8 hrs", start: "2026-02-07" },
      { title: "Family Day", start: "2026-02-16", color: "#74b816" },
    ],
    []
  );

  const onDateClick = (arg: DateClickArg) => {
    setSelectedDate(arg.date);
    // Optional: also switch to request mode when they click a day
    // setMode("request");
  };

  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="lg">
        Your Schedule
      </Title>

      <Group align="flex-start" gap="xl" wrap="nowrap">
        {/* Left: Calendar */}
        <Box style={{ flex: 1, minWidth: 720 }}>
          <Card withBorder radius="md" p="md">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next title",
                center: "",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              height="auto"
              events={events}
              dateClick={onDateClick}
              selectable
            />
          </Card>
        </Box>

        {/* Right: Side card that toggles */}
        <Box style={{ width: 380, minWidth: 320 }}>
          {mode === "balances" ? (
            <BalancesCard
              balances={balances}
              onRequest={() => setMode("request")}
            />
          ) : (
            <LeaveRequestCard
              selectedDate={selectedDate}
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
              hoursAvailable={hoursAvailable}
              onPrevious={() => setMode("balances")}
              onSubmit={() => {
                // TODO: POST to your API
                console.log("Submit leave request", {
                  selectedDate,
                  leaveType,
                  reason,
                  startTime,
                  endTime,
                  comments,
                });
              }}
            />
          )}
        </Box>
      </Group>
    </Container>
  );
}

function BalancesCard({
  balances,
  onRequest,
}: {
  balances: { policy: string; hours: number }[];
  onRequest: () => void;
}) {
  return (
    <Card withBorder radius="md" p="lg">
      <Button size="md" radius="md" onClick={onRequest} mb="md">
        Request time off
      </Button>

      <Divider my="md" />

      <Text fw={800} mb="sm">
        Time Off Balances
      </Text>

      <Table withRowBorders withTableBorder highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Time Off Policy</Table.Th>
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

      <Divider my="md" />

      <Text size="sm" c="dimmed">
        Tip: click a date on the calendar to prefill the request form.
      </Text>
    </Card>
  );
}

function LeaveRequestCard(props: {
  selectedDate: Date | null;

  leaveType: string | null;
  setLeaveType: (v: string | null) => void;

  reason: string | null;
  setReason: (v: string | null) => void;

  startTime: string;
  setStartTime: (v: string) => void;

  endTime: string;
  setEndTime: (v: string) => void;

  comments: string;
  setComments: (v: string) => void;

  hoursScheduled: number;
  hoursAvailable: number;

  onPrevious: () => void;
  onSubmit: () => void;
}) {
  const {
    selectedDate,
    leaveType,
    setLeaveType,
    reason,
    setReason,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    comments,
    setComments,
    hoursScheduled,
    hoursAvailable,
    onPrevious,
    onSubmit,
  } = props;

  return (
    <Card withBorder radius="md" p="lg">
      <Title order={3} mb="md">
        Leave Request
      </Title>

      <Stack gap="md">
        <Group grow align="flex-start">
          <Box>
            <Text fw={700} mb={6}>
              Date
            </Text>
            <DateInput
              value={selectedDate}
              onChange={() => {}}
              placeholder="DD/MM/YYYY"
              // readOnly feel: we keep it visible; selection comes from calendar
              readOnly
            />
          </Box>

          <Box>
            <Text fw={700} mb={6}>
              Reason
            </Text>
            <Select
              value={reason}
              onChange={setReason}
              data={[
                { value: "PAID_SICK", label: "Paid Sick" },
                { value: "UNPAID_SICK", label: "Unpaid Sick" },
                { value: "PERSONAL", label: "Personal" },
                { value: "VACATION", label: "Vacation" },
              ]}
              placeholder="Select reason"
            />
          </Box>
        </Group>

        <Group grow align="flex-start">
          <Box>
            <Text fw={700} mb={6}>
              Type
            </Text>
            <Select
              value={leaveType}
              onChange={setLeaveType}
              data={[
                { value: "FULL_DAY", label: "Full Day" },
                { value: "HALF_DAY", label: "Half Day" },
              ]}
              placeholder="Select type"
            />
          </Box>

          <Box>
            <Text fw={700} mb={6}>
              Comments
            </Text>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.currentTarget.value)}
              placeholder="Add notes (optional)"
              minRows={4}
            />
          </Box>
        </Group>

        <Group grow>
          <Box>
            <Text fw={700} mb={6}>
              Start time
            </Text>
            <TimeInput
              value={startTime}
              onChange={(e) => setStartTime(e.currentTarget.value)}
            />
          </Box>

          <Box>
            <Text fw={700} mb={6}>
              End time
            </Text>
            <TimeInput
              value={endTime}
              onChange={(e) => setEndTime(e.currentTarget.value)}
            />
          </Box>
        </Group>

        <Group grow>
          <Box>
            <Text fw={700} mb={6}>
              Hours Scheduled
            </Text>
            <Card withBorder radius="md" p="md" style={{ background: "#868e96" }}>
              <Text c="white" fw={800} ta="center">
                {hoursScheduled} hours
              </Text>
            </Card>
          </Box>

          <Box>
            <Text fw={700} mb={6}>
              Hours Available
            </Text>
            <Card withBorder radius="md" p="md" style={{ background: "#868e96" }}>
              <Text c="white" fw={800} ta="center">
                {hoursAvailable.toFixed(1)} hours
              </Text>
            </Card>
          </Box>
        </Group>

        <Group justify="space-between" mt="sm">
          <Button
            size="lg"
            radius="md"
            color="green"
            variant="filled"
            onClick={onPrevious}
            styles={{ root: { width: 160, height: 56, fontWeight: 800 } }}
          >
            Previous
          </Button>

          <Button
            size="lg"
            radius="md"
            color="dark"
            onClick={onSubmit}
            styles={{ root: { width: 160, height: 56, fontWeight: 800 } }}
          >
            Submit
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
