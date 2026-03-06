import { Box, Container, Group, Title } from "@mantine/core";
import React from "react";
import BottomBar from "../components/pwa/BottomBar";

const page = () => {
  return (
    <Container>
      <Title>Tasks</Title>
      <BottomBar />
    </Container>
  );
};

export default page;
