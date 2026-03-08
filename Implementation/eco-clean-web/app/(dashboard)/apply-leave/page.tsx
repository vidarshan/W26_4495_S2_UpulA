"use client";

import { useMemo, useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";

import {
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
  Alert,
  Loader,
} from "@mantine/core";
import { DateInput, TimeInput } from "@mantine/dates";

type Mode = "balances" | "request";
type Balance = { policy: string; hours: number };

export default function ApplyLeavePage() {
  const [mode, setMode] = useState<Mode>("balances");
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const [leaveType, setLeaveType] = useState<string | null>("FULL_DAY");
  const [reason, setReason] = useState<string | null>("UNPAID_SICK");
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [comments, setComments] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [leaveData, setLeaveData] = useState<any[]>([]);

  // Dynamic User Context
  const staffId = "3b32d468-9f20-4808-9f25-bffabed6a9cb";

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const leaveRes = await fetch(`/api/staff/${staffId}/leave`);
        if (!leaveRes.ok) throw new Error("Could not fetch leave records");
        const data = await leaveRes.json();
        setLeaveData(data);
      } catch (err) {
        setErrorMessage("Failed to load records from the server.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [staffId, successMessage]);

  const vacationBalance = useMemo(() => {
    const startingEntitlement = 101.33; // User's specific entitlement
    const hoursUsed = leaveData
      .filter((l) => l.type === "VACATION")
      .reduce((acc, curr) => {
        const diff = new Date(curr.endAt).getTime() - new Date(curr.startAt).getTime();
        return acc + (diff / 3600000);
      }, 0);
    return startingEntitlement - hoursUsed;
  }, [leaveData]);

  const hoursScheduled = useMemo(() => {
    return leaveType === "FULL_DAY" ? 8 : 3.5;
  }, [leaveType]);

  const calendarEvents = useMemo(() => {
    return leaveData.map((l) => ({
      title: `${l.type.replace("_", " ")}`,
      start: l.startAt,
      end: l.endAt,
      color: l.type === "VACATION" ? "#228be6" : "#fab005",
    }));
  }, [leaveData]);

  const onDateClick = (arg: DateClickArg) => {
    setSelectedDate(arg.date);
    setMode("request");
  };

  function combineDateAndTime(date: Date, time: string) {
    const [hours, minutes] = time.split(":").map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }

  async function handleSubmitLeave() {
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!selectedDate || !reason) throw new Error("Please select a date and reason.");

      const startAt = combineDateAndTime(selectedDate, startTime);
      const endAt = combineDateAndTime(selectedDate, endTime);

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

      if (!response.ok) throw new Error("Failed to submit request.");

      setSuccessMessage("Leave request submitted successfully.");
      setMode("balances");
      setComments("");
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && leaveData.length === 0) {
    return <Container py="xl" ta="center"><Loader size="xl" /></Container>;
  }

  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="lg">Your Schedule</Title>

      <Group align="flex-start" gap="xl" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 720 }}>
          <Card withBorder radius="md" p="md">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              height="auto"
              events={calendarEvents}
              dateClick={onDateClick}
              selectable
            />
          </Card>
        </Box>

        <Box style={{ width: 380, minWidth: 320 }}>
          {errorMessage && <Alert color="red" mb="md">{errorMessage}</Alert>}
          {successMessage && <Alert color="green" mb="md">{successMessage}</Alert>}

          {mode === "balances" ? (
            <BalancesCard
              balances={[
                { policy: 'VAC_HRLY_BC (Remaining)', hours: vacationBalance },
                { policy: 'SICK_HOURLY_BC (Used)', hours: leaveData.filter(l => l.type.includes('SICK')).length * 8 }
              ]}
              onRequest={() => setMode("request")}
            />
          ) : (
            <LeaveRequestCard
              selectedDate={selectedDate}
              setSelectedDate = {setSelectedDate}
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
              hoursAvailable={reason === 'VACATION' ? vacationBalance : 40}
              onPrevious={() => setMode("balances")}
              onSubmit={handleSubmitLeave}
              submitting={submitting}
            />
          )}
        </Box>
      </Group>
    </Container>
  );
}

// Keeping your EXACT button and table styles below
function BalancesCard({ balances, onRequest }: { balances: Balance[]; onRequest: () => void }) {
  return (
    <Card withBorder radius="md" p="lg">
      <Button size="md" radius="md" onClick={onRequest} mb="md">Request time off</Button>
      <Divider my="md" />
      <Text fw={800} mb="sm">Time Off Balances</Text>
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
              <Table.Td style={{ textAlign: "right" }}><Text fw={700}>{b.hours.toFixed(2)} hours</Text></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Card>
  );
}

function LeaveRequestCard(props: any) {
  return (
    <Card withBorder radius="md" p="lg">
      <Title order={3} mb="md">Leave Request</Title>
      <Stack gap="md">
        <Group grow align="flex-start">
          <Box><Text fw={700} mb={6}>Date</Text><DateInput value={props.selectedDate} onChange={props.setSelectedDate} minDate={new Date().getTime()+ 24*14*60*60*1000}/></Box>
          <Box><Text fw={700} mb={6}>Reason</Text>
            <Select value={props.reason} onChange={props.setReason} data={[{ value: "PAID_SICK", label: "Paid Sick" }, { value: "UNPAID_SICK", label: "Unpaid Sick" }, { value: "PERSONAL", label: "Personal" }, { value: "VACATION", label: "Vacation" }]} />
          </Box>
        </Group>
        <Group grow align="flex-start">
          <Box><Text fw={700} mb={6}>Type</Text><Select value={props.leaveType} onChange={props.setLeaveType} data={[{ value: "FULL_DAY", label: "Full Day" }, { value: "HALF_DAY", label: "Half Day" }]} /></Box>
          <Box><Text fw={700} mb={6}>Comments</Text><Textarea value={props.comments} onChange={(e) => props.setComments(e.currentTarget.value)} minRows={4} /></Box>
        </Group>
        <Group grow>
          <Box><Text fw={700} mb={6}>Start time</Text><TimeInput value={props.startTime} onChange={(e) => props.setStartTime(e.currentTarget.value)} /></Box>
          <Box><Text fw={700} mb={6}>End time</Text><TimeInput value={props.endTime} onChange={(e) => props.setEndTime(e.currentTarget.value)} /></Box>
        </Group>
        <Group grow>
          <Box><Text fw={700} mb={6}>Hours Scheduled</Text>
            <Card withBorder radius="md" p="md" style={{ background: "#868e96" }}><Text c="white" fw={800} ta="center">{props.hoursScheduled} hours</Text></Card>
          </Box>
          <Box><Text fw={700} mb={6}>Hours Available</Text>
            <Card withBorder radius="md" p="md" style={{ background: "#868e96" }}><Text c="white" fw={800} ta="center">{props.hoursAvailable.toFixed(1)} hours</Text></Card>
          </Box>
        </Group>
        <Group justify="space-between" mt="sm">
          <Button size="lg" radius="md" color="green" onClick={props.onPrevious} styles={{ root: { width: 160, height: 56, fontWeight: 800 } }}>Previous</Button>
          <Button size="lg" radius="md" color="dark" onClick={props.onSubmit} loading={props.submitting} styles={{ root: { width: 160, height: 56, fontWeight: 800 } }}>Submit</Button>
        </Group>
      </Stack>
    </Card>
  );
}
