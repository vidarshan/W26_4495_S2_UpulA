"use client";

import {
  Badge,
  Box,
  Card,
  Center,
  Container,
  Flex,
  Group,
  Indicator,
  Loader,
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
import {
  IoLocationOutline,
  IoPersonOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { useSession } from "next-auth/react";
import { AppointmentReminderWatcher } from "@/app/components/AppointmentReminderWatcher";
import { LocalNotificationDemo } from "@/app/components/LocalNotificationDemo";
import { requestPermission } from "@/lib/notifications/showNotification";
import { Calendar } from "@mantine/dates";
import dayjs from "dayjs";
import { useStaffUiStore } from "@/stores/store";

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

const Page = () => {
  const { data: session } = useSession();
  const staffId = session?.user?.id;
  const router = useRouter();

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
  const markerRange = useMemo(() => {
    const base = DateTime.fromISO(calendarMonth, { zone: APP_TZ });
    return {
      start: base.startOf("month").toUTC().toISO()!,
      end: base.endOf("month").toUTC().toISO()!,
    };
  }, [calendarMonth]);

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
  });

  const markedDates = useMemo(
    () => new Set(markerData?.dates ?? []),
    [markerData],
  );

  useEffect(() => {
    setTitle("Eco Clean");
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
              radius="lg"
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
                  date={calendarMonth}
                  onDateChange={(date) => setCalendarMonth(date)}
                  onNextMonth={(date) => setCalendarMonth(date)}
                  onPreviousMonth={(date) => setCalendarMonth(date)}
                  renderDay={(date) => {
                    const hasAppointments = markedDates.has(date);
                    return (
                      <Indicator
                        size={4}
                        color="lime"
                        position="bottom-center"
                        disabled={!hasAppointments}
                      >
                        {dayjs(date).date()}
                      </Indicator>
                    );
                  }}
                  getDayProps={(date) => {
                    const isoDate = DateTime.fromISO(date)
                      .setZone(APP_TZ)
                      .toISODate();

                    return {
                      selected: isoDate === effectiveSelectedDate,
                      onClick: () => handleSelect(date),
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
                <Loader size="sm" color="lime" />
                <Text size="sm" fw={600} mt="sm">
                  Loading tasks...
                </Text>
              </Flex>
            </Card>
          ) : error ? (
            <Card radius="lg" withBorder p="lg" className="staff-app-surface">
              <Text c="red" size="sm">
                Failed to load tasks
              </Text>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card radius="lg" withBorder p="lg" className="staff-app-surface">
              <Text c="dimmed">No tasks found for this section.</Text>
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
                          <IoTimeOutline size={14} />
                        </ThemeIcon>
                        <Text size="sm">
                          {start.toFormat("h:mm a")} - {end.toFormat("h:mm a")}
                        </Text>
                      </Group>

                      <Group gap="xs" wrap="nowrap">
                        <ThemeIcon radius="lg" variant="light" color="gray">
                          <IoPersonOutline size={14} />
                        </ThemeIcon>
                        <Text size="sm">
                          {task.job.client.firstName} {task.job.client.lastName}
                        </Text>
                      </Group>

                      <Group gap="xs" wrap="nowrap" align="start">
                        <ThemeIcon radius="lg" variant="light" color="lime">
                          <IoLocationOutline size={14} />
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
