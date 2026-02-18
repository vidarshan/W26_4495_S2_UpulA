"use client";
import { useJob } from "@/hooks/useJob";
import {
  Accordion,
  Card,
  Container,
  Paper,
  Select,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useParams } from "next/navigation";
import React from "react";

const JobDetails = () => {
  const params = useParams();
  const id = params.id as string;
  console.log(id);
  const { data: job, isLoading } = useJob(id);

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
      <Paper p="sm" withBorder>
        <Text>Job Details</Text>
        <Select
          // leftSection={<IoPersonOutline />}
          // {...form.getInputProps("clientId")}
          // data={
          //   clientsData?.data.map((client: Client) => ({
          //     value: client.id,
          //     label:
          //       client.companyName ||
          //       `${client.firstName} ${client.lastName}`,
          //   })) || []
          // }
          placeholder="Select Clients"
          // onSearchChange={setSearchClients}
          searchable
          label="Client"
        />
        <Select
          // leftSection={<IoPersonOutline />}
          // {...form.getInputProps("clientId")}
          // data={
          //   clientsData?.data.map((client: Client) => ({
          //     value: client.id,
          //     label:
          //       client.companyName ||
          //       `${client.firstName} ${client.lastName}`,
          //   })) || []
          // }
          placeholder="Select Address"
          // onSearchChange={setSearchClients}
          searchable
          label="Client"
        />
        <Textarea label="Visit Instructions" />
      </Paper>
      <Paper withBorder>
        <Text>Job Details</Text>
        <Card>
          <Text>Start time</Text>
          <Text>End time</Text>
          <Text>Status</Text>
        </Card>
      </Paper>
      <Paper>
        <Title order={2}>Client Details</Title>
      </Paper>
      <Paper>
        <Title order={2}>Address Details</Title>
      </Paper>
      <Paper>
        <Title order={2}>Assignees</Title>
      </Paper>
    </Container>
  );
};

export default JobDetails;
