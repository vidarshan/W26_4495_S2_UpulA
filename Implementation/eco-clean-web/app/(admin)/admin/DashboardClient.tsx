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
  SimpleGrid,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  DateSpanApi,
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  EventInput,
  EventMountArg,
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
  IoArrowBack,
  IoArrowForward,
  IoPerson,
  IoSearch,
  IoToggle,
} from "@/lib/icons";
import AppointmentInfoModal from "../../components/popups/AppointmentInfoModal";
import ConfirmCancellationModal from "../../components/popups/ConfirmCancellationModal";
import JobEditModal from "../../components/popups/JobEditModal";
import NewJobModal from "../../components/popups/JobModal";
import { useStaff } from "@/hooks/useStaff";
import { rescheduleAppointment } from "@/lib/api/appointments";
import { APP_TZ } from "@/lib/dateTime";
import { useCalendarStore, useDashboardUI } from "@/stores/store";
import { Staff } from "@/types";
import { DateTime } from "luxon";

export default function DashboardClient() {
  const isNarrow = useMediaQuery("(max-width: 62em)", false, {
    getInitialValueInEffect: true,
  });
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
  const [weekends, setWeekends] = useState(true);
  const [jumpDate, setJumpDate] = useState<string | null>(null);
  const [visibleEventStats, setVisibleEventStats] = useState({
    total: 0,
    scheduled: 0,
    completed: 0,
    attention: 0,
  });

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

  const STAT_CARDS = [
    {
      key: "total",
      label: "Visible appointments",
      value: visibleEventStats.total,
      tone: "default",
    },
    {
      key: "scheduled",
      label: "Scheduled",
      value: visibleEventStats.scheduled,
      tone: "scheduled",
    },
    {
      key: "completed",
      label: "Completed",
      value: visibleEventStats.completed,
      tone: "completed",
    },
    {
      key: "attention",
      label: "Needs attention",
      value: visibleEventStats.attention,
      tone: "attention",
    },
  ] as const;

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

  const handleSelectAllow = useCallback((span: DateSpanApi) => {
    const start = DateTime.fromJSDate(span.start, {
      zone: "utc",
    }).setZone(APP_TZ);
    const end = DateTime.fromJSDate(span.end, { zone: "utc" })
      .setZone(APP_TZ)
      .minus({ millisecond: 1 });

    return start.hasSame(end, "day");
  }, []);

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

  const changeView = (value: string) => {
    setView(value);
    const calendarApi = calendarRef.current?.getApi();

    if (value === "month") calendarApi?.changeView("dayGridMonth");
    if (value === "week") calendarApi?.changeView("timeGridWeek");
    if (value === "day") calendarApi?.changeView("timeGridDay");
  };

  const jumpToDate = (value: string | null) => {
    if (!value) return;
    calendarRef.current?.getApi().gotoDate(value);
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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      calendarRef.current?.getApi().updateSize();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [view, isNarrow, calendarLoading]);

  const activeFilterCount = [status, assignee, debounced.trim()].filter(
    Boolean,
  ).length;

  const handleEventDidMount = (info: EventMountArg) => {
    const colors: Record<
      "SCHEDULED" | "COMPLETED" | "CANCELLED" | "LATE",
      string
    > = {
      SCHEDULED: "#16a34a",
      COMPLETED: "#2563eb",
      CANCELLED: "#dc2626",
      LATE: "#d97706",
    };

    const statusValue = info.event.extendedProps.status as
      | "SCHEDULED"
      | "COMPLETED"
      | "CANCELLED"
      | "LATE"
      | undefined;

    const color = statusValue ? colors[statusValue] : "#334155";

    info.el.dataset.status = statusValue?.toLowerCase() ?? "default";
    info.el.style.setProperty("--calendar-event-accent", color);
    info.el.style.backgroundColor = `${color}1A`;
    info.el.style.borderColor = `${color}33`;
    info.el.style.color = "#0f172a";
    info.el.style.borderRadius = "14px";
    info.el.style.padding = "0";
    info.el.style.boxShadow = "none";
  };

  return (
    <Container fluid px={isNarrow ? "xs" : "md"}>
      <NewJobModal
        opened={newJobOpen}
        onClose={closeNewJob}
        selectedInfo={selectedInfo}
        onSuccess={refreshCalendar}
      />

      <JobEditModal onSuccess={refreshCalendar} />
      {appointmentOpen && <AppointmentInfoModal onSuccess={refreshCalendar} />}
      {confirmCancelOpen && (
        <ConfirmCancellationModal onSuccess={refreshCalendar} />
      )}

      <Box mb="lg">
        <Text
          size="xs"
          fw={700}
          tt="uppercase"
          c="#64748b"
          style={{ letterSpacing: "0.08em" }}
        >
          Admin overview
        </Text>
        <Text fw={800} size="2rem" lh={1.1} mt={4} c="#0f172a">
          Dashboard
        </Text>
        <Text size="sm" c="#475569" mt={6}>
          Manage appointments, scan workload, and adjust the schedule directly
          from the calendar.
        </Text>
      </Box>

      <Box>
        <Paper
          mb="xs"
          p={{ base: "md", md: "lg" }}
          radius="lg"
          withBorder
          className="calendar-command-center"
        >
          <Flex
            justify="space-between"
            align={{ base: "stretch", md: "center" }}
            direction={{ base: "column", md: "row" }}
            gap="md"
            mb="lg"
          >
            <Box>
              <Text fw={700} size="lg" c="#0f172a">
                Schedule controls
              </Text>
              <Text fw={700} size="lg" mt={6}>
                {currentTitle}
              </Text>
              <Text size="sm" c="dimmed">
                Use this panel to move through the calendar, switch views, and
                refine what is shown.
              </Text>
            </Box>

            <Button.Group>
              <Button
                variant="default"
                radius="xl"
                leftSection={<IoArrowBack />}
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
                rightSection={<IoArrowForward />}
                onClick={() => calendarRef.current?.getApi().next()}
              >
                Next
              </Button>
            </Button.Group>
            <SegmentedControl
              value={view}
              radius="lg"
              size="sm"
              color="lime"
              h="fit-content"
              onChange={changeView}
              fullWidth={isNarrow}
              data={[
                { label: "Month", value: "month" },
                { label: "Week", value: "week" },
                { label: "Day", value: "day" },
              ]}
            />
          </Flex>

          <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md" mb="lg">
            {STAT_CARDS.map((card) => (
              <Paper
                key={card.key}
                radius="lg"
                p="md"
                withBorder
                className={`calendar-stat-card calendar-stat-card--${card.tone}`}
              >
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  {card.label}
                </Text>
                <Text mt={6} fw={800} size="1.9rem">
                  {card.value}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>

          <Divider mb="lg" />

          <Flex
            justify="space-between"
            align={{ base: "stretch", md: "end" }}
            direction={{ base: "column", lg: "row" }}
            gap="lg"
          >
            <Flex gap="sm" wrap="wrap" align="end" style={{ flex: 1 }}>
              <TextInput
                label="Search"
                placeholder="Search appointment, client, or job"
                size="sm"
                leftSection={<IoSearch />}
                style={{ minWidth: isNarrow ? "100%" : 240, flex: 1 }}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />

              <Select
                size="sm"
                label="Status"
                leftSection={<IoToggle />}
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
                style={{ minWidth: isNarrow ? "calc(50% - 8px)" : 170 }}
              />

              <Select
                size="sm"
                label="Assignee"
                leftSection={<IoPerson />}
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
                style={{ minWidth: isNarrow ? "calc(50% - 8px)" : 180 }}
              />

              <DatePickerInput
                label="Jump to date"
                placeholder="Pick a date"
                clearable
                size="sm"
                value={jumpDate}
                onChange={(value) => {
                  setJumpDate(value);
                  jumpToDate(value);
                }}
                style={{ minWidth: isNarrow ? "100%" : 180 }}
              />
            </Flex>

            <Group justify="flex-end" align="end" wrap="wrap">
              <Button
                size="sm"
                variant="filled"
                onClick={() => calendarRef.current?.getApi().refetchEvents()}
              >
                Refresh
              </Button>
            </Group>
          </Flex>
          <Group mt="sm">
            <Switch
              label="Show weekends"
              checked={weekends}
              radius="xl"
              onChange={(event) => setWeekends(event.currentTarget.checked)}
            />
          </Group>
          <Group mt="md" gap="sm">
            <Badge radius="lg" variant="light" color="gray">
              {activeFilterCount === 0
                ? "No active filters"
                : `${activeFilterCount} active filter${
                    activeFilterCount > 1 ? "s" : ""
                  }`}
            </Badge>

            {Object.entries(STATUS_COLORS).map(([statusKey, color]) => (
              <Group align="center" key={statusKey} gap={6}>
                <Badge radius="lg" color={color} variant="light">
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

          <Box className="professional-calendar professional-calendar--admin admin-calendar-shell">
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
              selectMirror
              nowIndicator
              weekends={weekends}
              allDaySlot={false}
              slotEventOverlap={false}
              eventDisplay={view === "month" ? "list-item" : "block"}
              stickyHeaderDates
              expandRows
              displayEventTime={view === "month"}
              slotMinTime="00:00:00"
              slotMaxTime="24:00:00"
              scrollTime="00:00:00"
              slotDuration="00:30:00"
              dayMaxEvents={3}
              businessHours={{
                daysOfWeek: [1, 2, 3, 4, 5, 6],
                startTime: "08:00",
                endTime: "18:00",
              }}
              loading={setCalendarLoading}
              events={loadEvents}
              selectAllow={handleSelectAllow}
              select={handleDateSelect}
              eventDrop={handleDateDrop}
              eventResize={handleDateResize}
              eventClick={handleEventClick}
              datesSet={(arg) => {
                setCurrentTitle(arg.view.title);
                setJumpDate(arg.start.toISOString().slice(0, 10));
              }}
              eventsSet={(events) => {
                const stats = events.reduce(
                  (acc, event) => {
                    const eventStatus = event.extendedProps.status as
                      | "SCHEDULED"
                      | "COMPLETED"
                      | "CANCELLED"
                      | "LATE"
                      | undefined;

                    acc.total += 1;
                    if (eventStatus === "SCHEDULED") acc.scheduled += 1;
                    if (eventStatus === "COMPLETED") acc.completed += 1;
                    if (eventStatus === "CANCELLED" || eventStatus === "LATE") {
                      acc.attention += 1;
                    }

                    return acc;
                  },
                  { total: 0, scheduled: 0, completed: 0, attention: 0 },
                );

                setVisibleEventStats(stats);
              }}
              eventDidMount={handleEventDidMount}
              dayHeaderFormat={
                view === "month"
                  ? { weekday: "short" }
                  : { weekday: "short", month: "short", day: "numeric" }
              }
              eventTimeFormat={{
                hour: "numeric",
                minute: "2-digit",
                meridiem: "short",
              }}
              eventContent={(eventInfo) => {
                const { title } = eventInfo.event;
                const staffNames = eventInfo.event.extendedProps.staffNames;
                const statusValue = eventInfo.event.extendedProps.status as
                  | "SCHEDULED"
                  | "COMPLETED"
                  | "CANCELLED"
                  | "LATE"
                  | undefined;
                const timeLabel = eventInfo.timeText;
                const isMonthView = eventInfo.view.type === "dayGridMonth";

                if (isMonthView) {
                  return (
                    <div
                      className="calendar-event-card calendar-event-card--month"
                      style={{ fontSize: 12 }}
                    >
                      <div className="calendar-event-card__title">
                        {timeLabel ? `${timeLabel} ${title}` : title}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    className="calendar-event-card calendar-event-card--timegrid"
                    style={{ fontSize: 12 }}
                  >
                    <div className="calendar-event-card__title">{title}</div>
                    <div className="calendar-event-card__meta">
                      {timeLabel && (
                        <div className="calendar-event-card__time calendar-event-card__time--inline">
                          {timeLabel}
                        </div>
                      )}
                      {statusValue && (
                        <span className="calendar-event-card__status">
                          {STATUS_LABELS[statusValue]}
                        </span>
                      )}
                    </div>
                    {staffNames && (
                      <div className="calendar-event-card__staff">
                        {staffNames}
                      </div>
                    )}
                  </div>
                );
              }}
            />
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
