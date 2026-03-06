"use client";
import TopBar from "@/app/components/pwa/TopBar";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Flex,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useRouter } from "next/navigation";
import React from "react";
import {
  IoCallOutline,
  IoChatbubbleEllipsesOutline,
  IoMapOutline,
  IoPauseOutline,
  IoPersonOutline,
  IoPlay,
  IoPlayOutline,
  IoTextSharp,
} from "react-icons/io5";

const page = () => {
  const router = useRouter();

  let appt = {
    id: "8ffe23ee-059b-4353-b5e9-df7ede4c50e2",
    startTime: "2026-03-03T18:30:00.000Z",
    endTime: "2026-03-03T22:30:00.000Z",
    status: "SCHEDULED",
    createdAt: "2026-03-06T00:28:59.077Z",
    completionSent: false,
    reminder1dSent: false,
    reminder5dSent: false,
    jobId: "91cde303-a28e-4c97-bdc7-836dac455500",
    timeSpent: null,
    completedAt: null,
    job: {
      id: "91cde303-a28e-4c97-bdc7-836dac455500",
      title: "fvdfvdf",
      type: "ONE_OFF",
      clientId: "5a4f94a2-31f0-4739-81a7-785b932ea856",
      addressId: "c1862bb0-395f-4bff-b050-c5f8c8f047ac",
      createdAt: "2026-03-06T00:28:59.071Z",
      updatedAt: "2026-03-06T00:28:59.071Z",
      isAnytime: false,
      visitInstructions: null,
      client: {
        id: "5a4f94a2-31f0-4739-81a7-785b932ea856",
        title: "Mr.",
        firstName: "Test Fname",
        lastName: "Test Lname",
        companyName: "",
        email: "test@gmail.com",
        phone: "7786682326",
        preferredContact: "email",
        leadSource: "",
        createdAt: "2026-02-17T00:44:52.131Z",
        updatedAt: "2026-02-26T07:34:02.319Z",
      },
      address: {
        id: "c1862bb0-395f-4bff-b050-c5f8c8f047ac",
        clientId: "5a4f94a2-31f0-4739-81a7-785b932ea856",
        street1: "5017 Chambers St",
        street2: null,
        city: "Vancouver",
        province: "BC",
        postalCode: "V5R 3L8",
        country: "Canada",
        isPrimary: false,
        isBilling: false,
        createdAt: "2026-02-17T00:44:52.140Z",
      },
    },
    staff: [
      {
        id: "217bc07d-cf36-4294-b64f-0c625e43f711",
        name: "Staff",
        email: "staff@gmail.com",
      },
    ],
    images: [],
    notes: [],
  };

  return (
    <Container p={0}>
      <TopBar back={true} onClick={() => router.back()} title="Back" />
      <Paper p="xs" m="sm" withBorder>
        <Flex mb="sm" justify="space-between">
          <Text fw={600}>{appt.job.title}</Text>
          <Badge>{appt.job.type === "ONE_OFF" ? "One Off" : "Recurring"}</Badge>
        </Flex>
        <Title ta="center" order={1}>
          00:00:00
        </Title>
        <Divider />
        <Title ta="center" order={1}>
          02:00:00
        </Title>
        <Stack gap={6} mt="sm">
          <Text size="xs">Start {appt.startTime}</Text>
          <Text size="xs">End {appt.endTime}</Text>
        </Stack>
      </Paper>

      <SimpleGrid m="sm" cols={2}>
        <Button leftSection={<IoPlayOutline />} radius="xl" fullWidth>
          Start Job
        </Button>
        <Button leftSection={<IoPauseOutline />} radius="xl" fullWidth>
          Pause Job
        </Button>
      </SimpleGrid>
      <Divider label="Client Details" />
      <Paper m="sm" p="xs" withBorder>
        <Text fw={500}>
          Name: {appt.job.client.title}
          {appt.job.client.firstName} {appt.job.client.lastName}
        </Text>
        {/* <Text>
          {appt.job.client.phone} {appt.job.client.email}
        </Text> */}
        <Text>{appt.job.client.companyName}</Text>

        <Group mt="sm" justify="space-between" gap={8}>
          <Button radius="xl" size="xs" leftSection={<IoCallOutline />}>
            Call
          </Button>
          <Button
            radius="xl"
            size="xs"
            color="blue"
            leftSection={<IoChatbubbleEllipsesOutline />}
          >
            Message
          </Button>
        </Group>
      </Paper>
      <Divider label="Visit Instructions" />
      <Paper m="sm" p="xs" withBorder>
        dd
      </Paper>

      <Divider label="Directions" />
      <Paper m="sm" p="xs" withBorder>
        <Group justify="space-between">
          <Box>
            <Text size="xs" fw={500}>
              {appt.job.address.street1}
            </Text>
            <Text size="xs" fw={500}>
              {appt.job.address.street2}
            </Text>

            <Text size="xs" fw={500}>
              {appt.job.address.city}
            </Text>
            <Text size="xs" fw={500}>
              {appt.job.address.province}
            </Text>
            <Text size="xs" fw={500}>
              {appt.job.address.postalCode}
            </Text>
          </Box>
          <Button
            leftSection={<IoMapOutline />}
            radius="xl"
            color="green"
            size="xs"
          >
            Get Directions
          </Button>
        </Group>
      </Paper>
    </Container>
  );
};

export default page;
