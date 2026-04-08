import { deleteAppointment } from "@/lib/api/appointments";
import { cancelJob } from "@/lib/api/jobs";
import { Modal, Button, Group, Text } from "@mantine/core";
import { useState } from "react";
import { IoClose, IoTrashBin } from "react-icons/io5";
import { useCalendarStore, useDashboardUI } from "@/stores/store";

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
  const triggerRefresh = useCalendarStore((state) => state.triggerRefresh);

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
      <Text>
        Are you sure that you want to proceed? This action is irreversible.
      </Text>

      <Group mt="xs" justify="flex-end">
        <Button
          color="gray"
          onClick={closeConfirmCancel}
        >
          Cancel
        </Button>

        <Button
          color="red"
          onClick={handleCancel}
          loading={loading}
        >
          Delete
        </Button>
      </Group>
    </Modal>
  );
};

export default ConfirmCancellationModal;
