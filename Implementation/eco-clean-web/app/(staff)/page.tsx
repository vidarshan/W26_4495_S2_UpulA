"use client";
import {
  ActionIcon,
  Box,
  Card,
  Chip,
  Container,
  Drawer,
  Flex,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import React, { useMemo, useState } from "react";
import BottomBar from "../components/pwa/BottomBar";
import { DateTime } from "luxon";
import { APP_TZ } from "@/lib/dateTime";
import { useQuery } from "@tanstack/react-query";
import { getStaffAppointments } from "@/lib/api/appointments";
import { useRouter } from "next/navigation";
import { IoMenuOutline } from "react-icons/io5";
import { useDisclosure } from "@mantine/hooks";
import TopBar from "../components/pwa/TopBar";

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

function buildDirectionsUrl(address: {
  street1: string;
  street2?: string | null;
  city: string;
  province: string;
  postalCode?: string;
  country?: string;
}) {
  const fullAddress = [
    address.street1,
    address.street2,
    address.city,
    address.province,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
}

const page = () => {
  const staffId = "217bc07d-cf36-4294-b64f-0c625e43f711";
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();

  const [value, setValue] = useState<string | null>("first");
  const handleChipClick = (event: React.MouseEvent<HTMLInputElement>) => {
    if (event.currentTarget.value === value) {
      setValue(null);
    }
  };
  const range = useMemo(() => {
    const now = DateTime.now().setZone(APP_TZ);
    return {
      start: now.startOf("week").toUTC().toISO()!,
      end: now.endOf("week").toUTC().toISO()!,
    };
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["staff-tasks", staffId, range.start, range.end],
    queryFn: () =>
      getStaffAppointments({
        staffId,
        start: range.start,
        end: range.end,
      }),
    enabled: !!staffId,
  });

  const tasks: Appointment[] = data ?? [];
  if (isLoading) {
    return (
      <Container py="md">
        <Loader />
      </Container>
    );
  }

  if (error) {
    return (
      <Container py="md">
        <Text c="red">Failed to load tasks</Text>
      </Container>
    );
  }
  console.log(tasks);
  return (
    <Container p={0}>
      <Drawer size="xs" opened={opened} onClose={close} title="Eco Clean">
        <Text>dfdsff</Text>
      </Drawer>
      <TopBar back={false} onClick={open} title="Eco Clean" />
      <SimpleGrid px="xs" py="xs">
        <Chip.Group multiple={false} value={value} onChange={setValue}>
          <Group>
            <Chip radius="md" value="first" onClick={handleChipClick}>
              Upcoming
            </Chip>
            <Chip radius="md" value="second" onClick={handleChipClick}>
              Completed
            </Chip>
          </Group>
        </Chip.Group>
      </SimpleGrid>
      <SimpleGrid px="xs" cols={1}>
        {tasks.length === 0 ? (
          <Text c="dimmed">No tasks assigned for this period.</Text>
        ) : (
          tasks.map((task) => {
            const start = DateTime.fromISO(task.startTime).setZone(APP_TZ);
            const end = DateTime.fromISO(task.endTime).setZone(APP_TZ);

            return (
              <Card
                key={task.id}
                withBorder
                radius="md"
                onClick={() => router.push(`/tasks/${task.id}`)}
              >
                <Stack gap={4}>
                  <Text fw={600}>{task.title}</Text>
                  <Text size="sm">
                    {task.job.client.firstName} {task.job.client.lastName}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {start.toFormat("ccc, LLL d")} • {start.toFormat("h:mm a")}{" "}
                    - {end.toFormat("h:mm a")}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {task.job.address.street1}, {task.job.address.city},{" "}
                    {task.job.address.province}
                  </Text>
                  <Text size="sm">Status: {task.status}</Text>
                </Stack>
              </Card>
            );
          })
        )}
      </SimpleGrid>

      {/* <BottomBar /> */}
    </Container>
  );
};

export default page;
