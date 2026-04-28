"use client";

import {
  Badge,
  Box,
  Card,
  Center,
  Container,
  Flex,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { APP_TZ } from "@/lib/dateTime";
import { useQuery } from "@tanstack/react-query";
import { getMarkedDates, getStaffAppointments } from "@/lib/api/appointments";
import { useRouter } from "next/navigation";
import { IoLocation, IoPerson, IoTime } from "@/lib/icons";
import { useSession } from "next-auth/react";
import { AppointmentReminderWatcher } from "@/app/components/AppointmentReminderWatcher";
import { LocalNotificationDemo } from "@/app/components/LocalNotificationDemo";
import { requestPermission } from "@/lib/notifications/showNotification";
import { Calendar } from "@mantine/dates";
import dayjs from "dayjs";
import { useStaffUiStore } from "@/stores/store";
import { useAppointmentDetails } from "@/hooks/useAppointmentDetails";
import { WorkSession } from "@/types";
import { formatSeconds, getElapsedSeconds } from "./taskTime";
import { useDocumentVisibility } from "@mantine/hooks";
import Loader from "@/app/components/UI/Loader";

function toAppDateKey(date: Date | string): string {
  const value =
    typeof date === "string"
      ? DateTime.fromISO(date, { zone: APP_TZ })
      : DateTime.fromJSDate(date, { zone: APP_TZ });

  return value.toISODate() ?? "";
}

function toAppMonthKey(date: Date | string): string {
  const value =
    typeof date === "string"
      ? DateTime.fromISO(date, { zone: APP_TZ })
      : DateTime.fromJSDate(date, { zone: APP_TZ });

  return value.startOf("month").toISODate() ?? "";
}

function toCalendarDate(dateKey: string): Date {
  return DateTime.fromISO(dateKey, { zone: APP_TZ }).startOf("day").toJSDate();
}

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "LATE";
  job: {
    title: string;
    client: {
      firstName: string;
      lastName: string;
    };
    address: {
      street1: string;
      city: string;
      province: string;
    };
  };
  notes?: { id: string; content: string }[];
};

function CurrentlyWorkingCard({
  appointment,
  myStaffId,
  nowMs,
  onOpen,
}: {
  appointment: Appointment;
  myStaffId?: string;
  nowMs: number;
  onOpen: (appointmentId: string) => void;
}) {
  const {
    data: appointmentData,
    isLoading,
    error,
  } = useAppointmentDetails(appointment.id);

  if (error || isLoading || !appointmentData || !myStaffId) {
    return null;
  }

  const allSessions = appointmentData.workSessions ?? [];
  const mySessions = allSessions.filter(
    (session: WorkSession & { staffId?: string }) =>
      session.staffId === myStaffId,
  );
  const isRunning = mySessions.some((session: WorkSession) => !session.endedAt);

  if (!isRunning) {
    return null;
  }

  const elapsedSeconds = getElapsedSeconds(mySessions, nowMs);
  const scheduledSeconds = Math.max(
    0,
    Math.floor(
      (new Date(appointment.endTime).getTime() -
        new Date(appointment.startTime).getTime()) /
        1000,
    ),
  );
  const remainingSeconds = Math.max(0, scheduledSeconds - elapsedSeconds);

  return (
    <Paper
      p="md"
      className="staff-app-surface staff-app-surface--hero"
      onClick={() => onOpen(appointment.id)}
    >
      <Group justify="space-between" align="start" gap="md" wrap="nowrap">
        <Group gap="sm" align="start" wrap="nowrap">
          <ThemeIcon
            size={44}
            radius="xl"
            color="lime"
            variant="light"
            className="staff-currently-working-card__icon"
          >
            <Loader />
          </ThemeIcon>

          <Stack gap={4}>
            <Group gap="xs">
              <Text
                fw={800}
                size="xs"
                tt="uppercase"
                className="staff-currently-working-card__eyebrow"
              >
                Currently Running
              </Text>
              <Badge
                size="sm"
                radius="xl"
                color="lime"
                variant="light"
                className="staff-currently-working-card__badge"
              >
                Live
              </Badge>
            </Group>
            <Text
              size="lg"
              fw={700}
              className="staff-currently-working-card__title"
            >
              {appointment.job.title}
            </Text>
            <Text
              size="sm"
              fw={700}
              className="staff-currently-working-card__title"
            >
              {formatSeconds(remainingSeconds)} remaining
            </Text>
          </Stack>
        </Group>

        <Text size="sm" fw={700} className="staff-currently-working-card__cta">
          Open
        </Text>
      </Group>
    </Paper>
  );
}

const Page = () => {
  const { data: session } = useSession();
  const staffId = session?.user?.id;
  const router = useRouter();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [value, setValue] = useState<string>("upcoming");
  const today = DateTime.now().setZone(APP_TZ).toISODate()!;
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [calendarMonth, setCalendarMonth] = useState<string>(today);
  const dayRange = useMemo(() => {
    const baseDate = selectedDate ?? today;
    const base = baseDate
      ? DateTime.fromISO(baseDate, { zone: APP_TZ })
      : DateTime.now().setZone(APP_TZ);

    return {
      start: base.startOf("day").toUTC().toISO()!,
      end: base.endOf("day").toUTC().toISO()!,
    };
  }, [selectedDate, today]);
  const currentDayRange = useMemo(() => {
    const base = DateTime.now().setZone(APP_TZ);

    return {
      start: base.startOf("day").toUTC().toISO()!,
      end: base.endOf("day").toUTC().toISO()!,
    };
  }, []);
  const markerRange = useMemo(() => {
    const base = DateTime.fromISO(calendarMonth, { zone: APP_TZ });
    return {
      start: base.startOf("month").toUTC().toISO()!,
      end: base.endOf("month").toUTC().toISO()!,
    };
  }, [calendarMonth]);
  const visibility = useDocumentVisibility();
  const setTitle = useStaffUiStore((s) => s.setTitle);
  const setBack = useStaffUiStore((s) => s.setBack);
  const setRefreshing = useStaffUiStore((s) => s.setRefreshing);
  const setOnRefresh = useStaffUiStore((s) => s.setOnRefresh);
  const resetTopBar = useStaffUiStore((s) => s.resetTopBar);
  const { data, refetch, isLoading, isFetching, error } = useQuery({
    queryKey: ["staff-tasks", staffId, dayRange.start, dayRange.end],
    queryFn: () =>
      getStaffAppointments({
        staffId: staffId!,
        start: dayRange.start,
        end: dayRange.end,
      }),
    enabled: !!staffId,
    refetchInterval: visibility === "visible" ? 5000 : false,
    refetchOnWindowFocus: true,
  });
  const { data: currentDayData } = useQuery({
    queryKey: [
      "staff-current-day-tasks",
      staffId,
      currentDayRange.start,
      currentDayRange.end,
    ],
    queryFn: () =>
      getStaffAppointments({
        staffId: staffId!,
        start: currentDayRange.start,
        end: currentDayRange.end,
      }),
    enabled: !!staffId && selectedDate !== today,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
  const { data: markerData } = useQuery({
    queryKey: [
      "staff-task-markers",
      staffId,
      markerRange.start,
      markerRange.end,
    ],
    queryFn: () =>
      getMarkedDates({
        staffId: staffId!,
        start: markerRange.start,
        end: markerRange.end,
      }),
    enabled: !!staffId,
    refetchInterval: visibility === "visible" ? 10000 : false,
    refetchOnWindowFocus: true,
  });

  const markedDates = useMemo(
    () => new Set(markerData?.dates ?? []),
    [markerData],
  );

  useEffect(() => {
    setTitle("Tasks");
    setBack(false);

    return () => {
      resetTopBar();
    };
  }, [setTitle, setBack, resetTopBar]);

  useEffect(() => {
    setRefreshing(isFetching);
  }, [isFetching, setRefreshing]);

  useEffect(() => {
    setOnRefresh(refetch);

    return () => {
      setOnRefresh(null);
      setRefreshing(false);
    };
  }, [refetch, setOnRefresh, setRefreshing]);

  useEffect(() => {
    requestPermission();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const tasks: Appointment[] = useMemo(
    () => (Array.isArray(data) ? data : []),
    [data],
  );

  const effectiveSelectedDate = useMemo(() => {
    if (selectedDate) {
      return selectedDate;
    }

    if (tasks.length) {
      return (
        DateTime.fromISO(tasks[0].startTime).setZone(APP_TZ).toISODate() ??
        today
      );
    }

    return today;
  }, [selectedDate, tasks, today]);

  const currentDayTasks: Appointment[] = useMemo(
    () =>
      effectiveSelectedDate === today
        ? tasks
        : Array.isArray(currentDayData)
          ? currentDayData
          : [],
    [currentDayData, effectiveSelectedDate, tasks, today],
  );

  const handleSelect = (date: string) => {
    setSelectedDate(date);
    setCalendarMonth(date);
  };

  const dayTasks = tasks.filter((task) => {
    const taskDate = DateTime.fromISO(task.startTime).setZone(APP_TZ);
    return taskDate.hasSame(
      DateTime.fromISO(effectiveSelectedDate).setZone(APP_TZ),
      "day",
    );
  });

  const upcomingCount = dayTasks.filter(
    (t) => t.status === "SCHEDULED" || t.status === "LATE",
  ).length;

  const filteredTasks = dayTasks.filter((task) => {
    if (value === "completed") return task.status === "COMPLETED";
    if (value === "cancelled") return task.status === "CANCELLED";
    return task.status === "SCHEDULED" || task.status === "LATE";
  });

  const selectedDateLabel = DateTime.fromISO(effectiveSelectedDate, {
    zone: APP_TZ,
  }).toFormat("cccc, LLL d");
  const selectedMonthLabel = DateTime.fromISO(calendarMonth, {
    zone: APP_TZ,
  }).toFormat("LLLL yyyy");

  if (error) {
    return (
      <Container py="md" bg="#f5f6f7" mih="100vh">
        <Text c="red">Failed to load tasks</Text>
      </Container>
    );
  }

  return (
    <Container p={0} className="staff-app-page">
      <AppointmentReminderWatcher appointments={tasks} />
      <LocalNotificationDemo />
      <Stack gap="lg" p="md">
        {currentDayTasks.map(
          (t) =>
            t.status === "SCHEDULED" && (
              <CurrentlyWorkingCard
                key={t.id}
                appointment={t}
                myStaffId={staffId}
                nowMs={nowMs}
                onOpen={(appointmentId) =>
                  router.push(`/staff/tasks/${appointmentId}`)
                }
              />
            ),
        )}
        <Card
          radius="lg"
          withBorder
          p="lg"
          className="staff-app-surface staff-app-surface--hero"
        >
          <Stack gap="md">
            <Group justify="space-between" align="end" gap="md">
              <Box>
                <Title order={3}>Your Tasks</Title>
                <Text size="sm" c="dimmed" mt={4}>
                  {selectedDateLabel}
                </Text>
              </Box>

              <Group gap="xs" wrap="wrap">
                <Badge variant="light" color="lime">
                  {upcomingCount} active
                </Badge>
                <Badge variant="light" color="gray">
                  {dayTasks.length} total
                </Badge>
              </Group>
            </Group>

            <SegmentedControl
              value={value}
              color="lime"
              radius="xl"
              onChange={(v) => setValue(v || "upcoming")}
              className="staff-app-segmented"
              data={[
                { value: "upcoming", label: "Upcoming" },
                { value: "cancelled", label: "Cancelled" },
                { value: "completed", label: "Completed" },
              ]}
            />

            <Box>
              <Group justify="space-between" align="center" mb="md">
                <Text size="sm" fw={600}>
                  {selectedMonthLabel}
                </Text>
              </Group>
              <Center>
                <Calendar
                  date={toCalendarDate(calendarMonth)}
                  onDateChange={(date) => setCalendarMonth(toAppMonthKey(date))}
                  onNextMonth={(date) => setCalendarMonth(toAppMonthKey(date))}
                  onPreviousMonth={(date) =>
                    setCalendarMonth(toAppMonthKey(date))
                  }
                  renderDay={(date) => {
                    const hasAppointments = markedDates.has(toAppDateKey(date));
                    return (
                      <Box
                        style={{
                          minWidth: 28,
                          minHeight: 28,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                        }}
                      >
                        <span>{dayjs(date).date()}</span>
                        <Box
                          aria-hidden="true"
                          style={{
                            marginTop: 3,
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            backgroundColor: "var(--mantine-color-lime-6)",
                            opacity: hasAppointments ? 1 : 0,
                          }}
                        />
                      </Box>
                    );
                  }}
                  getDayProps={(date) => {
                    const isoDate = toAppDateKey(date);

                    return {
                      selected: isoDate === effectiveSelectedDate,
                      onClick: () => handleSelect(isoDate),
                    };
                  }}
                />
              </Center>
            </Box>
          </Stack>
        </Card>

        <Stack gap="md">
          {isLoading ? (
            <Card radius="lg" withBorder p="lg" className="staff-app-surface">
              <Flex direction="column" align="center" justify="center" py="md">
                <Loader />
                <Text size="sm" fw={600} mt="sm">
                  Loading tasks...
                </Text>
              </Flex>
            </Card>
          ) : error ? (
            <Card radius="lg" withBorder p="lg" className="staff-app-surface">
              <Text c="red" size="sm">
                We couldn&apos;t load your tasks.
              </Text>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card radius="lg" withBorder p="lg" className="staff-app-surface">
              <Text c="dimmed">
                Nothing is waiting for you in this section.
              </Text>
            </Card>
          ) : (
            <>
              {filteredTasks.map((task) => {
                const start = DateTime.fromISO(task.startTime).setZone(APP_TZ);
                const end = DateTime.fromISO(task.endTime).setZone(APP_TZ);

                return (
                  <Card
                    key={task.id}
                    withBorder
                    radius="lg"
                    p="lg"
                    className="staff-app-surface"
                    style={{ cursor: "pointer" }}
                    onClick={() => router.push(`/staff/tasks/${task.id}`)}
                  >
                    <Group justify="space-between" align="start" mb="sm">
                      <Box style={{ flex: 1 }}>
                        <Text fw={700} size="md">
                          {task.job.title}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {start.toFormat("cccc, LLL d")}
                        </Text>
                      </Box>

                      <Badge
                        radius="lg"
                        color={
                          task.status === "COMPLETED"
                            ? "lime"
                            : task.status === "CANCELLED"
                              ? "red"
                              : "lime"
                        }
                        variant="light"
                      >
                        {task.status}
                      </Badge>
                    </Group>

                    <Stack gap="xs">
                      <Group gap="xs" wrap="nowrap">
                        <ThemeIcon radius="lg" variant="light" color="lime">
                          <IoTime size={14} />
                        </ThemeIcon>
                        <Text size="sm">
                          {start.toFormat("h:mm a")} - {end.toFormat("h:mm a")}
                        </Text>
                      </Group>

                      <Group gap="xs" wrap="nowrap">
                        <ThemeIcon radius="lg" variant="light" color="gray">
                          <IoPerson size={14} />
                        </ThemeIcon>
                        <Text size="sm">
                          {task.job.client.firstName} {task.job.client.lastName}
                        </Text>
                      </Group>

                      <Group gap="xs" wrap="nowrap" align="start">
                        <ThemeIcon radius="lg" variant="light" color="lime">
                          <IoLocation size={14} />
                        </ThemeIcon>
                        <Text size="sm" c="dimmed">
                          {task.job.address.street1}, {task.job.address.city},{" "}
                          {task.job.address.province}
                        </Text>
                      </Group>
                    </Stack>
                  </Card>
                );
              })}
            </>
          )}
        </Stack>
      </Stack>
    </Container>
  );
};

export default Page;
