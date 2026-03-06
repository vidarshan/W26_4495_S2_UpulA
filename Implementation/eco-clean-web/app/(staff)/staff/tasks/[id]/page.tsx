"use client";

import TopBar from "@/app/components/pwa/TopBar";
import { useAppointmentDetails } from "@/hooks/useAppointmentDetails";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Group,
  Loader,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { APP_TZ } from "@/lib/dateTime";
import {
  IoArrowBackOutline,
  IoCallOutline,
  IoChatbubbleEllipsesOutline,
  IoMapOutline,
  IoPauseOutline,
  IoPlayOutline,
  IoPersonOutline,
  IoTimeOutline,
  IoDocumentTextOutline,
  IoLocationOutline,
} from "react-icons/io5";
import {
  completeAppointment,
  pauseAppointment,
  startAppointment,
} from "@/lib/api/appointments";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";

function formatAddress(address?: {
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
}) {
  if (!address) return "";

  return [
    address.street1,
    address.street2,
    address.city,
    address.province,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildDirectionsUrl(address?: {
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
}) {
  const fullAddress = formatAddress(address);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
}

function getElapsedSeconds(
  sessions: { startedAt: string; endedAt: string | null }[],
  nowMs: number,
) {
  return sessions.reduce((sum, s) => {
    const startMs = new Date(s.startedAt).getTime();
    const endMs = s.endedAt ? new Date(s.endedAt).getTime() : nowMs;
    return sum + Math.max(0, Math.floor((endMs - startMs) / 1000));
  }, 0);
}

function formatSeconds(total: number) {
  const hrs = String(Math.floor(total / 3600)).padStart(2, "0");
  const mins = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

const Page = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const appointmentId = params?.id;

  const {
    data: appointment,
    isLoading,
    error,
  } = useAppointmentDetails(appointmentId);

  // ✅ ALL HOOKS MUST BE HERE, BEFORE RETURNS
  const [nowMs, setNowMs] = useState(Date.now());
  const qc = useQueryClient();

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const refreshAppointment = (updated: any) => {
    qc.setQueryData(["appointment-details", appointmentId], updated);
    qc.invalidateQueries({ queryKey: ["appointment-details", appointmentId] });
    qc.invalidateQueries({ queryKey: ["staff-tasks"] });
  };

  const startMutation = useMutation({
    mutationFn: () =>
      startAppointment(appointment!.id, appointment?.staff?.[0]?.id),
    onSuccess: (updated) => {
      refreshAppointment(updated);
      notifications.show({
        title: "Started",
        message: "Job started successfully",
        color: "green",
        position: "top-center",
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: "Error",
        message: err?.message || "Failed to start job",
        color: "red",
        position: "top-center",
      });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => pauseAppointment(appointment!.id),
    onSuccess: (updated) => {
      refreshAppointment(updated);
      notifications.show({
        title: "Paused",
        message: "Job paused successfully",
        color: "yellow",
        position: "top-center",
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: "Error",
        message: err?.message || "Failed to pause job",
        color: "red",
        position: "top-center",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeAppointment(appointment!.id),
    onSuccess: (updated) => {
      refreshAppointment(updated);
      notifications.show({
        title: "Completed",
        message: "Job marked as completed",
        color: "green",
        position: "top-center",
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: "Error",
        message: err?.message || "Failed to complete job",
        color: "red",
        position: "top-center",
      });
    },
  });

  // ✅ RETURNS AFTER ALL HOOKS
  if (isLoading) {
    return (
      <Container h="100vh" py="md">
        <Flex direction="column" h="100%" justify="center" align="center">
          <Loader />
          <Text fw={700} mt="sm">
            Fetching...
          </Text>
        </Flex>
      </Container>
    );
  }

  if (error || !appointment) {
    return (
      <Container py="md">
        <Button
          variant="subtle"
          leftSection={<IoArrowBackOutline />}
          onClick={() => router.back()}
        >
          Back
        </Button>
        <Text c="red" mt="md">
          Failed to load appointment details.
        </Text>
      </Container>
    );
  }

  const start = DateTime.fromISO(appointment.startTime).setZone(APP_TZ);
  const end = DateTime.fromISO(appointment.endTime).setZone(APP_TZ);

  const clientName = [
    appointment.job.client.title,
    appointment.job.client.firstName,
    appointment.job.client.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const phone = appointment.job.client.phone;
  const visitInstructions = appointment.job.visitInstructions?.trim();
  const fullAddress = formatAddress(appointment.job.address);

  const sessions = appointment.workSessions ?? [];
  const isRunning = sessions.some((s) => !s.endedAt);
  const elapsedSeconds = getElapsedSeconds(sessions, nowMs);

  const scheduledSeconds = Math.max(
    0,
    Math.floor(
      (new Date(appointment.endTime).getTime() -
        new Date(appointment.startTime).getTime()) /
        1000,
    ),
  );
  const overtimeSeconds = Math.max(0, elapsedSeconds - scheduledSeconds);

  const progressPct =
    scheduledSeconds > 0
      ? Math.min(100, Math.round((elapsedSeconds / scheduledSeconds) * 100))
      : 0;
  const isOvertime = elapsedSeconds > scheduledSeconds;
  return (
    <Container p={0} bg="#f5f6f7" mih="100vh">
      <TopBar back onClick={() => router.back()} title="Back" />

      <Stack gap="md" p="md">
        <Card radius="xl" withBorder shadow="xs" p="lg">
          <Group justify="space-between" align="start" mb="sm">
            <Box>
              <Text fw={700} size="lg">
                {appointment.job.title}
              </Text>
              <Text size="sm" c="dimmed">
                {start.toFormat("cccc, LLL d")}
              </Text>
            </Box>

            <Badge
              size="lg"
              radius="xl"
              color={appointment.job.type === "ONE_OFF" ? "green" : "blue"}
              variant="filled"
            >
              {appointment.job.type === "ONE_OFF" ? "ONE OFF" : "RECURRING"}
            </Badge>
          </Group>

          <Text size="sm" c={isRunning ? "green" : "dimmed"} fw={600}>
            {appointment.status === "COMPLETED"
              ? "Completed"
              : isRunning
                ? "Currently running"
                : "Paused / not started"}
          </Text>

          <Stack gap={0} align="center" my="md">
            <Text fw={800} fz={44} lh={1}>
              {formatSeconds(elapsedSeconds)}
            </Text>

            <Text fw={700} fz={34} lh={1.1}>
              {formatSeconds(scheduledSeconds)}
            </Text>
          </Stack>
          <Progress value={progressPct} />
          <Text mt={6} fw={600} size="xs" c={isOvertime ? "red" : "dimmed"}>
            {isOvertime
              ? `Overtime by ${formatSeconds(overtimeSeconds)}`
              : `${progressPct}% of scheduled duration used`}
          </Text>

          <Flex
            justify="space-between"
            align="center"
            mt="md"
            p="sm"
            style={{
              borderRadius: 12,
              background: "#f8f9fa",
            }}
          >
            <Group gap="xs" align="flex-start">
              <ThemeIcon variant="light" radius="xl" color="green">
                <IoTimeOutline size={16} />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="dimmed">
                  Start
                </Text>
                <Text fw={600} size="sm">
                  {start.toFormat("h:mm a")}
                </Text>
              </Box>
            </Group>

            <Group gap="xs" align="flex-start">
              <ThemeIcon variant="light" radius="xl" color="green">
                <IoTimeOutline size={16} />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="dimmed">
                  End
                </Text>
                <Text fw={600} size="sm">
                  {end.toFormat("h:mm a")}
                </Text>
              </Box>
            </Group>
          </Flex>
        </Card>

        <SimpleGrid cols={2} spacing="md">
          <Button
            leftSection={<IoPlayOutline />}
            radius="xl"
            size="md"
            color="green"
            fullWidth
            disabled={isRunning || appointment.status === "COMPLETED"}
            loading={startMutation.isPending}
            onClick={() => startMutation.mutate()}
          >
            Start Job
          </Button>

          <Button
            leftSection={<IoPauseOutline />}
            radius="xl"
            size="md"
            color="lime"
            fullWidth
            disabled={!isRunning || appointment.status === "COMPLETED"}
            loading={pauseMutation.isPending}
            onClick={() => pauseMutation.mutate()}
          >
            Pause Job
          </Button>
        </SimpleGrid>

        <Button
          mt="sm"
          radius="xl"
          color="blue"
          fullWidth
          disabled={appointment.status === "COMPLETED"}
          loading={completeMutation.isPending}
          onClick={() => completeMutation.mutate()}
        >
          Complete Job
        </Button>

        <Card radius="xl" withBorder shadow="xs" p="lg">
          <Group mb="md" gap="xs">
            <ThemeIcon radius="xl" variant="light" color="blue">
              <IoPersonOutline size={16} />
            </ThemeIcon>
            <Text fw={700}>Client Details</Text>
          </Group>

          <Stack gap={4}>
            <Text fw={600}>{clientName}</Text>

            {appointment.job.client.companyName ? (
              <Text size="sm" c="dimmed">
                {appointment.job.client.companyName}
              </Text>
            ) : null}

            {appointment.job.client.email ? (
              <Text size="sm" c="dimmed">
                {appointment.job.client.email}
              </Text>
            ) : null}
          </Stack>

          <Group mt="md" grow>
            <Button
              component="a"
              radius="xl"
              color="green"
              leftSection={<IoCallOutline />}
              href={phone ? `tel:${phone}` : undefined}
              disabled={!phone}
            >
              Call
            </Button>

            <Button
              component="a"
              radius="xl"
              color="blue"
              leftSection={<IoChatbubbleEllipsesOutline />}
              href={phone ? `sms:${phone}` : undefined}
              disabled={!phone}
            >
              Message
            </Button>
          </Group>
        </Card>

        <Card radius="xl" withBorder shadow="xs" p="lg">
          <Group mb="md" gap="xs">
            <ThemeIcon radius="xl" variant="light" color="grape">
              <IoDocumentTextOutline size={16} />
            </ThemeIcon>
            <Text fw={700}>Visit Instructions</Text>
          </Group>

          <Text size="sm" c={visitInstructions ? "dark" : "dimmed"}>
            {visitInstructions || "No visit instructions provided."}
          </Text>
        </Card>

        <Card radius="xl" withBorder shadow="xs" p="lg">
          <Group mb="md" gap="xs">
            <ThemeIcon radius="xl" variant="light" color="teal">
              <IoLocationOutline size={16} />
            </ThemeIcon>
            <Text fw={700}>Directions</Text>
          </Group>

          <Flex justify="space-between" align="center" gap="md">
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={600}>
                {appointment.job.address.street1}
              </Text>

              {appointment.job.address.street2 ? (
                <Text size="sm">{appointment.job.address.street2}</Text>
              ) : null}

              <Text size="sm">
                {appointment.job.address.city},{" "}
                {appointment.job.address.province}
              </Text>

              <Text size="sm">{appointment.job.address.postalCode}</Text>
            </Box>

            <Button
              leftSection={<IoMapOutline />}
              radius="xl"
              color="green"
              onClick={() => {
                const url = buildDirectionsUrl(appointment.job.address);
                window.open(url, "_blank");
              }}
            >
              Directions
            </Button>
          </Flex>

          <Text size="xs" c="dimmed" mt="sm">
            {fullAddress}
          </Text>
        </Card>
      </Stack>
    </Container>
  );
};

export default Page;
