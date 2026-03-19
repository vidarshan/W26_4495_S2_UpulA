"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Chip,
  Container,
  Drawer,
  Flex,
  Group,
  Loader,
  NavLink,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import React, { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { APP_TZ } from "@/lib/dateTime";
import { useQuery } from "@tanstack/react-query";
import { getStaffAppointments } from "@/lib/api/appointments";
import { useRouter } from "next/navigation";
import { useDisclosure } from "@mantine/hooks";
import TopBar from "../../../components/pwa/TopBar";
import {
  IoCheckmarkCircleOutline,
  IoLocationOutline,
  IoPersonOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { signOut, useSession } from "next-auth/react";
import { AppointmentReminderWatcher } from "@/app/components/AppointmentReminderWatcher";
import { LocalNotificationDemo } from "@/app/components/LocalNotificationDemo";
import { requestPermission } from "@/lib/notifications/showNotification";
import { MiniCalendar } from "@mantine/dates";
import dayjs from "dayjs";

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
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(
    DateTime.now().setZone(APP_TZ).toISODate(),
  );
  const [value, setValue] = useState<string>("upcoming");

  useEffect(() => {
    requestPermission();
  }, []);

  const range = useMemo(() => {
    const base = selectedDate
      ? DateTime.fromISO(selectedDate, { zone: APP_TZ })
      : DateTime.now().setZone(APP_TZ);

    return {
      start: base.startOf("week").toUTC().toISO()!,
      end: base.endOf("week").toUTC().toISO()!,
    };
  }, [selectedDate]);

  const { data, refetch, isLoading, isFetching, error } = useQuery({
    queryKey: ["staff-tasks", staffId, range.start, range.end],
    queryFn: () =>
      getStaffAppointments({
        staffId: staffId!,
        start: range.start,
        end: range.end,
      }),
    enabled: !!staffId,
  });

  const tasks: Appointment[] = data ?? [];

  const selected = selectedDate
    ? DateTime.fromISO(selectedDate, { zone: APP_TZ })
    : DateTime.now().setZone(APP_TZ);

  const filteredTasks = tasks.filter((task) => {
    const taskDate = DateTime.fromISO(task.startTime).setZone(APP_TZ);
    const isSameDay = taskDate.hasSame(selected, "day");

    if (!isSameDay) return false;

    if (value === "completed") return task.status === "COMPLETED";
    return task.status !== "COMPLETED";
  });

  const upcomingCount = tasks.filter((t) => t.status !== "COMPLETED").length;
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;

  if (error) {
    return (
      <Container py="md" bg="#f5f6f7" mih="100vh">
        <Text c="red">Failed to load tasks</Text>
      </Container>
    );
  }

  return (
    <Container p={0} bg="#f5f6f7" mih="100vh">
      <Drawer size="60%" opened={opened} onClose={close} title="Eco Clean">
        <Button
          radius="lg"
          onClick={() => signOut({ callbackUrl: "/login" })}
          fullWidth
        >
          Logout
        </Button>
      </Drawer>

      <TopBar
        back={false}
        onClick={open}
        title="Eco Clean"
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />
      <AppointmentReminderWatcher appointments={tasks} />
      <LocalNotificationDemo />
      <Stack gap="md" p="md">
        <Card radius="lg" withBorder shadow="xs" p="lg">
          <Group justify="space-between" align="start">
            <Box>
              <Title order={3}>My Tasks</Title>
              <Text size="sm" c="dimmed">
                {selected.toFormat("cccc, LLL d")}
              </Text>
            </Box>

            <ThemeIcon radius="lg" size="lg" variant="light" color="green">
              <IoCheckmarkCircleOutline size={18} />
            </ThemeIcon>
          </Group>

          <Group mt="md" grow>
            <Box>
              <Text size="xs" c="dimmed">
                Upcoming
              </Text>
              <Text fw={700} fz={24}>
                {upcomingCount}
              </Text>
            </Box>

            <Box>
              <Text size="xs" c="dimmed">
                Completed
              </Text>
              <Text fw={700} fz={24}>
                {completedCount}
              </Text>
            </Box>
          </Group>
        </Card>
        <Center>
          <MiniCalendar
            numberOfDays={7}
            value={selectedDate}
            onChange={setSelectedDate}
            getDayProps={(date) => ({
              style: {
                color: [0, 6].includes(dayjs(date).day())
                  ? "var(--mantine-color-red-8)"
                  : undefined,
              },
            })}
          />
        </Center>
        <Group gap="sm">
          <Chip.Group
            multiple={false}
            value={value}
            onChange={(v) => setValue(v || "upcoming")}
          >
            <Group gap="sm">
              <Chip radius="md" size="md" value="upcoming">
                Upcoming
              </Chip>
              <Chip radius="md" size="md" value="completed">
                Completed
              </Chip>
            </Group>
          </Chip.Group>
        </Group>

        <Stack gap="md">
          {isLoading ? (
            <Card radius="lg" withBorder shadow="xs" p="lg">
              <Flex direction="column" align="center" justify="center" py="md">
                <Loader size="sm" />
                <Text size="sm" fw={600} mt="sm">
                  Loading tasks...
                </Text>
              </Flex>
            </Card>
          ) : error ? (
            <Card radius="lg" withBorder shadow="xs" p="lg">
              <Text c="red" size="sm">
                Failed to load tasks
              </Text>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card radius="lg" withBorder shadow="xs" p="lg">
              <Text c="dimmed">No tasks found for this section.</Text>
            </Card>
          ) : (
            filteredTasks.map((task) => {
              const start = DateTime.fromISO(task.startTime).setZone(APP_TZ);
              const end = DateTime.fromISO(task.endTime).setZone(APP_TZ);

              return (
                <Card
                  key={task.id}
                  withBorder
                  radius="lg"
                  shadow="xs"
                  p="lg"
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
                          ? "green"
                          : task.status === "CANCELLED"
                            ? "red"
                            : "blue"
                      }
                      variant="light"
                    >
                      {task.status}
                    </Badge>
                  </Group>

                  <Stack gap="xs">
                    <Group gap="xs" wrap="nowrap">
                      <ThemeIcon radius="lg" variant="light" color="green">
                        <IoTimeOutline size={14} />
                      </ThemeIcon>
                      <Text size="sm">
                        {start.toFormat("h:mm a")} - {end.toFormat("h:mm a")}
                      </Text>
                    </Group>

                    <Group gap="xs" wrap="nowrap">
                      <ThemeIcon radius="lg" variant="light" color="blue">
                        <IoPersonOutline size={14} />
                      </ThemeIcon>
                      <Text size="sm">
                        {task.job.client.firstName} {task.job.client.lastName}
                      </Text>
                    </Group>

                    <Group gap="xs" wrap="nowrap" align="start">
                      <ThemeIcon radius="lg" variant="light" color="teal">
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
            })
          )}
        </Stack>
      </Stack>
    </Container>
  );
};

export default Page;
