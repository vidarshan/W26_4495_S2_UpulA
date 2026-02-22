import { cancelAppointment } from "@/lib/api/appointments";
import { cancelJob } from "@/lib/api/jobs";
import { Modal, Button, Group, Text } from "@mantine/core";
import { useState } from "react";
import { IoCloseOutline, IoTrashBinOutline } from "react-icons/io5";
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
      await cancelAppointment(selectedApptId!);
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
    >
      <Text>
        Are you sure that you want to proceed? This action is irreversible.
      </Text>

      <Group mt="xs" justify="flex-end">
        <Button
          color="gray"
          leftSection={<IoCloseOutline />}
          onClick={closeConfirmCancel}
        >
          Cancel
        </Button>

        <Button
          color="red"
          leftSection={<IoTrashBinOutline />}
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
