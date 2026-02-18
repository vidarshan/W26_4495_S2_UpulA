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
import { useEffect, useRef, useState } from "react";
import { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import NewJobModal from "../components/popups/JobModal";
import AppointmentInfoModal from "../components/popups/AppointmentInfoModal";
import ConfirmCancellationModal from "../components/popups/ConfirmCancellationModal";
import { useCalendarStore, useDashboardUI } from "@/stores/store";
import { CalendarSelection } from "@/types";
import { rescheduleAppointment } from "@/lib/api/appointments";

export default function DashboardClient() {
  const calendarRef = useRef<FullCalendar | null>(null);

  const {
    newJobOpen,
    openNewJob,
    closeNewJob,
    openAppointment,
    appointmentOpen,
    confirmCancelOpen,
  } = useDashboardUI();

  const [view, setView] = useState("month");
  const [currentTitle, setCurrentTitle] = useState("");

  const { setTriggerRefresh } = useCalendarStore();

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

    setCalendarInfo({
      start: strippedDate,
      end,
      startStr: selectInfo.startStr,
      endStr: selectInfo.endStr,
      allDay: selectInfo.allDay,
    });

    openNewJob();
  };

  const handleEventClick = (info: EventClickArg) => {
    openAppointment(info.event.extendedProps.jobId, info.event.id);
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const { id } = info.event;
    const start = info.event.start;
    const end = info.event.end;

    try {
      await rescheduleAppointment(id, start, end);
      info.event.setProp("title", info.event.title); // keep title same
      // optionally show success message
    } catch (err) {
      console.error(err);
      info.revert(); // rollback if API fails
    }
  };

  const refreshCalendar = () => {
    calendarRef.current?.getApi().refetchEvents();
  };

  useEffect(() => {
    setTriggerRefresh(() => () => {
      calendarRef.current?.getApi().refetchEvents();
    });
  }, [setTriggerRefresh]);

  return (
    <Container fluid>
      {newJobOpen && (
        <NewJobModal
          opened
          onClose={closeNewJob}
          selectedInfo={calendarInfo}
          onSuccess={refreshCalendar}
        />
      )}

      {appointmentOpen && <AppointmentInfoModal />}
      {confirmCancelOpen && (
        <ConfirmCancellationModal onSuccess={refreshCalendar} />
      )}

      <h1>Dashboard</h1>

      <Box>
        <Group justify="space-between" mb="lg">
          <Text fw={600} c="dimmed">
            {currentTitle}
          </Text>

          <SegmentedControl
            value={view}
            onChange={(value) => {
              setView(value);
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
          editable
          nowIndicator
          headerToolbar={false}
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          allDaySlot={false}
          selectable
          select={handleDateSelect}
          events="/api/appointments"
          eventDrop={async (info) => {
            const { id } = info.event;
            const start = info.event.start;
            const end = info.event.end;

            try {
              await rescheduleAppointment(id, start, end); // call your API
              info.event.setProp("title", info.event.title); // keep title same
              // optionally show success message
            } catch (err) {
              console.error(err);
              info.revert(); // rollback if API fails
            }
          }}
          eventClick={handleEventClick}
          datesSet={(arg) => setCurrentTitle(arg.view.title)}
        />
      </Box>
    </Container>
  );
}
