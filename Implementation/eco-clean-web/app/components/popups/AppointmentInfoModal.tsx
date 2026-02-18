"use client";

import { useJob } from "@/hooks/useJob";
import {
  Badge,
  Button,
  Divider,
  Flex,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { format } from "date-fns";
import {
  IoBriefcaseOutline,
  IoCalendarOutline,
  IoCloseOutline,
  IoDocumentOutline,
  IoLayersOutline,
  IoLocationOutline,
  IoMailOpenOutline,
  IoPencilOutline,
  IoPersonOutline,
  IoPhonePortraitOutline,
  IoTimeOutline,
} from "react-icons/io5";
import Loader from "../UI/Loader";
import { Appointment } from "@/types";
import { useDashboardUI } from "@/stores/store";

const AppointmentInfoModal = () => {
  const {
    appointmentOpen,
    closeAppointment,
    selectedJobId,
    selectedApptId,
    openConfirmCancel,
  } = useDashboardUI();

  const { data: job, isLoading } = useJob(selectedJobId!);

  const renderAppointmentDetails = () => {
    return job?.appointments?.map((appt: Appointment) => {
      if (appt.id !== selectedApptId) return null;

      const date = format(new Date(appt.startTime), "MMM d, yyyy");
      const startTime = format(new Date(appt.startTime), "hh:mm a");
      const endTime = format(new Date(appt.endTime), "hh:mm a");

      return (
        <Paper key={appt.id} radius="md">
          <Divider
            label="Appointment Information"
            mb="sm"
            labelPosition="left"
          />

          <Stack gap={6}>
            <Group justify="space-between" align="center">
              <Group gap={6}>
                <IoCalendarOutline size={14} />
                <Text size="xs" fw={600}>
                  {date}
                </Text>
              </Group>

              <Badge
                size="sm"
                color={
                  appt.status === "SCHEDULED"
                    ? "blue"
                    : appt.status === "COMPLETED"
                      ? "green"
                      : "red"
                }
                variant="filled"
              >
                {appt.status}
              </Badge>
            </Group>

            <Group gap={6}>
              <IoTimeOutline size={14} />
              {job?.isAnytime ? (
                <Text size="xs" c="dimmed">
                  Anytime
                </Text>
              ) : (
                <Text size="xs" c="dimmed">
                  {startTime} – {endTime}
                </Text>
              )}
            </Group>

            <Divider label="Client Information" my="sm" labelPosition="left" />

            <Stack gap={6}>
              {job?.client.companyName && (
                <Group gap={6}>
                  <IoBriefcaseOutline size={14} />
                  <Text size="xs">{job.client.companyName}</Text>
                </Group>
              )}

              <Group gap={6}>
                <IoPersonOutline size={14} />
                <Text size="xs">
                  {job?.client.title !== "No title"
                    ? `${job?.client.title} `
                    : ""}
                  {job?.client.firstName} {job?.client.lastName}
                </Text>
              </Group>

              <Group gap={6}>
                <IoMailOpenOutline size={14} />
                <Text size="xs" c="dimmed">
                  {job?.client.email}
                </Text>
              </Group>

              <Group gap={6}>
                <IoPhonePortraitOutline size={14} />
                <Text size="xs" c="dimmed">
                  {job?.client.phone}
                </Text>
              </Group>

              <Text size="xs" c="dimmed">
                Preferred contact: {job?.client.preferredContact}
              </Text>
            </Stack>

            <Divider label="Client Location" my="sm" labelPosition="left" />

            <Stack gap={6}>
              <Group gap={6}>
                <IoLocationOutline size={14} />
                <Text size="xs">
                  {job?.address.street1}
                  {job?.address.street2 && `, ${job.address.street2}`}
                </Text>
              </Group>

              <Text size="xs" c="dimmed">
                {job?.address.city}, {job?.address.province}{" "}
                {job?.address.postalCode}
              </Text>

              <Text size="xs" c="dimmed">
                {job?.address.country}
              </Text>

              {(job?.address.isPrimary || job?.address.isBilling) && (
                <Group gap={6} mt={4}>
                  {job.address.isPrimary && (
                    <Badge size="xs" variant="light">
                      Primary
                    </Badge>
                  )}
                  {job.address.isBilling && (
                    <Badge size="xs" variant="light" color="gray">
                      Billing
                    </Badge>
                  )}
                </Group>
              )}
            </Stack>

            {job?.visitInstructions && (
              <>
                <Divider
                  label="Visit Instructions"
                  my="sm"
                  labelPosition="left"
                />

                <Group align="flex-start" gap={6}>
                  <IoDocumentOutline size={14} />
                  <Text size="xs" style={{ whiteSpace: "pre-line" }}>
                    {job.visitInstructions}
                  </Text>
                </Group>
              </>
            )}

            <Divider label="Assigned Staff" my="sm" labelPosition="left" />

            <Stack gap={6}>
              {job?.staffMembers.map((staff) => (
                <Group key={staff.id} justify="space-between" align="center">
                  <Group gap={6}>
                    <IoPersonOutline size={14} />
                    <Stack gap={0}>
                      <Text size="xs" fw={500}>
                        {staff.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {staff.email}
                      </Text>
                    </Stack>
                  </Group>

                  <Badge size="xs" color="orange" variant="filled">
                    {staff.role}
                  </Badge>
                </Group>
              ))}
            </Stack>

            <Divider label="Job Details" my="sm" labelPosition="left" />

            <Stack gap={6}>
              <Group gap={6}>
                <IoDocumentOutline size={14} />
                <Text size="xs" fw={600}>
                  {job?.title}
                </Text>
              </Group>

              <Group gap={6}>
                <IoLayersOutline size={14} />
                <Text size="xs" c="dimmed">
                  {job?.type === "ONE_OFF" ? "One-Off Job" : "Recurring Job"}
                </Text>
              </Group>

              <Group gap={6}>
                <IoTimeOutline size={14} />
                <Text size="xs" c="dimmed">
                  {job?.isAnytime ? "Anytime Service" : "Scheduled Time"}
                </Text>
              </Group>

              <Text size="xs" c="dimmed">
                Created: {format(new Date(job?.createdAt || ""), "MMM d, yyyy")}
              </Text>

              <Text size="xs" c="dimmed">
                Last updated:{" "}
                {format(new Date(job?.updatedAt || ""), "MMM d, yyyy")}
              </Text>
            </Stack>
          </Stack>
        </Paper>
      );
    });
  };

  return (
    <Modal
      size="sm"
      title="Job Details"
      opened={appointmentOpen}
      onClose={closeAppointment}
      centered
      closeOnClickOutside={false}
    >
      {isLoading ? <Loader /> : renderAppointmentDetails()}

      <Divider my="sm" />

      <Flex direction="column">
        <Button mb="xs" size="xs" leftSection={<IoPencilOutline />} fullWidth>
          Edit Details
        </Button>

        <Button
          mb="xs"
          size="xs"
          color="red"
          leftSection={<IoCloseOutline />}
          onClick={() => openConfirmCancel("APPOINTMENT")}
          fullWidth
        >
          Cancel Appointment
        </Button>

        <Button
          mb="xs"
          size="xs"
          color="red"
          leftSection={<IoCloseOutline />}
          onClick={() => openConfirmCancel("JOB")}
          fullWidth
        >
          Cancel Job
        </Button>
      </Flex>
    </Modal>
  );
};

export default AppointmentInfoModal;
