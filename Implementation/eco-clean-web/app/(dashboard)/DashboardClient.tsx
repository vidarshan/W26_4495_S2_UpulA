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
import interactionPlugin, {
  EventResizeDoneArg,
} from "@fullcalendar/interaction";
import { IoArrowBackOutline, IoArrowForwardOutline } from "react-icons/io5";
import { useEffect, useRef, useState } from "react";
import { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import NewJobModal from "../components/popups/JobModal";
import AppointmentInfoModal from "../components/popups/AppointmentInfoModal";
import ConfirmCancellationModal from "../components/popups/ConfirmCancellationModal";
import { useCalendarStore, useDashboardUI } from "@/stores/store";

import { rescheduleAppointment } from "@/lib/api/appointments";
import { APP_TZ } from "@/lib/dateTime";
import luxonPlugin from "@fullcalendar/luxon3";
import { useQueryClient } from "@tanstack/react-query";

export default function DashboardClient() {
  const qc = useQueryClient();

  const calendarRef = useRef<FullCalendar | null>(null);

  const {
    newJobOpen,
    closeNewJob,
    openAppointment,
    appointmentOpen,
    confirmCancelOpen,
    openNewJobWithSelection,
    selectedInfo,
  } = useDashboardUI();

  const [view, setView] = useState("week");
  const [currentTitle, setCurrentTitle] = useState("");

  const { setTriggerRefresh } = useCalendarStore();

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    openNewJobWithSelection({
      start: selectInfo.start,
      end: selectInfo.end,
      startStr: selectInfo.startStr,
      endStr: selectInfo.endStr,
      allDay: selectInfo.allDay,
    });
  };

  const handleDateResize = async (info: EventResizeDoneArg) => {
    const { id } = info.event;
    const start = info.event.start;
    const end = info.event.end;

    if (!start || !end) {
      info.revert();
      return;
    }

    try {
      const updated = await rescheduleAppointment(info.event.id, start, end);
      info.view.calendar.refetchEvents();
      qc.setQueryData(["appointment", id], updated);
    } catch (err) {
      console.error(err);
      info.revert();
    }
  };

  const handleDateDrop = async (info: EventDropArg) => {
    const { id } = info.event;
    const start = info.event.start;

    if (!start) {
      info.revert();
      return;
    }

    const prevStart = info.oldEvent.start;
    const prevEnd = info.oldEvent.end;

    // compute duration from old event (fallback 30 mins)
    const durationMs =
      prevStart && prevEnd
        ? prevEnd.getTime() - prevStart.getTime()
        : 30 * 60 * 1000;

    const end = info.event.end ?? new Date(start.getTime() + durationMs);

    try {
      const updated = await rescheduleAppointment(id, start, end);

      info.view.calendar.refetchEvents();
      qc.setQueryData(["appointment", id], updated);
    } catch (err) {
      console.error(err);
      info.revert();
    }
  };

  const handleEventClick = (info: EventClickArg) => {
    openAppointment(info.event.extendedProps.jobId, info.event.id);
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
      <NewJobModal
        opened={newJobOpen}
        onClose={closeNewJob}
        selectedInfo={selectedInfo}
        onSuccess={refreshCalendar}
      />

      {appointmentOpen && <AppointmentInfoModal onSuccess={refreshCalendar} />}
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
        {}
        <FullCalendar
          height="75vh"
          editable
          timeZone={APP_TZ}
          nowIndicator
          headerToolbar={false}
          ref={calendarRef}
          plugins={[
            timeGridPlugin,
            dayGridPlugin,
            interactionPlugin,
            luxonPlugin,
          ]}
          initialView="timeGridWeek"
          allDaySlot={false}
          selectable
          select={handleDateSelect}
          events="/api/appointments"
          eventDrop={handleDateDrop}
          eventResize={handleDateResize}
          eventClick={handleEventClick}
          datesSet={(arg) => setCurrentTitle(arg.view.title)}
        />
      </Box>
    </Container>
  );
}
