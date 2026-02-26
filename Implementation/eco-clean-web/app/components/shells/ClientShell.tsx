"use client";
import { Button, Card, Container, Group, Modal, Title } from "@mantine/core";
import { ReactNode, useState } from "react";
import UserUpsertModal from "../popups/UserModal";
import { IoAdd } from "react-icons/io5";
import ClientPropertyModal from "../popups/ClientModal";
import { useQueryClient } from "@tanstack/react-query";

const ClientShell = ({ children }: { children: ReactNode }) => {
  const [opened, setOpened] = useState(false);
  const queryClient = useQueryClient();
  const openAdd = () => setOpened(true);
  const close = () => setOpened(false);

  return (
    <Container fluid>
      <Group justify="space-between" align="center" mb="md">
        <Title order={2}>Clients</Title>
        <Button leftSection={<IoAdd />} onClick={openAdd}>
          Add client
        </Button>
      </Group>

      <Card bg="white" p="md" withBorder>
        {children}
      </Card>

      <ClientPropertyModal
        opened={opened}
        onClose={() => {
          setOpened(false);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["clients"] });
        }}
      />
    </Container>
  );
};

export default ClientShell;
