"use client";

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
} from "@mantine/core";
import { useMemo, useState } from "react";
import { IoClipboardOutline, IoChevronDown } from "react-icons/io5";

type Week = 1 | 2;

type DayCell = {
  dow: string; // Sun, Mon...
  dateLabel: string; // Feb 15
  isToday?: boolean;
  hours: string; // "0:00"
};

const PAY_PERIODS = [
  { value: "2026-02-15_2026-02-28", label: "15-02-2026 – 28-02-2026" },
  { value: "2026-03-01_2026-03-14", label: "01-03-2026 – 14-03-2026" },
];

export default function EnterTimePage() {
  const [payPeriod, setPayPeriod] = useState<string | null>(PAY_PERIODS[0].value);
  const [week, setWeek] = useState<Week>(1);

  // modal state for "day details"
  const [openDay, setOpenDay] = useState<{ week: Week; idx: number } | null>(null);

  const days = useMemo(() => {
    // Mocked UI data to match your screenshots.
    // Replace later with real data from DB/API.
    const week1: DayCell[] = [
      { dow: "Sun", dateLabel: "Feb 15", hours: "0:00" },
      { dow: "Mon", dateLabel: "Feb 16", hours: "0:00" },
      { dow: "Tue", dateLabel: "Today", isToday: true, hours: "0:00" },
      { dow: "Wed", dateLabel: "Feb 18", hours: "0:00" },
      { dow: "Thu", dateLabel: "Feb 19", hours: "0:00" },
      { dow: "Fri", dateLabel: "Feb 20", hours: "0:00" },
      { dow: "Sat", dateLabel: "Feb 21", hours: "0:00" },
    ];

    const week2: DayCell[] = [
      { dow: "Sun", dateLabel: "Feb 22", hours: "0:00" },
      { dow: "Mon", dateLabel: "Feb 23", hours: "0:00" },
      { dow: "Tue", dateLabel: "Feb 24", hours: "0:00" },
      { dow: "Wed", dateLabel: "Feb 25", hours: "0:00" },
      { dow: "Thu", dateLabel: "Feb 26", hours: "0:00" },
      { dow: "Fri", dateLabel: "Feb 27", hours: "0:00" },
      { dow: "Sat", dateLabel: "Feb 28", hours: "0:00" },
    ];

    return { 1: week1, 2: week2 } as const;
  }, []);

  const activeDays = days[week];

  const totalHours = useMemo(() => {
    // Placeholder: if you store minutes later, compute total properly.
    return "0:00";
  }, [week, payPeriod]);

  const goWeek1 = () => setWeek(1);
  const goWeek2 = () => setWeek(2);
  const next = () => setWeek(2);
  const prev = () => setWeek(1);

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header controls */}
        <Group justify="center" gap="xl">
          <Text fw={600}>Pay Period</Text>

          <Box w={420}>
            <Select
              value={payPeriod}
              onChange={setPayPeriod}
              data={PAY_PERIODS}
              rightSection={<IoChevronDown size={18} />}
              styles={{
                input: {
                  height: 52,
                  fontWeight: 700,
                  textAlign: "center",
                },
              }}
            />
          </Box>
        </Group>

        {/* Week toggle */}
        <Group justify="center" gap="md">
          <Button
            size="lg"
            radius="md"
            color={week === 1 ? "green" : "gray"}
            variant="filled"
            onClick={goWeek1}
            styles={{ root: { width: 240, height: 56, fontWeight: 700 } }}
          >
            Week 1
          </Button>

          <Button
            size="lg"
            radius="md"
            color={week === 2 ? "green" : "gray"}
            variant="filled"
            onClick={goWeek2}
            styles={{ root: { width: 240, height: 56, fontWeight: 700 } }}
          >
            Week 2
          </Button>
        </Group>

        {/* Main card */}
        <Paper withBorder radius="md" p="xl">
          <Title order={3} mb="lg">
            My hours for this week
          </Title>

          <Box style={{ overflowX: "auto" }}>
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
                    <Table.Th key={i} style={{ textAlign: "center" }}>
                      <Text size="sm" c="dimmed">
                        {d.dow}
                      </Text>
                      <Text fw={800} c={d.isToday ? "blue" : undefined}>
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
                    <Table.Td key={i} style={{ textAlign: "center" }}>
                      <Text fw={700}>{d.hours}</Text>
                    </Table.Td>
                  ))}
                </Table.Tr>

                <Table.Tr>
                  <Table.Td>
                    <Text fw={700}>Total Hours:</Text>
                  </Table.Td>

                  {activeDays.map((d, i) => (
                    <Table.Td key={i} style={{ textAlign: "center" }}>
                      <Text fw={700}>{d.hours}</Text>
                    </Table.Td>
                  ))}
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Box>

          {/* Icon row (clickable day details) */}
          <Group justify="space-between" mt="lg" px="sm" style={{ minWidth: 860 }}>
            {activeDays.map((_, i) => (
              <Box key={i} w={100} style={{ display: "flex", justifyContent: "center" }}>
                <ActionIcon
                  variant="subtle"
                  size={56}
                  aria-label="View day details"
                  onClick={() => setOpenDay({ week, idx: i })}
                >
                  <IoClipboardOutline size={40} />
                </ActionIcon>
              </Box>
            ))}
          </Group>
        </Paper>

        {/* Footer nav buttons */}
        <Group justify="flex-end" gap="lg">
          {week === 1 ? (
            <Button
              size="xl"
              radius="md"
              color="green"
              onClick={next}
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
                onClick={prev}
                styles={{ root: { width: 260, height: 64, fontWeight: 800 } }}
              >
                Previous
              </Button>

              <Button
                size="xl"
                radius="md"
                color="dark"
                onClick={() => console.log("Submit timesheet")}
                styles={{ root: { width: 260, height: 64, fontWeight: 800 } }}
              >
                Submit
              </Button>
            </>
          )}
        </Group>
      </Stack>

      {/* Day details modal */}
      <Modal
        opened={openDay !== null}
        onClose={() => setOpenDay(null)}
        title="Day details"
        centered
      >
        {openDay ? (
          <Stack gap="sm">
            <Text>
              <b>Week:</b> {openDay.week}
            </Text>
            <Text>
              <b>Day:</b> {activeDays[openDay.idx]?.dow} — {activeDays[openDay.idx]?.dateLabel}
            </Text>

            <Text c="dimmed" size="sm">
              This is where you’ll show entered jobs/appointments, time blocks, notes, etc.
            </Text>

            <Button onClick={() => setOpenDay(null)}>Close</Button>
          </Stack>
        ) : null}
      </Modal>
    </Container>
  );
}
