"use client";
import { useJob } from "@/hooks/useJob";
import {
  Accordion,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  Paper,
  Select,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import AppointmentCard from "../cards/AppointmentCard";
import ClientCard from "../cards/ClientCard";
import { useForm } from "@mantine/form";
import { IoPersonOutline, IoTextOutline } from "react-icons/io5";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import { getClients } from "@/lib/api/client";
import { Client } from "../tables/ClientTable";

const JobDetails = () => {
  const params = useParams();
  const id = params.id as string;
  console.log(id);
  const { data: job, isLoading } = useJob(id);
  console.log(job);
  const [searchClients, setSearchClients] = useState("");
  const [debouncedSearchClients] = useDebouncedValue(searchClients, 300);
  const [searchAssignees, setSearchAssignees] = useState("");
  const [debouncedSearchAssignees] = useDebouncedValue(searchAssignees, 300);

  const { data: clientsData } = useQuery({
    queryKey: ["clients", debouncedSearchClients],
    queryFn: () => getClients(debouncedSearchClients),
  });

  const form = useForm({
    initialValues: {
      title: "",
      clientId: "",
      staffId: [],
      addressId: "",
      jobType: "ONE_OFF",
      startDate: null,
      isAnytime: false,
      visitInstructions: "",
      recurrence: {
        frequency: "weekly",
        interval: 1,
        endType: "after",
        endsAfter: 6,
        endsUnit: "months",
        endsOn: null,
      },
      lineItems: [
        {
          id: crypto.randomUUID(),
          name: "",
          quantity: 1,
          unitCost: 0,
          unitPrice: 0,
          description: "",
        },
      ],
      notes: "",
    },
    validate: {
      title: (value) =>
        value.trim().length < 3 ? "Title must be at least 3 characters" : null,

      clientId: (value) => (!value ? "Client is required" : null),

      addressId: (value) => (!value ? "Address is required" : null),

      staffId: (value) =>
        !value || value.length === 0
          ? "At least one staff member must be assigned"
          : null,

      startDate: (value) => (!value ? "Start date is required" : null),

      startTime: (value, values) => {
        if (values.isAnytime) return null;
        if (!value) return "Start time is required";
        return null;
      },

      endTime: (value, values) => {
        if (values.isAnytime) return null;
        if (!value) return "End time is required";

        if (!values.startTime) return null;

        const [sh, sm] = values.startTime.split(":").map(Number);
        const [eh, em] = value.split(":").map(Number);

        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;

        if (endMinutes <= startMinutes) {
          return "End time must be after start time";
        }

        return null;
      },

      visitInstructions: (value) =>
        value.length > 500
          ? "Visit instructions cannot exceed 500 characters"
          : null,

      recurrence: {
        interval: (value, values) => {
          if (values.jobType !== "RECURRING") return null;
          if (!value || value < 1) return "Repeat interval must be at least 1";
          return null;
        },

        endsAfter: (value, values) => {
          if (
            values.jobType !== "RECURRING" ||
            values.recurrence.endType !== "after"
          )
            return null;

          if (!value || value < 1) return "Must repeat at least once";

          return null;
        },

        endsOn: (value, values) => {
          if (
            values.jobType !== "RECURRING" ||
            values.recurrence.endType !== "on"
          )
            return null;

          if (!value) return "End date is required";

          if (values.startDate && value <= values.startDate)
            return "End date must be after start date";

          return null;
        },
      },

      lineItems: (value) => {
        if (!value || value.length === 0)
          return "At least one line item is required";
        return null;
      },
    },
  });

  const data = [
    {
      emoji: "🍎",
      value: "Apples",
      description:
        "Crisp and refreshing fruit. Apples are known for their versatility and nutritional benefits. They come in a variety of flavors and are great for snacking, baking, or adding to salads.",
    },
    {
      emoji: "🍌",
      value: "Bananas",
      description:
        "Naturally sweet and potassium-rich fruit. Bananas are a popular choice for their energy-boosting properties and can be enjoyed as a quick snack, added to smoothies, or used in baking.",
    },
    {
      emoji: "🥦",
      value: "Broccoli",
      description: <>dd</>,
    },
  ];

  const items = data.map((item) => (
    <Accordion.Item key={item.value} value={item.value}>
      <Accordion.Control icon={item.emoji}>{item.value}</Accordion.Control>
      <Accordion.Panel>{item.description}</Accordion.Panel>
    </Accordion.Item>
  ));

  if (isLoading) return <div>Loading...</div>;

  const renderAppointments = (
    status: "SCHEDULED" | "CANCELLED" | "COMPLETED",
  ) => {
    return job?.appointments
      .filter((appt) => appt.status === status)
      .map((appt) => <AppointmentCard key={appt.id} appointment={appt} />);
  };

  // "id": "945e8cd3-884a-4247-8528-6179842d45e2",
  // "title": "test 3",
  // "type": "ONE_OFF",
  // "clientId": "5a4f94a2-31f0-4739-81a7-785b932ea856",
  // "addressId": "c1862bb0-395f-4bff-b050-c5f8c8f047ac",
  // "createdAt": "2026-02-17T23:07:19.783Z",
  // "updatedAt": "2026-02-17T23:07:19.783Z",
  // "isAnytime": true,
  // "visitInstructions": "",

  return (
    <Container fluid>
      <Title order={1}>{job?.title}</Title>
      <Paper mt="md" p="sm" withBorder>
        <Group mb="sm" align="center" justify="space-between">
          <Title order={3}>Job Details</Title>
          <Button>Edit Details</Button>
        </Group>

        <Stack gap="xs">
          <TextInput
            leftSection={<IoTextOutline />}
            label="Title"
            placeholder="Enter title"
            {...form.getInputProps("title")}
          />
          <Select
            leftSection={<IoPersonOutline />}
            {...form.getInputProps("clientId")}
            data={
              clientsData?.data.map((client: Client) => ({
                value: client.id,
                label:
                  client.companyName ||
                  `${client.firstName} ${client.lastName}`,
              })) || []
            }
            placeholder="Select Clients"
            onSearchChange={setSearchClients}
            searchable
            label="Client"
          />
          <Checkbox label="Anytime" />
          <Select
            leftSection={<IoPersonOutline />}
            {...form.getInputProps("clientId")}
            data={
              clientsData?.data.map((client: Client) => ({
                value: client.id,
                label:
                  client.companyName ||
                  `${client.firstName} ${client.lastName}`,
              })) || []
            }
            placeholder="Select Address"
            onSearchChange={setSearchClients}
            searchable
            label="Address"
          />
          <Textarea label="Visit Instructions" />
        </Stack>
      </Paper>
      <Paper mt="md" p="sm" withBorder>
        <Group mb="sm" align="center" justify="space-between">
          <Title order={3}>Client Details</Title>
          <Button>Edit Client</Button>
        </Group>

        <ClientCard client={job?.client} address={job?.address} />
      </Paper>
      <Paper mt="md" p="sm" withBorder>
        <Title order={3}>Appointments</Title>
        <Tabs mt="sm" variant="pills" radius="md" defaultValue="scheduled">
          <Tabs.List>
            <Tabs.Tab value="scheduled">Scheduled</Tabs.Tab>
            <Tabs.Tab value="completed">Completed</Tabs.Tab>
            <Tabs.Tab value="cancelled">Cancelled</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="scheduled">
            {renderAppointments("SCHEDULED")}
          </Tabs.Panel>

          <Tabs.Panel value="completed">
            {renderAppointments("COMPLETED")}
          </Tabs.Panel>

          <Tabs.Panel value="cancelled">
            {renderAppointments("CANCELLED")}
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  );
};

export default JobDetails;
