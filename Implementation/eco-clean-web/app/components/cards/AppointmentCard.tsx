import { Card, Text, Group, Badge, Stack, Divider } from "@mantine/core";
import { format } from "date-fns";

interface Appointment {
  id: string;
  jobId: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "CANCELLED" | "COMPLETED";
  createdAt: string;
  completionSent: boolean;
  reminder1dSent: boolean;
  reminder5dSent: boolean;
}

interface Props {
  appointment: Appointment;
}

export default function AppointmentCard({ appointment }: Props) {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const created = new Date(appointment.createdAt);

  return (
    <Card px={0} py="xs" mt="xs" radius="md">
      <Stack gap="xs">
        <Group justify="apart" align="center">
          <Text size="sm" fw={600}>
            Appointment ID
          </Text>
          <Text size="sm" color="dimmed">
            {appointment.id.slice(0, 8)}…
          </Text>
        </Group>

        <Divider />

        <Group justify="apart">
          <Text size="sm" fw={500}>
            Job ID:
          </Text>
          <Text size="sm" color="dimmed">
            {appointment.jobId.slice(0, 8)}…
          </Text>
        </Group>

        <Group justify="apart">
          <Text size="sm" fw={500}>
            Start Time:
          </Text>
          <Text size="sm" color="dimmed">
            {format(start, "PPpp")}
          </Text>
        </Group>

        <Group justify="apart">
          <Text size="sm" fw={500}>
            End Time:
          </Text>
          <Text size="sm" color="dimmed">
            {format(end, "PPpp")}
          </Text>
        </Group>

        <Group justify="apart">
          <Text size="sm" fw={500}>
            Status:
          </Text>
          <Badge
            color={appointment.status === "SCHEDULED" ? "green" : "red"}
            variant="filled"
          >
            {appointment.status}
          </Badge>
        </Group>

        <Group justify="apart">
          <Text size="sm" fw={500}>
            Created At:
          </Text>
          <Text size="sm" color="dimmed">
            {format(created, "PPpp")}
          </Text>
        </Group>

        <Divider />

        <Group justify="apart">
          <Text size="sm" fw={500}>
            Completion Sent:
          </Text>
          <Text size="sm" color={appointment.completionSent ? "green" : "red"}>
            {appointment.completionSent ? "Yes" : "No"}
          </Text>
        </Group>

        <Group justify="apart">
          <Text size="sm" fw={500}>
            Reminder 1d Sent:
          </Text>
          <Text size="sm" color={appointment.reminder1dSent ? "green" : "red"}>
            {appointment.reminder1dSent ? "Yes" : "No"}
          </Text>
        </Group>

        <Group justify="apart">
          <Text size="sm" fw={500}>
            Reminder 5d Sent:
          </Text>
          <Text size="sm" color={appointment.reminder5dSent ? "green" : "red"}>
            {appointment.reminder5dSent ? "Yes" : "No"}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
