"use client";

import { useEffect, useMemo } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  MultiSelect,
  Paper,
  Select,
  SimpleGrid,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from "@mantine/core";
import { DateInput, TimeInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
  IoCalendar,
  IoCheckmarkDone,
  IoClose,
  IoDocumentText,
  IoPeople,
  IoPerson,
  IoPricetag,
  IoTimer,
} from "@/lib/icons";

import { useDashboardUI } from "@/stores/store";
import { useAppointment } from "@/hooks/useAppointment";
import { getStaff } from "@/lib/api/users";
import { formatStaffOptionLabel } from "@/lib/appointments/staffAvailability";
import { updateAppointment } from "@/lib/api/appointments";
import { dateOnlyAndHHmmToIso, isoToDateOnly, isoToHHmm } from "@/lib/dateTime";
import { deleteAppointmentImage } from "@/lib/uploadthing";
import {
  AppointmentStatus,
  AppointmentWithRelations,
  CandidateResponse,
  CandidateStaff,
  JobAddress,
  JobClient,
  Staff,
  StaffUser,
  WorkSession,
} from "@/types";
import { PaginatedResponse } from "@/types/api";
import { queryKeys } from "@/lib/queryKeys";
import ChecklistEditor, {
  ChecklistDraftItem,
  createChecklistDraftItem,
} from "../appointments/ChecklistEditor";
import ImageViewer from "../media/ImageViewer";

import classes from "./AppointmentInfoModal.module.css";
import Loader from "../UI/Loader";

type AppointmentCache = AppointmentWithRelations;

type FormValues = {
  date: Date | null;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  staff: string[];
  leadStaffId: string;
  checklist: ChecklistDraftItem[];
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

function formatDurationMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function hhmmToMinutes(value: string) {
  if (!isValidHHmm(value)) return null;

  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToHHmm(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

const TIME_ADJUSTMENTS = [-10, -5, 5, 10] as const;

function formatTimeAdjustmentLabel(deltaMinutes: number) {
  return `${deltaMinutes > 0 ? "+" : ""}${deltaMinutes} min`;
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

function getStatusColor(status: AppointmentStatus) {
  if (status === "COMPLETED") return "lime";
  if (status === "CANCELLED") return "red";
  if (status === "LATE") return "orange";
  return "blue";
}

async function getAssignmentCandidates(
  addressId: string,
  appointmentStart: string,
  appointmentEnd: string,
): Promise<CandidateResponse> {
  const params = new URLSearchParams({
    appointmentStart,
    appointmentEnd,
  });

  const res = await fetch(
    `/api/assignment/candidate/${addressId}?${params.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Failed to fetch assignment candidates");
  }

  return data;
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
    <Paper withBorder radius="md" p="sm" className={classes.infoCard}>
      <Group align="flex-start" wrap="nowrap">
        <ThemeIcon variant="light" size="lg" radius="md" color="lime">
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

function MetricCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <Paper withBorder radius="md" p="md" className={classes.metricCard}>
      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
        {label}
      </Text>
      <Text mt={6} size="xl" fw={800}>
        {value}
      </Text>
      {meta ? (
        <Text mt={4} size="sm" c="dimmed">
          {meta}
        </Text>
      ) : null}
    </Paper>
  );
}

export default function AppointmentInfoModal({ onSuccess }: Props) {
  const {
    appointmentOpen,
    closeAppointment,
    openEditJob,
    openConfirmCancel,
    selectedApptId,
  } = useDashboardUI();

  const { data: appointment, isLoading } = useAppointment(selectedApptId, {
    live: false,
  });
  const qc = useQueryClient();

  const { data: staffData, isLoading: staffLoading } = useQuery<
    PaginatedResponse<Staff>
  >({
    queryKey: ["staff", "all"],
    queryFn: () => getStaff(),
    staleTime: 10 * 60 * 1000,
  });

  const form = useForm<FormValues>({
    mode: "controlled",
    initialValues: {
      date: null,
      startTime: "",
      endTime: "",
      status: "SCHEDULED",
      staff: [],
      leadStaffId: "",
      checklist: [],
      note: "",
    },
    validate: {
      date: (value) => (!value ? "Date is required" : null),
      startTime: (value) =>
        !isValidHHmm(value) ? "Start time is required" : null,
      endTime: (value) => (!isValidHHmm(value) ? "End time is required" : null),
    },
  });

  const appointmentStartIso =
    form.values.date && isValidHHmm(form.values.startTime)
      ? dateOnlyAndHHmmToIso(form.values.date, form.values.startTime)
      : null;
  const appointmentEndIso =
    form.values.date && isValidHHmm(form.values.endTime)
      ? dateOnlyAndHHmmToIso(form.values.date, form.values.endTime)
      : null;

  const { data: candidateData, isLoading: candidateLoading } = useQuery({
    queryKey: [
      "assignment-candidates",
      appointment?.job?.address?.id ?? null,
      appointmentStartIso,
      appointmentEndIso,
    ],
    queryFn: () =>
      getAssignmentCandidates(
        appointment!.job!.address!.id,
        appointmentStartIso!,
        appointmentEndIso!,
      ),
    enabled:
      appointmentOpen &&
      !!appointment?.job?.address?.id &&
      !!appointmentStartIso &&
      !!appointmentEndIso,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const recommendedMembers = useMemo(
    () => candidateData?.data.recommendedMembers ?? [],
    [candidateData],
  );
  const staffMembers = useMemo(
    () =>
      candidateData?.data.staffMembers?.length
        ? candidateData.data.staffMembers
        : ((staffData?.data as CandidateStaff[] | undefined) ?? []),
    [candidateData, staffData],
  );
  const staffOptions = useMemo(
    () =>
      staffMembers.map((staff) => ({
        value: staff.id,
        label: formatStaffOptionLabel(staff, recommendedMembers),
      })),
    [recommendedMembers, staffMembers],
  );

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

  const sortedJobNotes =
    appointment?.job?.notes?.slice().sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }) ?? [];

  const assignmentIdsKey =
    appointment?.assignments
      ?.map(
        (assignment) =>
          `${assignment.staff.id}:${assignment.isTeamLead ? "lead" : "member"}`,
      )
      .join(",") ?? "";
  const appointmentNotesKey =
    appointment?.notes
      ?.map((note) => `${note.id}-${note.createdAt}`)
      .join(",") ?? "";
  const checklistKey =
    appointment?.checklistItems
      ?.map(
        (item) =>
          `${item.id}:${item.label}:${item.sortOrder}:${item.isCompleted ? "1" : "0"}`,
      )
      .join(",") ?? "";

  useEffect(() => {
    if (!appointment) return;

    const assignedStaffIds = (appointment.assignments ?? []).map(
      (assignment) => assignment.staff.id,
    );
    const explicitLead = appointment.assignments?.find(
      (assignment) => assignment.isTeamLead,
    )?.staff.id;

    form.setValues({
      date: isoToDateOnly(appointment.startTime),
      startTime: isoToHHmm(appointment.startTime),
      endTime: isoToHHmm(appointment.endTime),
      status: appointment.status,
      staff: assignedStaffIds,
      leadStaffId:
        explicitLead ??
        (assignedStaffIds.length === 1 ? assignedStaffIds[0] : ""),
      checklist: (appointment.checklistItems ?? []).map((item) =>
        createChecklistDraftItem(item.label, item.id),
      ),
      note: latestAppointmentNote,
    });

    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appointment?.id,
    appointment?.startTime,
    appointment?.endTime,
    appointment?.status,
    assignmentIdsKey,
    appointmentNotesKey,
    checklistKey,
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

    const updated = await updateAppointment(appointment.id, {
      startTime: startIso,
      endTime: endIso,
      status: form.values.status,
      staffIds: form.values.staff,
      leadStaffId: form.values.leadStaffId || null,
      checklist: form.values.checklist
        .map((item) => ({
          ...(item.persistedId ? { id: item.persistedId } : {}),
          label: item.label.trim(),
        }))
        .filter((item) => item.label.length > 0),
      note: form.values.note?.trim() || null,
    });

    const detailKey = queryKeys.appointments.detail(appointment.id);
    qc.setQueryData(detailKey, updated);
    qc.invalidateQueries({ queryKey: detailKey });
    qc.invalidateQueries({ queryKey: queryKeys.appointments.all });

    form.resetDirty();
    onSuccess?.();
    closeAppointment();

    notifications.show({
      title: "Success",
      message: "Updated the appointment",
      color: "green",
    });
  };

  const apptKey = queryKeys.appointments.detail(selectedApptId);
  const editedDurationMinutes =
    isValidHHmm(form.values.startTime) && isValidHHmm(form.values.endTime)
      ? hhmmToMinutes(form.values.endTime)! -
        hhmmToMinutes(form.values.startTime)!
      : null;

  const adjustTimeField = (
    field: "startTime" | "endTime",
    deltaMinutes: number,
  ) => {
    const baseValue = form.values[field];
    const baseMinutes = hhmmToMinutes(baseValue);
    if (baseMinutes === null) return;

    form.setFieldValue(field, minutesToHHmm(baseMinutes + deltaMinutes));
  };

  const selectedLeadOptions = form.values.staff
    .map((staffId) => {
      const staffMember = staffMembers.find((staff) => staff.id === staffId);
      return staffMember
        ? {
            value: staffMember.id,
            label: formatStaffOptionLabel(staffMember, recommendedMembers),
          }
        : null;
    })
    .filter((option): option is { value: string; label: string } => !!option);

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
    onError: (_error, _imageId, context) => {
      if (context?.prev) {
        qc.setQueryData(apptKey, context.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: apptKey });
      onSuccess();
    },
  });

  const start = appointment ? new Date(appointment.startTime) : null;
  const end = appointment ? new Date(appointment.endTime) : null;
  const scheduledMinutes =
    start && end
      ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
      : 0;
  const workSessions = (appointment?.workSessions ?? [])
    .slice()
    .sort((a, b) => {
      return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
    });
  const totalWorkedMinutes = workSessions.reduce((total, session) => {
    if (!session.endedAt) return total;

    return (
      total +
      Math.max(
        0,
        Math.round(
          (new Date(session.endedAt).getTime() -
            new Date(session.startedAt).getTime()) /
            60000,
        ),
      )
    );
  }, 0);
  const activeSessionCount = workSessions.filter(
    (session) => !session.endedAt,
  ).length;
  const leadAssignment = appointment?.assignments?.find(
    (assignment) => assignment.isTeamLead,
  );
  const checklistCompletedCount =
    appointment?.checklistItems?.filter((item) => item.isCompleted).length ?? 0;
  const checklistTotalCount = appointment?.checklistItems?.length ?? 0;
  const visitNotesCount = sortedAppointmentNotes.length;
  const recurrenceSummary = appointment?.job?.recurrence
    ? `${appointment.job.recurrence.frequency} every ${appointment.job.recurrence.interval}`
    : "Not recurring";

  if (!appointment) {
    return (
      <Modal
        size="72rem"
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
        {isLoading ? <Loader /> : null}
      </Modal>
    );
  }

  return (
    <Modal
      size="72rem"
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
      ) : (
        <ScrollArea.Autosize mah="75dvh" offsetScrollbars>
          <Paper radius="md">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSave();
              }}
            >
              <Stack gap="lg" pb="xs">
                <Paper
                  withBorder
                  radius="md"
                  p="lg"
                  className={classes.heroCard}
                >
                  <Group
                    justify="space-between"
                    align="flex-start"
                    gap="md"
                    wrap="wrap"
                  >
                    <Stack gap={8} maw={700}>
                      <Group gap="xs" wrap="wrap">
                        <Badge
                          color={getStatusColor(appointment.status)}
                          variant="light"
                          radius="md"
                        >
                          {appointment.status}
                        </Badge>
                        <Badge color="gray" variant="outline" radius="md">
                          {appointment.job?.type || "Job"}
                        </Badge>
                        {leadAssignment ? (
                          <Badge color="teal" variant="light" radius="md">
                            Lead: {leadAssignment.staff.name}
                          </Badge>
                        ) : null}
                      </Group>

                      <Box>
                        <Text size="xs" fw={800} tt="uppercase" c="dimmed">
                          Parent Job
                        </Text>
                        <Text fw={800} size="xl" mt={4}>
                          {appointment.job?.title || "Untitled job"}
                        </Text>
                        <Text size="sm" c="dimmed" mt={2}>
                          {buildClientName(appointment.job?.client)}
                        </Text>
                        <Text size="sm" c="dimmed" mt={2}>
                          {buildAddress(appointment.job?.address)}
                        </Text>
                      </Box>
                    </Stack>

                    <Group gap="xs">
                      <Button
                        radius="md"
                        variant="light"
                        onClick={() => {
                          closeAppointment();
                          openEditJob();
                        }}
                        disabled={!appointment.job?.id}
                      >
                        Edit Job
                      </Button>
                      <Button
                        color="red"
                        radius="md"
                        variant="light"
                        onClick={() => openConfirmCancel("APPOINTMENT")}
                      >
                        Delete Appointment
                      </Button>
                    </Group>
                  </Group>

                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mt="lg">
                    <MetricCard
                      label="Scheduled Window"
                      value={formatDurationMinutes(scheduledMinutes)}
                      meta={`${formatDateTime(appointment.startTime)} → ${formatDateTime(
                        appointment.endTime,
                      )}`}
                    />
                    <MetricCard
                      label="Logged Time"
                      value={formatDurationMinutes(totalWorkedMinutes)}
                      meta={`${workSessions.length} work session${workSessions.length === 1 ? "" : "s"}`}
                    />
                    <MetricCard
                      label="Checklist"
                      value={`${checklistCompletedCount}/${checklistTotalCount}`}
                      meta={
                        checklistTotalCount
                          ? "Completed items"
                          : "No checklist assigned"
                      }
                    />
                    <MetricCard
                      label="Activity"
                      value={activeSessionCount}
                      meta={
                        activeSessionCount === 1
                          ? "1 active session"
                          : `${activeSessionCount} active sessions`
                      }
                    />
                  </SimpleGrid>
                </Paper>

                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
                  <Stack gap="lg">
                    <Paper
                      withBorder
                      radius="md"
                      p="lg"
                      className={classes.sectionCard}
                    >
                      <Group mb="md" gap="xs">
                        <ThemeIcon radius="md" variant="light" color="blue">
                          <IoCalendar size={18} />
                        </ThemeIcon>
                        <Box>
                          <Text fw={700}>Appointment Setup</Text>
                          <Text size="sm" c="dimmed">
                            Scheduling, status, assignments, and lead ownership.
                          </Text>
                        </Box>
                      </Group>

                      <Stack gap="md">
                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                          <DateInput
                            label="Date"
                            value={form.values.date}
                            onChange={(value) =>
                              form.setFieldValue(
                                "date",
                                value ? new Date(value) : null,
                              )
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
                            allowDeselect={false}
                            {...form.getInputProps("status")}
                          />
                        </SimpleGrid>

                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                          <TimeInput
                            label="Start Time"
                            value={form.values.startTime}
                            onChange={(event) =>
                              form.setFieldValue(
                                "startTime",
                                event.currentTarget.value,
                              )
                            }
                            error={form.errors.startTime}
                          />

                          <TimeInput
                            label="End Time"
                            value={form.values.endTime}
                            onChange={(event) =>
                              form.setFieldValue(
                                "endTime",
                                event.currentTarget.value,
                              )
                            }
                            error={form.errors.endTime}
                          />
                        </SimpleGrid>

                        <Paper
                          withBorder
                          radius="md"
                          p="sm"
                          className={classes.infoCard}
                        >
                          <Group
                            justify="space-between"
                            align="center"
                            gap="sm"
                          >
                            <Box>
                              <Text
                                size="xs"
                                fw={700}
                                tt="uppercase"
                                c="dimmed"
                              >
                                Time Period
                              </Text>
                              <Text size="sm" fw={600} mt={4}>
                                {editedDurationMinutes !== null &&
                                editedDurationMinutes > 0
                                  ? formatDurationMinutes(editedDurationMinutes)
                                  : "Enter a valid start and end time"}
                              </Text>
                            </Box>

                            <Stack gap="xs" className={classes.timeAdjustments}>
                              {[
                                {
                                  field: "startTime" as const,
                                  label: "Start Time",
                                  value: form.values.startTime,
                                },
                                {
                                  field: "endTime" as const,
                                  label: "End Time",
                                  value: form.values.endTime,
                                },
                              ].map(({ field, label, value }) => (
                                <Group
                                  key={field}
                                  gap="xs"
                                  wrap="wrap"
                                  className={classes.timeAdjustmentRow}
                                >
                                  <Text
                                    size="xs"
                                    fw={700}
                                    c="dimmed"
                                    className={classes.timeAdjustmentLabel}
                                  >
                                    {label}
                                  </Text>
                                  {TIME_ADJUSTMENTS.map((deltaMinutes) => (
                                    <Button
                                      key={`${field}-${deltaMinutes}`}
                                      size="xs"
                                      variant="light"
                                      onClick={() =>
                                        adjustTimeField(field, deltaMinutes)
                                      }
                                      disabled={!isValidHHmm(value)}
                                    >
                                      {formatTimeAdjustmentLabel(deltaMinutes)}
                                    </Button>
                                  ))}
                                </Group>
                              ))}
                            </Stack>
                          </Group>
                        </Paper>

                        <MultiSelect
                          label="Assigned Staff"
                          data={staffOptions}
                          searchable
                          nothingFoundMessage={
                            staffLoading || candidateLoading
                              ? "Loading staff..."
                              : "No staff"
                          }
                          rightSection={
                            candidateLoading ? <Loader /> : undefined
                          }
                          value={form.values.staff}
                          onChange={(value) => {
                            form.setFieldValue("staff", value);
                            form.setFieldValue(
                              "leadStaffId",
                              value.length === 1
                                ? value[0]
                                : value.includes(form.values.leadStaffId)
                                  ? form.values.leadStaffId
                                  : "",
                            );
                          }}
                        />

                        <Select
                          label="Team Lead"
                          description="Only the team lead or sole participant can update checklist items on the staff app."
                          data={selectedLeadOptions}
                          placeholder={
                            form.values.staff.length
                              ? "Select team lead"
                              : "Assign staff first"
                          }
                          disabled={!form.values.staff.length}
                          value={form.values.leadStaffId}
                          onChange={(value) =>
                            form.setFieldValue("leadStaffId", value ?? "")
                          }
                        />
                      </Stack>
                    </Paper>

                    <Paper
                      withBorder
                      radius="md"
                      p="lg"
                      className={classes.sectionCard}
                    >
                      <Group mb="md" gap="xs">
                        <ThemeIcon radius="md" variant="light" color="teal">
                          <IoPeople size={18} />
                        </ThemeIcon>
                        <Box>
                          <Text fw={700}>Team & Work Sessions</Text>
                          <Text size="sm" c="dimmed">
                            Assigned team members and all recorded work
                            activity.
                          </Text>
                        </Box>
                      </Group>

                      <Stack gap="sm">
                        {appointment.assignments?.length ? (
                          appointment.assignments.map((assignment) => {
                            const memberSessions = workSessions.filter(
                              (session) =>
                                session.staffId === assignment.staff.id,
                            );
                            const activeForMember = memberSessions.some(
                              (session) => !session.endedAt,
                            );

                            return (
                              <Paper
                                key={assignment.id}
                                withBorder
                                radius="md"
                                p="sm"
                                className={classes.timelineCard}
                              >
                                <Group
                                  justify="space-between"
                                  align="flex-start"
                                >
                                  <Box>
                                    <Group gap="xs">
                                      <Text fw={700} size="sm">
                                        {assignment.staff.name}
                                      </Text>
                                      {assignment.isTeamLead ? (
                                        <Badge
                                          color="teal"
                                          variant="light"
                                          size="sm"
                                        >
                                          Team Lead
                                        </Badge>
                                      ) : null}
                                    </Group>
                                    <Text size="xs" c="dimmed" mt={4}>
                                      {assignment.staff.email || "No email"}
                                    </Text>
                                  </Box>

                                  <Badge
                                    color={activeForMember ? "lime" : "gray"}
                                    variant="light"
                                  >
                                    {activeForMember ? "Active" : "Idle"}
                                  </Badge>
                                </Group>

                                {memberSessions.length ? (
                                  <Stack gap={6} mt="sm">
                                    {memberSessions.map((session) => {
                                      const sessionStaff = (
                                        session as WorkSession & {
                                          staff?: StaffUser;
                                        }
                                      ).staff;
                                      const sessionLabel =
                                        sessionStaff?.name ||
                                        assignment.staff.name;

                                      return (
                                        <Group
                                          key={session.id}
                                          justify="space-between"
                                          className={classes.inlineRow}
                                        >
                                          <Text size="sm">
                                            {sessionLabel}:{" "}
                                            {formatDateTime(session.startedAt)}
                                          </Text>
                                          <Text size="xs" c="dimmed">
                                            {session.endedAt
                                              ? formatDateTime(session.endedAt)
                                              : "Running"}
                                          </Text>
                                        </Group>
                                      );
                                    })}
                                  </Stack>
                                ) : (
                                  <Text size="sm" c="dimmed" mt="sm">
                                    No work sessions recorded yet.
                                  </Text>
                                )}
                              </Paper>
                            );
                          })
                        ) : (
                          <Text size="sm" c="dimmed">
                            No staff assigned to this appointment.
                          </Text>
                        )}
                      </Stack>
                    </Paper>

                    <Paper
                      withBorder
                      radius="md"
                      p="lg"
                      className={classes.sectionCard}
                    >
                      <Group mb="md" gap="xs">
                        <ThemeIcon radius="md" variant="light" color="lime">
                          <IoCheckmarkDone size={18} />
                        </ThemeIcon>
                        <Box>
                          <Text fw={700}>Checklist</Text>
                          <Text size="sm" c="dimmed">
                            Edit required steps and review completion progress.
                          </Text>
                        </Box>
                      </Group>

                      <ChecklistEditor
                        items={form.values.checklist}
                        disabled={false}
                        label="Appointment Checklist"
                        description="Existing completion states stay attached to retained items."
                        addLabel="Add checklist item"
                        onChange={(items) =>
                          form.setFieldValue("checklist", items)
                        }
                      />

                      {appointment.checklistItems?.length ? (
                        <Stack gap="xs" mt="md">
                          {appointment.checklistItems.map((item) => (
                            <Group
                              key={item.id}
                              justify="space-between"
                              className={classes.inlineRow}
                            >
                              <Text size="sm" fw={item.isCompleted ? 700 : 500}>
                                {item.label}
                              </Text>
                              <Badge
                                color={item.isCompleted ? "lime" : "gray"}
                                variant="light"
                              >
                                {item.isCompleted ? "Completed" : "Pending"}
                              </Badge>
                            </Group>
                          ))}
                        </Stack>
                      ) : null}
                    </Paper>
                  </Stack>

                  <Stack gap="lg">
                    <Paper
                      withBorder
                      radius="md"
                      p="lg"
                      className={classes.sectionCard}
                    >
                      <Group mb="md" gap="xs">
                        <ThemeIcon radius="md" variant="light" color="orange">
                          <IoDocumentText size={18} />
                        </ThemeIcon>
                        <Box>
                          <Text fw={700}>Visit Notes & Attachments</Text>
                          <Text size="sm" c="dimmed">
                            Latest note draft, historical visit notes, and
                            appointment images.
                          </Text>
                        </Box>
                      </Group>

                      <Textarea
                        id="appointment-note-textarea"
                        label="Latest Appointment Note"
                        description="This updates the current internal visit note draft."
                        autosize
                        minRows={3}
                        placeholder="Add internal note for this visit..."
                        {...form.getInputProps("note")}
                      />

                      {sortedAppointmentNotes.length ? (
                        <Stack gap="sm" mt="md">
                          {sortedAppointmentNotes.map((note) => (
                            <Paper
                              key={note.id}
                              withBorder
                              radius="md"
                              p="sm"
                              className={classes.timelineCard}
                            >
                              <Group
                                justify="space-between"
                                align="flex-start"
                                mb={6}
                              >
                                <Badge
                                  variant="light"
                                  color={note.isClientVisible ? "blue" : "gray"}
                                >
                                  {note.isClientVisible
                                    ? "Client visible"
                                    : "Internal"}
                                </Badge>

                                <Text size="xs" c="dimmed">
                                  {formatDateTime(note.createdAt)}
                                </Text>
                              </Group>

                              <Text size="sm">{note.content || "—"}</Text>

                              {!!note.images?.length && (
                                <Group mt="sm" wrap="wrap" gap="xs">
                                  {note.images.map((img) => (
                                    <ImageViewer
                                      key={img.id}
                                      src={img.url}
                                      alt="Visit note attachment"
                                      modalTitle="Visit Note Attachment"
                                    />
                                  ))}
                                </Group>
                              )}
                            </Paper>
                          ))}
                        </Stack>
                      ) : (
                        <Text size="sm" c="dimmed" mt="md">
                          No visit notes have been added yet.
                        </Text>
                      )}

                      {!!appointment.images?.length && (
                        <Stack gap="xs" mt="md">
                          <Text fw={600} size="sm">
                            Appointment Images
                          </Text>

                          <Group wrap="wrap" gap="xs">
                            {appointment.images.map((img) => (
                              <ImageViewer
                                key={img.id}
                                src={img.url}
                                alt="Appointment attachment"
                                modalTitle="Appointment Attachment"
                                overlay={
                                  <ActionIcon
                                    size="sm"
                                    variant="filled"
                                    color="dark"
                                    className={classes.thumbnailAction}
                                    loading={deleteImageMutation.isPending}
                                    onClick={() =>
                                      deleteImageMutation.mutate(img.id)
                                    }
                                    aria-label="Delete image"
                                  >
                                    <IoClose size={14} />
                                  </ActionIcon>
                                }
                              />
                            ))}
                          </Group>
                        </Stack>
                      )}
                    </Paper>

                    <Paper
                      withBorder
                      radius="md"
                      p="lg"
                      className={classes.sectionCard}
                    >
                      <Group mb="md" gap="xs">
                        <ThemeIcon radius="md" variant="light" color="grape">
                          <IoPricetag size={18} />
                        </ThemeIcon>
                        <Box>
                          <Text fw={700}>Job Context</Text>
                          <Text size="sm" c="dimmed">
                            Core job metadata, client details, line items, and
                            notes.
                          </Text>
                        </Box>
                      </Group>

                      <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        <ReadOnlyItem
                          icon={<IoDocumentText size={18} />}
                          label="Job Title"
                          value={appointment.job?.title || "—"}
                        />
                        <ReadOnlyItem
                          icon={<IoPricetag size={18} />}
                          label="Job Type"
                          value={appointment.job?.type || "—"}
                        />
                        <ReadOnlyItem
                          icon={<IoPerson size={18} />}
                          label="Client"
                          value={buildClientName(appointment.job?.client)}
                        />
                        <ReadOnlyItem
                          icon={<IoPeople size={18} />}
                          label="Preferred Contact"
                          value={
                            appointment.job?.client?.preferredContact || "—"
                          }
                        />
                        <ReadOnlyItem
                          icon={<IoCalendar size={18} />}
                          label="Created"
                          value={formatDateOnly(appointment.createdAt)}
                        />
                        <ReadOnlyItem
                          icon={<IoTimer size={18} />}
                          label="Recurrence"
                          value={recurrenceSummary}
                        />
                      </SimpleGrid>

                      <SimpleGrid
                        cols={{ base: 1, md: 2 }}
                        spacing="md"
                        mt="md"
                      >
                        <Paper
                          withBorder
                          radius="md"
                          p="md"
                          className={classes.infoCard}
                        >
                          <Text
                            size="xs"
                            fw={700}
                            tt="uppercase"
                            c="dimmed"
                            mb={8}
                          >
                            Service Address
                          </Text>
                          <Text size="sm">
                            {buildAddress(appointment.job?.address)}
                          </Text>
                        </Paper>

                        <Paper
                          withBorder
                          radius="md"
                          p="md"
                          className={classes.infoCard}
                        >
                          <Text
                            size="xs"
                            fw={700}
                            tt="uppercase"
                            c="dimmed"
                            mb={8}
                          >
                            Client Contact
                          </Text>
                          <Stack gap={4}>
                            <Text size="sm">
                              Email: {appointment.job?.client?.email || "—"}
                            </Text>
                            <Text size="sm">
                              Phone: {appointment.job?.client?.phone || "—"}
                            </Text>
                          </Stack>
                        </Paper>
                      </SimpleGrid>

                      {!!appointment.job?.visitInstructions && (
                        <Paper
                          withBorder
                          radius="md"
                          p="md"
                          mt="md"
                          className={classes.infoCard}
                        >
                          <Text
                            size="xs"
                            fw={700}
                            tt="uppercase"
                            c="dimmed"
                            mb={8}
                          >
                            Visit Instructions
                          </Text>
                          <Text size="sm">
                            {appointment.job.visitInstructions}
                          </Text>
                        </Paper>
                      )}

                      {!!appointment.job?.lineItems?.length && (
                        <Stack gap="sm" mt="md">
                          <Text fw={700} size="sm" tt="uppercase" c="dimmed">
                            Job Line Items
                          </Text>
                          {appointment.job.lineItems.map((item) => (
                            <Paper
                              key={item.id}
                              withBorder
                              radius="md"
                              p="sm"
                              className={classes.timelineCard}
                            >
                              <Group
                                justify="space-between"
                                align="flex-start"
                                mb={4}
                              >
                                <Text fw={600} size="sm">
                                  {item.name}
                                </Text>

                                <Badge variant="light">
                                  Qty {item.quantity}
                                  {item.total != null
                                    ? ` • Total ${item.total}`
                                    : ""}
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
                        <Stack gap="sm" mt="md">
                          <Text fw={700} size="sm" tt="uppercase" c="dimmed">
                            Job Notes
                          </Text>
                          {sortedJobNotes.map((note) => (
                            <Paper
                              key={note.id}
                              withBorder
                              radius="md"
                              p="sm"
                              className={classes.timelineCard}
                            >
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
                                    {note.isPinned ? (
                                      <Badge color="yellow" variant="light">
                                        Pinned
                                      </Badge>
                                    ) : null}
                                    {note.category ? (
                                      <Badge variant="outline">
                                        {note.category}
                                      </Badge>
                                    ) : null}
                                    <Badge
                                      variant="light"
                                      color={
                                        note.isClientVisible ? "blue" : "gray"
                                      }
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
                                    <ImageViewer
                                      key={img.id}
                                      src={img.url}
                                      alt="Job note attachment"
                                      modalTitle="Job Note Attachment"
                                    />
                                  ))}
                                </Group>
                              )}
                            </Paper>
                          ))}
                        </Stack>
                      )}
                    </Paper>
                  </Stack>
                </SimpleGrid>

                <Paper
                  withBorder
                  radius="md"
                  p="md"
                  className={classes.footerBar}
                >
                  <Group justify="space-between" wrap="wrap">
                    <Text size="sm" c="dimmed">
                      {visitNotesCount} visit note
                      {visitNotesCount === 1 ? "" : "s"} • {checklistTotalCount}{" "}
                      checklist item{checklistTotalCount === 1 ? "" : "s"} •{" "}
                      {workSessions.length} work session
                      {workSessions.length === 1 ? "" : "s"}
                    </Text>

                    <Group gap="xs">
                      <Button variant="default" onClick={handleClose}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={!form.isDirty()}>
                        Save Changes
                      </Button>
                    </Group>
                  </Group>
                </Paper>
              </Stack>
            </form>
          </Paper>
        </ScrollArea.Autosize>
      )}
    </Modal>
  );
}
