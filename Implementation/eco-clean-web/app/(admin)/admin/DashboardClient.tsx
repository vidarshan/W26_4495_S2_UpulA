"use client";

import {
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Flex,
  Group,
  LoadingOverlay,
  Paper,
  SegmentedControl,
  Select,
  Text,
  TextInput,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  EventInput,
  EventSourceFuncArg,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, {
  EventResizeDoneArg,
} from "@fullcalendar/interaction";
import luxonPlugin from "@fullcalendar/luxon3";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IoArrowBackOutline,
  IoArrowForwardOutline,
  IoPersonOutline,
  IoRefreshSharp,
  IoSearchSharp,
  IoToggleOutline,
} from "react-icons/io5";
import AppointmentInfoModal from "../../components/popups/AppointmentInfoModal";
import ConfirmCancellationModal from "../../components/popups/ConfirmCancellationModal";
import NewJobModal from "../../components/popups/JobModal";
import { Staff } from "@/app/components/tables/ClientTable";
import { useStaff } from "@/hooks/useStaff";
import { rescheduleAppointment } from "@/lib/api/appointments";
import { APP_TZ } from "@/lib/dateTime";
import { useCalendarStore, useDashboardUI } from "@/stores/store";

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

  const { setTriggerRefresh } = useCalendarStore();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [assignee, setAssignee] = useState<string | null>(null);
  const [debounced] = useDebouncedValue(search, 200);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [view, setView] = useState("week");
  const [currentTitle, setCurrentTitle] = useState("");

  const STATUS_COLORS = {
    SCHEDULED: "#22c55e",
    COMPLETED: "#3b82f6",
    CANCELLED: "#ef4444",
    LATE: "#f59e0b",
  };

  const STATUS_LABELS = {
    SCHEDULED: "Scheduled",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    LATE: "Late",
  };

  const { data: staffData } = useStaff({
    q: "",
    page: 1,
    limit: 10000,
    sort: "newest",
    paginate: true,
  });

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
      const updated = await rescheduleAppointment(id, start, end);
      info.view.calendar.refetchEvents();
      qc.setQueryData(["appointment", id], updated);

      notifications.show({
        title: "Success",
        message: "Appointment updated",
        color: "green",
      });
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: "Appointment update failed",
        color: "red",
      });
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

    const durationMs =
      prevStart && prevEnd
        ? prevEnd.getTime() - prevStart.getTime()
        : 30 * 60 * 1000;

    const end = info.event.end ?? new Date(start.getTime() + durationMs);

    try {
      const updated = await rescheduleAppointment(id, start, end);
      info.view.calendar.refetchEvents();
      qc.setQueryData(["appointment", id], updated);

      notifications.show({
        title: "Success",
        message: "Moved the appointment",
        color: "green",
      });
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: "Appointment update failed",
        color: "red",
      });
      info.revert();
    }
  };

  const handleEventClick = (info: EventClickArg) => {
    openAppointment(info.event.extendedProps.jobId, info.event.id);
  };

  const refreshCalendar = () => {
    calendarRef.current?.getApi().refetchEvents();
  };

  const loadEvents = useCallback(
    (
      fetchInfo: EventSourceFuncArg,
      successCallback: (eventInputs: EventInput[]) => void,
      failureCallback: (error: Error) => void,
    ): void => {
      void (async () => {
        try {
          const params = new URLSearchParams({
            start: fetchInfo.startStr,
            end: fetchInfo.endStr,
            view: "calendar",
          });

          if (debounced.trim()) params.set("search", debounced.trim());
          if (status) params.set("status", status);
          if (assignee) params.set("staffId", assignee);

          const res = await fetch(`/api/appointments?${params.toString()}`);
          if (!res.ok) throw new Error("Failed to fetch appointments");

          const data: EventInput[] = await res.json();
          successCallback(data);
        } catch (error: unknown) {
          console.error(error);
          failureCallback(
            error instanceof Error ? error : new Error("Unknown error"),
          );
        }
      })();
    },
    [debounced, status, assignee],
  );

  useEffect(() => {
    setTriggerRefresh(() => () => {
      calendarRef.current?.getApi().refetchEvents();
    });
  }, [setTriggerRefresh]);

  const calendarKey = useMemo(
    () => `${debounced}|${status ?? ""}|${assignee ?? ""}`,
    [debounced, status, assignee],
  );

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
        <Paper mb="xs" p="md" radius="lg" withBorder>
          <Flex
            justify="space-between"
            align={{ base: "stretch", md: "center" }}
            direction={{ base: "column", md: "row" }}
            gap="md"
            mb="md"
          >
            <Box>
              <Text fw={700} size="lg">
                {currentTitle}
              </Text>
              <Text size="sm" c="dimmed">
                Manage appointments and switch calendar views
              </Text>
            </Box>

            <SegmentedControl
              value={view}
              radius="xl"
              h="fit-content"
              onChange={(value) => {
                setView(value);
                const calendarApi = calendarRef.current?.getApi();

                if (value === "month") calendarApi?.changeView("dayGridMonth");
                if (value === "week") calendarApi?.changeView("timeGridWeek");
                if (value === "day") calendarApi?.changeView("timeGridDay");
              }}
              data={[
                { label: "Month", value: "month" },
                { label: "Week", value: "week" },
                { label: "Day", value: "day" },
              ]}
            />

            <Button.Group>
              <Button
                variant="default"
                radius="xl"
                leftSection={<IoArrowBackOutline />}
                onClick={() => calendarRef.current?.getApi().prev()}
              >
                Prev
              </Button>
              <Button
                variant="default"
                radius="xl"
                onClick={() => calendarRef.current?.getApi().today()}
              >
                Today
              </Button>
              <Button
                variant="default"
                radius="xl"
                rightSection={<IoArrowForwardOutline />}
                onClick={() => calendarRef.current?.getApi().next()}
              >
                Next
              </Button>
            </Button.Group>
          </Flex>

          <Divider mb="md" />

          <Flex
            justify="space-between"
            align={{ base: "stretch", md: "end" }}
            direction={{ base: "column", lg: "row" }}
            gap="md"
          >
            <Flex gap="sm" wrap="wrap" align="end" style={{ flex: 1 }}>
              <TextInput
                label="Search"
                placeholder="Search appointment, client, or job"
                size="sm"
                leftSection={<IoSearchSharp />}
                style={{ minWidth: 240, flex: 1 }}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />

              <Select
                size="sm"
                label="Status"
                leftSection={<IoToggleOutline />}
                placeholder="All statuses"
                data={[
                  { label: "Scheduled", value: "SCHEDULED" },
                  { label: "Completed", value: "COMPLETED" },
                  { label: "Cancelled", value: "CANCELLED" },
                  { label: "Late", value: "LATE" },
                ]}
                clearable
                value={status}
                onChange={setStatus}
                style={{ minWidth: 170 }}
              />

              <Select
                size="sm"
                label="Assignee"
                leftSection={<IoPersonOutline />}
                placeholder="All staff"
                data={
                  staffData?.data?.map((s: Staff) => ({
                    value: s.id,
                    label: s.name,
                  })) || []
                }
                clearable
                searchable
                value={assignee}
                onChange={setAssignee}
                style={{ minWidth: 180 }}
              />
            </Flex>

            <Group justify="flex-end">
              <Button
                size="sm"
                radius="md"
                variant="light"
                leftSection={<IoRefreshSharp />}
                onClick={() => calendarRef.current?.getApi().refetchEvents()}
              >
                Refresh
              </Button>
            </Group>
          </Flex>

          <Group mt="md" gap="lg">
            {Object.entries(STATUS_COLORS).map(([statusKey, color]) => (
              <Group align="center" key={statusKey} gap={6}>
                <Badge radius="sm" color={color} variant="filled">
                  {STATUS_LABELS[statusKey as keyof typeof STATUS_LABELS]}
                </Badge>
              </Group>
            ))}
          </Group>
        </Paper>

        <Box pos="relative">
          {calendarLoading && (
            <LoadingOverlay
              visible={true}
              loaderProps={{ children: "Loading appointments..." }}
            />
          )}

          <FullCalendar
            key={calendarKey}
            ref={calendarRef}
            timeZone={APP_TZ}
            plugins={[
              timeGridPlugin,
              dayGridPlugin,
              interactionPlugin,
              luxonPlugin,
            ]}
            initialView="timeGridWeek"
            headerToolbar={false}
            editable
            selectable
            nowIndicator
            allDaySlot={false}
            eventDisplay="block"
            loading={setCalendarLoading}
            events={loadEvents}
            select={handleDateSelect}
            eventDrop={handleDateDrop}
            eventResize={handleDateResize}
            eventClick={handleEventClick}
            datesSet={(arg) => setCurrentTitle(arg.view.title)}
            eventDidMount={(info) => {
              const colors: Record<
                "SCHEDULED" | "COMPLETED" | "CANCELLED" | "LATE",
                string
              > = {
                SCHEDULED: "#22c55e",
                COMPLETED: "#3b82f6",
                CANCELLED: "#ef4444",
                LATE: "#f59e0b",
              };

              const statusValue = info.event.extendedProps.status as
                | "SCHEDULED"
                | "COMPLETED"
                | "CANCELLED"
                | "LATE"
                | undefined;

              const color = statusValue ? colors[statusValue] : undefined;

              if (color) {
                info.el.style.backgroundColor = color;
                info.el.style.borderColor = color;
              }

              info.el.style.borderRadius = "8px";
              info.el.style.padding = "2px 4px";
            }}
            eventContent={(eventInfo) => {
              const { title } = eventInfo.event;
              const staffNames = eventInfo.event.extendedProps.staffNames;

              return (
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>{title}</div>
                  {staffNames && (
                    <div style={{ opacity: 0.8 }}>{staffNames}</div>
                  )}
                </div>
              );
            }}
          />
        </Box>
      </Box>
    </Container>
  );
}
