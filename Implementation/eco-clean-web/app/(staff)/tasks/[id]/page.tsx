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
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useParams, useRouter } from "next/navigation";
import React from "react";
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

function formatDuration(startIso: string, endIso: string) {
  const start = DateTime.fromISO(startIso);
  const end = DateTime.fromISO(endIso);
  const diff = end.diff(start, ["hours", "minutes"]);

  const hours = Math.floor(diff.hours);
  const minutes = Math.floor(diff.minutes);

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");

  return `${hh}:${mm}:00`;
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

          <Stack gap={0} align="center" my="md">
            <Text fw={800} fz={44} lh={1}>
              00:00:00
            </Text>
            <Text fw={700} fz={34} lh={1.1}>
              {formatDuration(appointment.startTime, appointment.endTime)}
            </Text>
          </Stack>

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
          >
            Start Job
          </Button>

          <Button
            leftSection={<IoPauseOutline />}
            radius="xl"
            size="md"
            color="lime"
            fullWidth
          >
            Pause Job
          </Button>
        </SimpleGrid>

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
