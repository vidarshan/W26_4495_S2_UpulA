"use client";
import { Button, Card, Container, Group, Modal, Title } from "@mantine/core";
import { ReactNode, useState } from "react";
import UserUpsertModal from "../popups/UserModal";
import { IoAdd } from "react-icons/io5";

const UserShell = ({ children }: { children: ReactNode }) => {
  const [opened, setOpened] = useState(false);

  const openAdd = () => setOpened(true);
  const close = () => setOpened(false);

  return (
    <Container fluid>
      <Group justify="space-between" align="center" mb="md">
        <Title order={2}>Users</Title>
        <Button leftSection={<IoAdd />} onClick={openAdd}>
          Add user
        </Button>
      </Group>

      <Card bg="white" p="md" withBorder>
        {children}
      </Card>

      <UserUpsertModal
        key="new"
        opened={opened}
        onClose={close}
        mode="create"
        user={null}
      />
    </Container>
  );
};

export default UserShell;
