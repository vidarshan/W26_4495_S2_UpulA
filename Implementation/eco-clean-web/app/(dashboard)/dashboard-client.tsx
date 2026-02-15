"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Container,
  Group,
  SegmentedControl,
  Stack,
  Title,
} from "@mantine/core";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { IoHandLeft, IoHandRight } from "react-icons/io5";

export default function DashboardClient() {
  return (
    <Container fluid>
      <h1>Dashboard</h1>
      <Stack gap="sm" mb="md">
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Title order={4} c="dimmed">
              Cleaning Scheduling
            </Title>
            <Group gap="xs">
              <Title order={2}>February 2026</Title>
              <ActionIcon variant="subtle">
                <IoHandLeft size={18} />
              </ActionIcon>
              <ActionIcon variant="subtle">
                <IoHandRight size={18} />
              </ActionIcon>
              <Button variant="default" size="xs">
                Today
              </Button>
              <Button color="green" size="xs">
                Find a Time
              </Button>
            </Group>
          </Stack>

          <Group>
            <SegmentedControl
              size="xs"
              value="month"
              data={[
                { label: "Month", value: "month" },
                { label: "Week", value: "week" },
                { label: "Day", value: "day" },
              ]}
            />
          </Group>
        </Group>
      </Stack>
      <FullCalendar
        headerToolbar={false}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        // headerToolbar={{
        //   left: "prev,next today",
        //   center: "title",
        //   right: "timeGridDay,timeGridWeek,dayGridMonth",
        // }}
        slotMinTime="00:00:00"
        slotMaxTime="23:59:00"
        slotDuration="00:30:00"
        editable
        selectable
        allDaySlot={false}
        nowIndicator
        events={[
          {
            id: "1",
            title: "Standup",
            start: "2026-02-09T09:00:00",
            end: "2026-02-09T09:30:00",
          },
          {
            id: "2",
            title: "Deep work",
            start: "2026-02-09T13:00:00",
            end: "2026-02-09T15:00:00",
          },
        ]}
        eventDrop={(info) => {
          console.log("Moved:", info.event.id, info.event.start);
        }}
        eventResize={(info) => {
          console.log("Resized:", info.event.id, info.event.end);
        }}
      />
    </Container>
  );
}
