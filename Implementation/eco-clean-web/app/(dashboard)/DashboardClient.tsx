"use client";

import {
  Box,
  Button,
  Container,
  Group,
  Modal,
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
import { useRouter } from "next/navigation";
import AppointmentInfoModal from "../components/popups/AppointmentInfoModal";

export default function DashboardClient() {
  const [view, setView] = useState("month");
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedAppt, setSelectedAppt] = useState("");
  const [appointmentOpened, setAppointmentOpened] = useState(false);
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
    const start = selectInfo.start;
    const end = selectInfo.end;

    const strippedDate = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );

    const startTime = start.toTimeString().slice(0, 5);
    const endTime = end.toTimeString().slice(0, 5);

    setCalendarInfo({
      start: strippedDate,
      end,
      startStr: selectInfo.startStr,
      endStr: selectInfo.endStr,
      allDay: selectInfo.allDay,
    });

    open();
  };

  const handleEventClick = (info) => {
    const event = info.event;
    setSelectedAppt(event.id);
    setSelectedJob(event.extendedProps.jobId);
    setAppointmentOpened(true);
    //router.push(`/jobs/${event.extendedProps.jobId}`);
  };

  const refreshCalendar = () => {
    console.log("ddd");
    calendarRef.current?.getApi().refetchEvents();
  };

  const onAppointmentClose = () => {
    setSelectedJob("");
    setSelectedAppt("");
    setAppointmentOpened(false);
  };

  return (
    <Container fluid>
      {opened && (
        <NewJobModal
          opened
          onClose={close}
          selectedInfo={calendarInfo}
          onSuccess={refreshCalendar}
        />
      )}
      {appointmentOpened && (
        <AppointmentInfoModal
          opened={appointmentOpened}
          apptId={selectedAppt}
          jobId={selectedJob}
          onClose={onAppointmentClose}
        />
      )}

      <h1>Dashboard</h1>

      <Box p={0}>
        <Group justify="space-between" align="center" mb="lg">
          <Text w={`20%`} fw={600} c="dimmed">
            {currentTitle}
          </Text>
          <SegmentedControl
            color="green"
            size="md"
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
          timeZone="local"
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
