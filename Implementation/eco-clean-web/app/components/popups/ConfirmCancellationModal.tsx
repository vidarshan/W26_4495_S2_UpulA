import { deleteAppointment } from "@/lib/api/appointments";
import { cancelJob } from "@/lib/api/jobs";
import { Modal, Button, Group, Text, Paper, Stack } from "@mantine/core";
import { useState } from "react";
import { useDashboardUI } from "@/stores/store";

interface Props {
  onSuccess: () => void;
}

const ConfirmCancellationModal = ({ onSuccess }: Props) => {
  const {
    confirmCancelOpen,
    closeConfirmCancel,
    selectedJobId,
    selectedApptId,
    cancelMode,
  } = useDashboardUI();

  const [loading, setLoading] = useState(false);
  const handleCancel = async () => {
    setLoading(true);

    if (cancelMode === "JOB") {
      await cancelJob(selectedJobId!);
    } else if (cancelMode === "APPOINTMENT") {
      await deleteAppointment(selectedApptId!);
    }
    onSuccess();
    setLoading(false);
    closeConfirmCancel();
  };

  return (
    <Modal
      opened={confirmCancelOpen}
      onClose={closeConfirmCancel}
      title="Confirm Deletion"
      centered
      classNames={{
        content: "app-modal__content",
        header: "app-modal__header",
        title: "app-modal__title",
        body: "app-modal__body",
      }}
    >
      <Stack gap="md">
        <Paper withBorder radius="md" p="md" className="app-modal__section">
          <Text size="sm">
            Are you sure that you want to proceed? This action is irreversible.
          </Text>
        </Paper>

        <Paper withBorder radius="md" p="md" className="app-modal__footer">
          <Group justify="flex-end">
            <Button color="gray" onClick={closeConfirmCancel}>
              Cancel
            </Button>

            <Button color="red" onClick={handleCancel} loading={loading}>
              Delete
            </Button>
          </Group>
        </Paper>
      </Stack>
    </Modal>
  );
};

export default ConfirmCancellationModal;
