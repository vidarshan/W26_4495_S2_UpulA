"use client";

import {
  Box,
  Button,
  Container,
  Group,
  SegmentedControl,
  Text,
} from "@mantine/core";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { IoArrowBackOutline, IoArrowForwardOutline } from "react-icons/io5";
import { useRef, useState } from "react";
import { DateSelectArg } from "@fullcalendar/core";
import { useDisclosure } from "@mantine/hooks";
import NewJobModal from "../components/popups/JobModal";
import { CalendarSelection } from "@/types";

export default function DashboardClient() {
  const [view, setView] = useState("month");
  const [opened, { open, close }] = useDisclosure(false);
  const calendarRef = useRef<FullCalendar | null>(null);
  const [currentTitle, setCurrentTitle] = useState("");

  const [calendarInfo, setCalendarInfo] = useState<CalendarSelection>({
    start: null,
    end: null,
    startStr: "",
    endStr: "",
    allDay: false,
  });

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setCalendarInfo(selectInfo);
    open();
  };

  const handleEventClick = (info) => {
    console.log(info);
  };

  const refreshCalendar = () => {
    console.log("ddd");
    calendarRef.current?.getApi().refetchEvents();
  };

  return (
    <Container fluid>
      <NewJobModal
        selectedInfo={calendarInfo}
        opened={opened}
        onClose={close}
        onSuccess={refreshCalendar}
      />
      <h1>Dashboard</h1>

      <Box p={0}>
        <Group justify="space-between" align="center" mb="lg">
          <Text fw={600} c="dimmed">
            {currentTitle}
          </Text>
          <SegmentedControl
            color="green"
            size="sm"
            value={view}
            onChange={(value) => {
              setView(value);
              console.log(value);
              const calendarApi = calendarRef.current?.getApi();

              if (value === "month") {
                calendarApi?.changeView("dayGridMonth");
              }

              if (value === "week") {
                calendarApi?.changeView("timeGridWeek");
              }

              if (value === "day") {
                calendarApi?.changeView("timeGridDay");
              }
            }}
            data={[
              { label: "Month", value: "month" },
              { label: "Week", value: "week" },
              { label: "Day", value: "day" },
            ]}
          />
          <Group>
            <Button.Group>
              <Button
                leftSection={<IoArrowBackOutline />}
                variant="default"
                onClick={() => calendarRef.current?.getApi().prev()}
              >
                Prev
              </Button>
              <Button
                variant="default"
                onClick={() => calendarRef.current?.getApi().today()}
              >
                Today
              </Button>
              <Button
                rightSection={<IoArrowForwardOutline />}
                variant="default"
                onClick={() => calendarRef.current?.getApi().next()}
              >
                Next
              </Button>
            </Button.Group>
          </Group>
        </Group>

        <FullCalendar
          height="75vh"
          headerToolbar={false}
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          eventOverlap={true}
          selectOverlap={true}
          datesSet={(arg) => {
            setCurrentTitle(arg.view.title);
          }}
          slotMinTime="00:00:00"
          slotMaxTime="23:59:00"
          slotDuration="00:30:00"
          editable
          dayMaxEventRows={3}
          select={handleDateSelect}
          selectable
          allDaySlot={false}
          nowIndicator
          events="/api/appointments"
          eventClick={handleEventClick}
          eventDrop={(info) => {
            console.log("Moved:", info.event.id, info.event.start);
          }}
          eventResize={(info) => {
            console.log("Resized:", info.event.id, info.event.end);
          }}
        />
      </Box>
    </Container>
  );
}
