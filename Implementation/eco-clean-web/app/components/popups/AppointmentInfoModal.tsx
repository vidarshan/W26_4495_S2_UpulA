"use client";

import { useEffect, useMemo } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Group,
  Image,
  Modal,
  MultiSelect,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { DateInput, TimeInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
  IoCalendarOutline,
  IoCloseOutline,
  IoDocumentTextOutline,
  IoLocationOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoPricetagOutline,
  IoTimeOutline,
} from "react-icons/io5";

import Loader from "../UI/Loader";
import { useDashboardUI } from "@/stores/store";
import { useAppointment } from "@/hooks/useAppointment";
import { getStaff } from "@/lib/api/users";
import { updateAppointment } from "@/lib/api/appointments";
import { dateOnlyAndHHmmToIso, isoToDateOnly, isoToHHmm } from "@/lib/dateTime";
import { deleteAppointmentImage } from "@/lib/uploadthing";
import {
  AppointmentStatus,
  AppointmentWithRelations,
  JobAddress,
  JobClient,
  Staff,
} from "@/types";

import classes from "./AppointmentInfoModal.module.css";
type AppointmentCache = AppointmentWithRelations;

type FormValues = {
  date: Date | null;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  staff: string[];
  note: string;
};

type Props = {
  onSuccess: () => void;
};

function isValidHHmm(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateOnly(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
  }).format(date);
}

function buildClientName(client?: JobClient | null) {
  if (!client) return "—";

  const fullName = [client.title, client.firstName, client.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return client.companyName?.trim()
    ? `${fullName || "—"}${fullName ? " • " : ""}${client.companyName}`
    : fullName || "—";
}

function buildAddress(address?: JobAddress | null) {
  if (!address) return "—";

  return [
    address.street1,
    address.street2,
    [address.city, address.province].filter(Boolean).join(", "),
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function ReadOnlyItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Group align="flex-start" wrap="nowrap">
        <ThemeIcon variant="light" size="lg" radius="xl">
          {icon}
        </ThemeIcon>

        <Box flex={1}>
          <Text size="xs" c="dimmed">
            {label}
          </Text>
          <Text size="sm" fw={500}>
            {value || "—"}
          </Text>
        </Box>
      </Group>
    </Paper>
  );
}

export default function AppointmentInfoModal({ onSuccess }: Props) {
  const { appointmentOpen, closeAppointment, selectedApptId } =
    useDashboardUI();

  const { data: appointment, isLoading } = useAppointment(selectedApptId);
  const qc = useQueryClient();

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ["staff", "all"],
    queryFn: () => getStaff(),
    staleTime: 60_000,
  });

  const staffOptions = useMemo(() => {
    return (staffData?.data ?? []).map((s) => ({
      value: s.id,
      label: s.name,
    }));
  }, [staffData]);

  const form = useForm<FormValues>({
    mode: "controlled",
    initialValues: {
      date: null,
      startTime: "",
      endTime: "",
      status: "SCHEDULED",
      staff: [],
      note: "",
    },
    validate: {
      date: (v) => (!v ? "Date is required" : null),
      startTime: (v) => (!isValidHHmm(v) ? "Start time is required" : null),
      endTime: (v) => (!isValidHHmm(v) ? "End time is required" : null),
    },
  });

  const latestAppointmentNote =
    appointment?.notes
      ?.slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )?.[0]?.content ?? "";

  const sortedAppointmentNotes =
    appointment?.notes
      ?.slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ) ?? [];
  console.log(appointment);
  const sortedJobNotes =
    appointment?.job?.notes?.slice().sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }) ?? [];

  useEffect(() => {
    if (!appointment) return;

    form.setValues({
      date: isoToDateOnly(appointment.startTime),
      startTime: isoToHHmm(appointment.startTime),
      endTime: isoToHHmm(appointment.endTime),
      status: appointment.status,
      staff: (appointment.assignments ?? []).map((a) => a.staff.id),
      note: latestAppointmentNote,
    });

    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appointment?.id,
    appointment?.startTime,
    appointment?.endTime,
    appointment?.status,
    appointment?.staff?.map((s) => s.id).join(","),
    appointment?.notes?.map((n) => `${n.id}-${n.createdAt}`).join(","),
  ]);

  const handleClose = () => {
    form.reset();
    closeAppointment();
  };

  const handleSave = async () => {
    if (!appointment) return;

    const validation = form.validate();
    if (validation.hasErrors) return;

    const { date, startTime, endTime } = form.values;
    if (!date) return;

    const startIso = dateOnlyAndHHmmToIso(date, startTime);
    const endIso = dateOnlyAndHHmmToIso(date, endTime);

    if (new Date(endIso) <= new Date(startIso)) {
      form.setFieldError("endTime", "End time must be after start time");
      return;
    }

    await updateAppointment(appointment.id, {
      startTime: startIso,
      endTime: endIso,
      status: form.values.status,
      staffIds: form.values.staff,
      note: form.values.note?.trim() || null,
    });

    form.resetDirty();
    onSuccess?.();
    closeAppointment();

    notifications.show({
      title: "Success",
      message: "Updated the appointment",
      color: "green",
    });
  };

  const apptKey = ["appointment", selectedApptId] as const;

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => deleteAppointmentImage(imageId),

    onMutate: async (imageId: string) => {
      await qc.cancelQueries({ queryKey: apptKey });

      const prev = qc.getQueryData<AppointmentCache>(apptKey);

      qc.setQueryData<AppointmentCache | undefined>(apptKey, (old) => {
        if (!old) return old;

        return {
          ...old,
          images: (old.images ?? []).filter((img) => img.id !== imageId),
        };
      });

      return { prev };
    },

    onError: (_err, _imageId, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(apptKey, ctx.prev);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: apptKey });
      onSuccess();
    },
  });

  return (
    <Modal
      size="xl"
      title="Appointment Details"
      opened={appointmentOpen}
      onClose={handleClose}
      centered
      closeOnClickOutside={false}
      classNames={{
        content: "app-modal__content",
        header: "app-modal__header",
        title: "app-modal__title",
        body: "app-modal__body",
      }}
    >
      {isLoading ? (
        <Loader />
      ) : !appointment ? null : (
        <Paper radius="md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <Stack gap="lg">
              <Divider label="Appointment Information" labelPosition="left" />

              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <DateInput
                  label="Date"
                  value={form.values.date}
                  onChange={(value) =>
                    form.setFieldValue("date", value ? new Date(value) : null)
                  }
                  error={form.errors.date}
                />

                <Select
                  label="Status"
                  data={[
                    { value: "SCHEDULED", label: "Scheduled" },
                    { value: "COMPLETED", label: "Completed" },
                    { value: "CANCELLED", label: "Cancelled" },
                  ]}
                  {...form.getInputProps("status")}
                />
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TimeInput
                  label="Start Time"
                  value={form.values.startTime}
                  onChange={(e) =>
                    form.setFieldValue("startTime", e.currentTarget.value)
                  }
                  error={form.errors.startTime}
                />

                <TimeInput
                  label="End Time"
                  value={form.values.endTime}
                  onChange={(e) =>
                    form.setFieldValue("endTime", e.currentTarget.value)
                  }
                  error={form.errors.endTime}
                />
              </SimpleGrid>

              <MultiSelect
                label="Assigned Staff"
                data={staffOptions}
                searchable
                nothingFoundMessage={
                  staffLoading ? "Loading staff..." : "No staff"
                }
                {...form.getInputProps("staff")}
              />

              <Textarea
                label="Latest Appointment Note"
                description="This updates the current internal visit note."
                autosize
                minRows={3}
                placeholder="Add internal note for this visit..."
                {...form.getInputProps("note")}
              />

              {!!sortedAppointmentNotes.length && (
                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    Appointment Note History
                  </Text>

                  {sortedAppointmentNotes.map((note) => (
                    <Paper key={note.id} withBorder radius="md" p="sm">
                      <Group justify="space-between" align="flex-start" mb={6}>
                        <Badge
                          variant="light"
                          color={note.isClientVisible ? "blue" : "gray"}
                        >
                          {note.isClientVisible ? "Client visible" : "Internal"}
                        </Badge>

                        <Text size="xs" c="dimmed">
                          {formatDateTime(note.createdAt)}
                        </Text>
                      </Group>

                      <Text size="sm">{note.content || "—"}</Text>
                    </Paper>
                  ))}
                </Stack>
              )}

              {!!appointment.images?.length && (
                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    Appointment Images
                  </Text>

                  <Group wrap="wrap" gap="xs">
                    {appointment.images.map((img) => (
                      <Paper
                        key={img.id}
                        radius="md"
                        withBorder
                        className={classes.thumbnailCard}
                      >
                        <Image
                          src={img.url}
                          alt="appointment attachment"
                          w={88}
                          h={88}
                          fit="cover"
                        />

                        <ActionIcon
                          size="sm"
                          variant="filled"
                          color="dark"
                          className={classes.thumbnailAction}
                          loading={deleteImageMutation.isPending}
                          onClick={() => deleteImageMutation.mutate(img.id)}
                          aria-label="Delete image"
                        >
                          <IoCloseOutline size={14} />
                        </ActionIcon>
                      </Paper>
                    ))}
                  </Group>
                </Stack>
              )}

              <Divider label="Job Details" labelPosition="left" />

              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <ReadOnlyItem
                  icon={<IoDocumentTextOutline size={18} />}
                  label="Job Title"
                  value={appointment.job?.title || "—"}
                />

                <ReadOnlyItem
                  icon={<IoPricetagOutline size={18} />}
                  label="Job Type"
                  value={appointment.job?.type || "—"}
                />

                <ReadOnlyItem
                  icon={<IoPersonOutline size={18} />}
                  label="Client"
                  value={buildClientName(appointment.job?.client)}
                />

                <ReadOnlyItem
                  icon={<IoPeopleOutline size={18} />}
                  label="Preferred Contact"
                  value={appointment.job?.client?.preferredContact || "—"}
                />

                <ReadOnlyItem
                  icon={<IoCalendarOutline size={18} />}
                  label="Created"
                  value={formatDateOnly(appointment.createdAt)}
                />

                <ReadOnlyItem
                  icon={<IoTimeOutline size={18} />}
                  label="Scheduled Window"
                  value={`${formatDateTime(appointment.startTime)} → ${formatDateTime(
                    appointment.endTime,
                  )}`}
                />
              </SimpleGrid>

              <ReadOnlyItem
                icon={<IoLocationOutline size={18} />}
                label="Service Address"
                value={buildAddress(appointment.job?.address)}
              />

              {!!appointment.job?.visitInstructions && (
                <Paper withBorder radius="md" p="sm">
                  <Text size="xs" c="dimmed" mb={4}>
                    Visit Instructions
                  </Text>
                  <Text size="sm">{appointment.job.visitInstructions}</Text>
                </Paper>
              )}

              {!!appointment.job?.client && (
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Paper withBorder radius="md" p="sm">
                    <Text size="xs" c="dimmed" mb={4}>
                      Client Email
                    </Text>
                    <Text size="sm">{appointment.job.client.email || "—"}</Text>
                  </Paper>

                  <Paper withBorder radius="md" p="sm">
                    <Text size="xs" c="dimmed" mb={4}>
                      Client Phone
                    </Text>
                    <Text size="sm">{appointment.job.client.phone || "—"}</Text>
                  </Paper>
                </SimpleGrid>
              )}

              {!!appointment.job?.lineItems?.length && (
                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    Job Line Items
                  </Text>

                  {appointment.job.lineItems.map((item) => (
                    <Paper key={item.id} withBorder radius="md" p="sm">
                      <Group justify="space-between" align="flex-start" mb={4}>
                        <Text fw={600} size="sm">
                          {item.name}
                        </Text>

                        <Badge variant="light">
                          Qty {item.quantity} • Total {item.total}
                        </Badge>
                      </Group>

                      {item.description ? (
                        <Text size="sm" c="dimmed">
                          {item.description}
                        </Text>
                      ) : null}
                    </Paper>
                  ))}
                </Stack>
              )}

              {!!sortedJobNotes.length && (
                <>
                  <Divider label="Job Notes" labelPosition="left" />

                  <Stack gap="sm">
                    {sortedJobNotes.map((note) => (
                      <Paper key={note.id} withBorder radius="md" p="sm">
                        <Group
                          justify="space-between"
                          align="flex-start"
                          mb={6}
                        >
                          <Stack gap={4}>
                            <Group gap="xs">
                              <Text fw={600} size="sm">
                                {note.title || "Untitled note"}
                              </Text>

                              {note.isPinned && (
                                <Badge color="yellow" variant="light">
                                  Pinned
                                </Badge>
                              )}

                              <Badge variant="outline">{note.category}</Badge>

                              <Badge
                                variant="light"
                                color={note.isClientVisible ? "blue" : "gray"}
                              >
                                {note.isClientVisible
                                  ? "Client visible"
                                  : "Internal"}
                              </Badge>
                            </Group>

                            <Text size="xs" c="dimmed">
                              {formatDateTime(note.createdAt)}
                            </Text>
                          </Stack>
                        </Group>

                        <Text size="sm">{note.content}</Text>

                        {!!note.images?.length && (
                          <Group mt="sm" wrap="wrap" gap="xs">
                            {note.images.map((img) => (
                              <Paper
                                key={img.id}
                                radius="md"
                                withBorder
                                className={classes.thumbnailCard}
                              >
                                <Image
                                  src={img.url}
                                  alt="job note attachment"
                                  w={88}
                                  h={88}
                                  fit="cover"
                                />
                              </Paper>
                            ))}
                          </Group>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                </>
              )}

              <Flex mt="xs" gap="xs">
                <Button variant="default" onClick={handleClose} fullWidth>
                  Cancel
                </Button>

                <Button type="submit" fullWidth disabled={!form.isDirty()}>
                  Save
                </Button>
              </Flex>
            </Stack>
          </form>
        </Paper>
      )}
    </Modal>
  );
}
