import { Card, Container, Title } from "@mantine/core";
import { Calendar, MiniCalendar } from "@mantine/dates";
import React from "react";

const page = () => {
  const tasks = [
    {
      id: "1",
      title: "Deep Clean",
      time: "2023",
      address: "2017 Seventh Ave, New Westminster V3M 2L5",
    },
  ];

  return (
    <Container>
      <Title>Tasks</Title>
      {tasks.map((t) => {
        return (
          <Card key={t.id} radius="md" withBorder>
            dd
          </Card>
        );
      })}
    </Container>
  );
};

export default page;
