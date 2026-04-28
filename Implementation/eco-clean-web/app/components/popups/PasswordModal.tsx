"use client";

import { Modal, Text, Button, Group, Code, Paper, Stack } from "@mantine/core";
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
    <Modal
      opened={opened}
      onClose={onClose}
      title="Temporary Password"
      centered
      classNames={{
        content: "app-modal__content",
        header: "app-modal__header",
        title: "app-modal__title",
        body: "app-modal__body",
      }}
    >
      <Stack gap="md">
        <Paper withBorder radius="md" p="lg" className="app-modal__hero">
          <Stack gap={4}>
            <Text size="xs" fw={800} c="dimmed" className="app-modal__eyebrow">
              Credential Handoff
            </Text>
            <Text fw={800}>Temporary password</Text>
            <Text size="sm" c="dimmed">
              Copy this password and share it with the user before closing the modal.
            </Text>
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md" className="app-modal__section">
          <Code block>{password}</Code>
        </Paper>

        <Paper withBorder radius="md" p="md" className="app-modal__footer">
          <Group justify="flex-end">
            <Button onClick={() => clipboard.copy(password)}>
              {clipboard.copied ? "Copied!" : "Copy"}
            </Button>

            <Button variant="light" onClick={onClose}>
              Close
            </Button>
          </Group>
        </Paper>
      </Stack>
    </Modal>
  );
}
