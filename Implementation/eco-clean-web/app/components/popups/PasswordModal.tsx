"use client";

import { Modal, Text, Button, Group, Code } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";

export function PasswordModal({
  opened,
  onClose,
  password,
}: {
  opened: boolean;
  onClose: () => void;
  password: string;
}) {
  const clipboard = useClipboard();

  return (
    <Modal opened={opened} onClose={onClose} title="Temporary Password" centered>
      <Text mb="sm">
        Please copy this password and share it with the user.
      </Text>

      <Code block>{password}</Code>

      <Group mt="md">
        <Button onClick={() => clipboard.copy(password)}>
          {clipboard.copied ? "Copied!" : "Copy"}
        </Button>

        <Button variant="light" onClick={onClose}>
          Close
        </Button>
      </Group>
    </Modal>
  );
}