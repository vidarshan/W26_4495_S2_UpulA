"use client";

import {
  Modal,
  Stack,
  Grid,
  TextInput,
  Button,
  Group,
  Divider,
  Paper,
  Select,
  SegmentedControl,
  Textarea,
  NumberInput,
  MultiSelect,
  Flex,
  Card,
  Radio,
  Text,
  Image,
  Checkbox,
  Loader,
  Box,
  ActionIcon,
} from "@mantine/core";
import { DatePickerInput, TimeInput } from "@mantine/dates";
import { Dropzone } from "@mantine/dropzone";
import { useDebouncedValue } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { IoAddOutline, IoCloseOutline, IoImageOutline } from "react-icons/io5";
import { createJob, CreateJobPayload, JobFormValues } from "@/lib/api/jobs";
import { getClientAddresses, getClients } from "@/lib/api/client";
import { getStaff } from "@/lib/api/users";
import { runStaffRecommendationPreview } from "@/lib/api/appointments";
import {
  CalendarSelection,
  CandidateResponse,
  CandidateRecommendation,
  CandidateStaff,
  Client,
  Staff,
} from "@/types";
import { DateTime } from "luxon";
import { APP_TZ } from "@/lib/dateTime";
import { useUploadThing } from "@/lib/uploadthing";
import { notifications } from "@mantine/notifications";
import AIStaffSuggestionCard from "../cards/AIStaffSuggestionCard";
import { getAvailableStaff } from "@/lib/api/users";

interface Props {
  opened: boolean;
  onClose: () => void;
  selectedInfo: CalendarSelection | null;
  onSuccess: () => void;
}

type LineItem = {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  description: string;
};

type UploadedImage = { url: string; fileKey: string };

type JobNoteCategory =
  | "GENERAL"
  | "ACCESS"
  | "CLEANING"
  | "SAFETY"
  | "SUPPLIES"
  | "CLIENT_PREFERENCE";

type UploadedNoteImage = {
  url: string;
  fileKey: string;
};

type JobNoteInput = {
  id: string;
  title: string;
  content: string;
  category: JobNoteCategory | "";
  isClientVisible: boolean;
  isPinned: boolean;
  images: File[];
  uploadedImages: UploadedNoteImage[];
};

type AppointmentForm = {
  id: string;
  startDate: string | null;
  startTime: string;
  endTime: string;
  staffId: string[];
  notes: string;
  uploadedImages: UploadedImage[];
};

type RecurrenceForm = {
  frequency: "weekly" | "monthly";
  interval: number;
  endType: "after" | "on";
  endsAfter: number;
  endsUnit: "weeks" | "months";
  endsOn: Date | null;
};

type JobFormValuesWithRecurrence = {
  title: string;
  clientId: string;
  addressId: string;
  jobType: "ONE_OFF" | "RECURRING";
  isAnytime: boolean;
  visitInstructions: string;
  notes: JobNoteInput[];
  recurrence: RecurrenceForm;
  appointments: AppointmentForm[];
  lineItems: LineItem[];
};

type AppointmentApiPayload = {
  date: string;
  startTime: string | null;
  endTime: string | null;
  staffIds: string[];
  note?: string | null;
  images?: Array<{ url: string; fileKey?: string | null }>;
};

function jsDateToHHmm(d: Date) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const dt = DateTime.fromJSDate(d, { zone: APP_TZ });
  return dt.isValid ? dt.toFormat("HH:mm") : "";
}

function buildAppointmentWindow(
  appointment: AppointmentForm,
  isAnytime: boolean,
) {
  if (!appointment.startDate || isAnytime) return null;
  if (!appointment.startTime.trim() || !appointment.endTime.trim()) return null;

  const start = DateTime.fromFormat(
    `${appointment.startDate} ${appointment.startTime.trim()}`,
    "yyyy-LL-dd HH:mm",
    { zone: APP_TZ },
  );
  const end = DateTime.fromFormat(
    `${appointment.startDate} ${appointment.endTime.trim()}`,
    "yyyy-LL-dd HH:mm",
    { zone: APP_TZ },
  );

  if (!start.isValid || !end.isValid || end <= start) return null;

  return {
    appointmentStart: start.toUTC().toISO(),
    appointmentEnd: end.toUTC().toISO(),
  };
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

  return data as CandidateResponse;
}

export function toYMD(d: string | null) {
  if (!d) return "";

  const iso = DateTime.fromISO(d, { zone: APP_TZ });
  if (iso.isValid) return iso.toFormat("yyyy-LL-dd");

  const local = DateTime.fromFormat(d, "yyyy-LL-dd", { zone: APP_TZ });
  if (local.isValid) return local.toFormat("yyyy-LL-dd");

  return "";
}
const mapAppt = (appt: AppointmentForm): AppointmentApiPayload => {
  const date = toYMD(appt.startDate);

  return {
    date,
    startTime: appt.startTime?.trim() ? appt.startTime.trim() : null,
    endTime: appt.endTime?.trim() ? appt.endTime.trim() : null,
    staffIds: Array.isArray(appt.staffId) ? appt.staffId : [],
    note: appt.notes?.trim() ? appt.notes.trim() : null,
    images: appt.uploadedImages?.length
      ? appt.uploadedImages.map((img) => ({
          url: img.url,
          fileKey: img.fileKey ?? null,
        }))
      : undefined,
  };
};

const isMeaningfulAppointment = (appt: AppointmentForm) => {
  return !!(
    appt.startDate ||
    appt.startTime.trim() ||
    appt.endTime.trim() ||
    appt.staffId.length ||
    appt.notes.trim() ||
    appt.uploadedImages.length
  );
};

function blankJobNote(): JobNoteInput {
  return {
    id: crypto.randomUUID(),
    title: "",
    content: "",
    category: "",
    isClientVisible: false,
    isPinned: false,
    images: [],
    uploadedImages: [],
  };
}

function blankAppointment(): AppointmentForm {
  return {
    id: crypto.randomUUID(),
    startDate: null,
    startTime: "",
    endTime: "",
    staffId: [],
    notes: "",
    uploadedImages: [],
  };
}

function buildInitialValues(
  selectedInfo: CalendarSelection | null,
): JobFormValuesWithRecurrence {
  const startDate = selectedInfo?.start
    ? DateTime.fromJSDate(selectedInfo.start, { zone: APP_TZ }).toFormat(
        "yyyy-LL-dd",
      )
    : null;
  const startTime = selectedInfo?.start
    ? selectedInfo.allDay
      ? "09:00"
      : jsDateToHHmm(selectedInfo.start)
    : "";
  const endTime = selectedInfo?.end
    ? selectedInfo.allDay
      ? "11:00"
      : jsDateToHHmm(selectedInfo.end)
    : "";

  return {
    title: "",
    clientId: "",
    addressId: "",
    jobType: "ONE_OFF",
    isAnytime: false,
    visitInstructions: "",
    notes: [blankJobNote()],
    lineItems: [
      {
        id: crypto.randomUUID(),
        name: "",
        quantity: 1,
        unitCost: 0,
        unitPrice: 0,
        description: "",
      },
    ],
    appointments: [
      {
        ...blankAppointment(),
        startDate,
        startTime,
        endTime,
      },
    ],
    recurrence: {
      frequency: "weekly",
      interval: 1,
      endType: "after",
      endsAfter: 6,
      endsUnit: "weeks",
      endsOn: null,
    },
  };
}

export default function NewJobModal({
  opened,
  onClose,
  selectedInfo,
  onSuccess,
}: Props) {
  const queryClient = useQueryClient();
  const { startUpload, isUploading } = useUploadThing("appointmentImages");
  const initializedSelectionKeyRef = useRef<string | null>(null);

  const initialValues = useMemo(
    () => buildInitialValues(selectedInfo),
    [selectedInfo],
  );

  const form = useForm<JobFormValuesWithRecurrence>({
    mode: "controlled",
    initialValues,
    validate: {
      title: (v) => (!v.trim() ? "Title is required" : null),
      clientId: (v) => (!v ? "Client is required" : null),
      addressId: (v) => (!v ? "Address is required" : null),
      notes: {
        title: (_, values, path) => {
          const match = path.match(/^notes\.(\d+)\.title$/);
          const index = match ? Number(match[1]) : -1;
          const note = values.notes[index];
          if (!note) return null;

          const hasAnyValue =
            !!note.title.trim() ||
            !!note.content.trim() ||
            !!note.category ||
            note.isClientVisible ||
            note.isPinned ||
            note.uploadedImages.length > 0;

          if (hasAnyValue && !note.content.trim()) {
            return "Note content is required";
          }

          return null;
        },
        content: (_, values, path) => {
          const match = path.match(/^notes\.(\d+)\.content$/);
          const index = match ? Number(match[1]) : -1;
          const note = values.notes[index];
          if (!note) return null;

          const hasAnyValue =
            !!note.title.trim() ||
            !!note.content.trim() ||
            !!note.category ||
            note.isClientVisible ||
            note.isPinned ||
            note.uploadedImages.length > 0;

          if (hasAnyValue && !note.content.trim()) {
            return "Note content is required";
          }

          return null;
        },
      },
      recurrence: {
        interval: (v, values) =>
          values.jobType === "RECURRING" && (!v || v < 1)
            ? "Interval must be at least 1"
            : null,
        endsAfter: (v, values) =>
          values.jobType === "RECURRING" &&
          values.recurrence.endType === "after" &&
          (!v || v < 1)
            ? "Must be at least 1"
            : null,
        endsOn: (v, values) =>
          values.jobType === "RECURRING" &&
          values.recurrence.endType === "on" &&
          !v
            ? "End date is required"
            : null,
      },
    },
  });

  const [searchClients, setSearchClients] = useState("");
  const [searchAssignees, setSearchAssignees] = useState("");
  const [debouncedSearchClients] = useDebouncedValue(searchClients, 300);
  const [debouncedSearchAssignees] = useDebouncedValue(searchAssignees, 300);

  const {
    data: clientsData,
    isLoading: clientsLoading,
    isFetching: clientsFetching,
    isError: clientsError,
  } = useQuery({
    queryKey: ["clients", debouncedSearchClients],
    queryFn: () => getClients(debouncedSearchClients),
    enabled: opened,
  });

  const {
    data: staffData,
    isLoading: staffLoading,
    isFetching: staffFetching,
    isError: staffError,
  } = useQuery({
    queryKey: [
      "staff",
      { q: debouncedSearchAssignees, paginate: false },
    ] as const,
    queryFn: () => getStaff(),
    staleTime: 60_000,
    enabled: opened,
  });

  const appointmentCandidateQueries = useQueries({
    queries: form.values.appointments.map((appointment) => {
      const window = buildAppointmentWindow(appointment, form.values.isAnytime);
      const enabled =
        opened &&
        !!form.values.addressId &&
        !!window?.appointmentStart &&
        !!window?.appointmentEnd;

      return {
        queryKey: [
          "assignment-candidates",
          form.values.addressId,
          appointment.id,
          window?.appointmentStart ?? null,
          window?.appointmentEnd ?? null,
        ],
        queryFn: () =>
          getAssignmentCandidates(
            form.values.addressId,
            window!.appointmentStart!,
            window!.appointmentEnd!,
          ),
        enabled,
        staleTime: 60_000,
      };
    }),
  });

  const appointmentStaffRecommendationQueries = useQueries({
    queries: form.values.appointments.map((appointment) => {
      const window = buildAppointmentWindow(appointment, form.values.isAnytime);
      const candidateQuery = appointmentCandidateQueries.find(
        (query, index) =>
          form.values.appointments[index]?.id === appointment.id,
      );
      const candidateData = candidateQuery?.data?.data;
      const enabled =
        opened &&
        !!candidateData &&
        !!window?.appointmentStart &&
        !!window?.appointmentEnd;

      return {
        queryKey: [
          "staff-recommendation-preview",
          appointment.id,
          window?.appointmentStart ?? null,
          window?.appointmentEnd ?? null,
          form.values.title,
          candidateData?.recommendedMembers?.length ?? 0,
          candidateData?.staffMembers?.length ?? 0,
        ],
        queryFn: () =>
          runStaffRecommendationPreview({
            appointmentStart: window!.appointmentStart!,
            appointmentEnd: window!.appointmentEnd!,
            jobTitle: form.values.title.trim() || "Draft job",
            candidateData: candidateData!,
          }),
        enabled,
        staleTime: 60_000,
        retry: 1,
      };
    }),
  });

  const {
    data: addressesData,
    isLoading: addressesLoading,
    isFetching: addressesFetching,
    isError: addressesError,
  } = useQuery({
    queryKey: ["client-addresses", form.values.clientId],
    queryFn: () => getClientAddresses(form.values.clientId),
    enabled: opened && !!form.values.clientId,
  });

  const resetModalState = () => {
    const next = buildInitialValues(selectedInfo);
    form.setValues(next);
    form.resetDirty(next);
    form.clearErrors();
    setSearchClients("");
    setSearchAssignees("");
  };

  const createJobMutation = useMutation({
    mutationFn: (payload: CreateJobPayload) => createJob(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar"] }),
      ]);

      notifications.show({
        title: "Success",
        message: "Job created successfully",
        color: "green",
      });

      resetModalState();
      onSuccess();
      onClose();
    },
    onError: (error) => {
      console.error(error);
      notifications.show({
        title: "Failed",
        message: "Could not create job. Please try again.",
        color: "red",
      });
    },
  });

  const isSubmitting = createJobMutation.isPending;
  const isBusy = isSubmitting || isUploading;

  const addLineItem = () => {
    form.setFieldValue("lineItems", [
      ...form.values.lineItems,
      {
        id: crypto.randomUUID(),
        name: "",
        quantity: 1,
        unitCost: 0,
        unitPrice: 0,
        description: "",
      },
    ]);
  };

  const addAppointment = () => {
    if (form.values.jobType === "RECURRING") return;

    form.setFieldValue("appointments", [
      ...form.values.appointments,
      blankAppointment(),
    ]);
  };

  const addJobNote = () => {
    form.setFieldValue("notes", [...form.values.notes, blankJobNote()]);
  };

  const removeJobNote = (id: string) => {
    form.setFieldValue(
      "notes",
      form.values.notes.filter((note) => note.id !== id),
    );
  };

  const removeNoteImage = (noteIndex: number, fileKey: string) => {
    const current = form.values.notes[noteIndex];
    if (!current) return;

    form.setFieldValue(
      `notes.${noteIndex}.uploadedImages`,
      current.uploadedImages.filter((img) => img.fileKey !== fileKey),
    );
  };

  const handleClose = () => {
    if (isBusy) return;
    resetModalState();
    onClose();
  };

  const allDay = !!selectedInfo?.allDay;

  useEffect(() => {
    if (!opened) return;
    resetModalState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, selectedInfo]);

  useEffect(() => {
    if (!opened || !selectedInfo?.start) return;

    const startDT = DateTime.fromJSDate(selectedInfo.start, { zone: APP_TZ });
    const endDT = selectedInfo.end
      ? DateTime.fromJSDate(selectedInfo.end, { zone: APP_TZ })
      : null;

    if (!startDT.isValid) return;

    const startDate = startDT.toFormat("yyyy-LL-dd");
    const startTime = allDay ? "09:00" : startDT.toFormat("HH:mm");
    const computedEndTime = allDay
      ? "11:00"
      : endDT && endDT.isValid && endDT > startDT
        ? endDT.toFormat("HH:mm")
        : startDT.plus({ minutes: 30 }).toFormat("HH:mm");

    form.setFieldValue("appointments.0.startDate", startDate);
    form.setFieldValue("appointments.0.startTime", startTime);
    form.setFieldValue("appointments.0.endTime", computedEndTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, selectedInfo, allDay]);

  useEffect(() => {
    if (form.values.jobType !== "RECURRING") return;

    if (form.values.recurrence.endType === "after") {
      if (form.values.recurrence.endsOn) {
        form.setFieldValue("recurrence.endsOn", null);
      }
      if (
        !form.values.recurrence.endsAfter ||
        form.values.recurrence.endsAfter < 1
      ) {
        form.setFieldValue("recurrence.endsAfter", 6);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values.jobType, form.values.recurrence.endType]);

  const handleSubmit = async (values: JobFormValuesWithRecurrence) => {
    form.clearErrors();

    const visitInstructions =
      values.visitInstructions && values.visitInstructions.trim().length
        ? values.visitInstructions.trim()
        : undefined;

    const visibleAppointments =
      values.jobType === "RECURRING"
        ? [values.appointments[0]]
        : values.appointments.filter(isMeaningfulAppointment);

    const appointments = visibleAppointments.map(mapAppt);

    for (const [index, appt] of appointments.entries()) {
      if (!appt.date) {
        form.setFieldError(
          `appointments.${index}.startDate`,
          "Date is required",
        );
        return;
      }

      if (!values.isAnytime && !appt.startTime?.trim()) {
        form.setFieldError(
          `appointments.${index}.startTime`,
          "Start time is required",
        );
        return;
      }

      if (!values.isAnytime && !appt.endTime?.trim()) {
        form.setFieldError(
          `appointments.${index}.endTime`,
          "End time is required",
        );
        return;
      }
    }

    const notes = values.notes
      .filter(
        (note) =>
          note.content.trim() ||
          note.title.trim() ||
          note.uploadedImages.length > 0,
      )
      .map((note) => ({
        title: note.title.trim() || undefined,
        content: note.content.trim() || "",
        category: note.category || undefined,
        isClientVisible: note.isClientVisible,
        isPinned: note.isPinned,
        images: note.uploadedImages.map((img) => ({
          url: img.url,
          fileKey: img.fileKey,
        })),
      }));

    const payload: CreateJobPayload = {
      title: values.title,
      clientId: values.clientId,
      addressId: values.addressId,
      jobType: values.jobType,
      isAnytime: values.isAnytime,
      ...(visitInstructions ? { visitInstructions } : {}),
      notes,
      lineItems: values.lineItems.map((li) => ({
        name: li.name,
        quantity: li.quantity,
        unitCost: li.unitCost ?? null,
        unitPrice: li.unitPrice ?? null,
        ...(li.description?.trim()
          ? { description: li.description.trim() }
          : {}),
      })),
      ...(values.jobType === "RECURRING"
        ? {
            recurrence: {
              frequency: values.recurrence.frequency,
              interval: values.recurrence.interval,
              endType: values.recurrence.endType,
              endsAfter:
                values.recurrence.endType === "after"
                  ? values.recurrence.endsAfter
                  : null,
              endsOn:
                values.recurrence.endType === "on" && values.recurrence.endsOn
                  ? DateTime.fromJSDate(values.recurrence.endsOn, {
                      zone: APP_TZ,
                    }).toFormat("yyyy-LL-dd")
                  : null,
            },
          }
        : {}),
      appointments,
    };

    createJobMutation.mutate(payload);
  };

  const renderJobNotes = () =>
    form.values.notes.map((note, index) => (
      <Card withBorder mt="sm" key={note.id}>
        <Grid>
          <Grid.Col span={6}>
            <TextInput
              label="Note title"
              placeholder="e.g. Gate access"
              disabled={isBusy}
              {...form.getInputProps(`notes.${index}.title`)}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <Select
              label="Category"
              placeholder="Select category"
              disabled={isBusy}
              data={[
                { value: "GENERAL", label: "General" },
                { value: "ACCESS", label: "Access" },
                { value: "CLEANING", label: "Cleaning" },
                { value: "SAFETY", label: "Safety" },
                { value: "SUPPLIES", label: "Supplies" },
                { value: "CLIENT_PREFERENCE", label: "Client Preference" },
              ]}
              {...form.getInputProps(`notes.${index}.category`)}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <Textarea
              label="Content"
              placeholder="Enter note details"
              minRows={3}
              disabled={isBusy}
              {...form.getInputProps(`notes.${index}.content`)}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <Group>
              <Checkbox
                label="Visible to client"
                disabled={isBusy}
                checked={form.values.notes[index].isClientVisible}
                onChange={(event) =>
                  form.setFieldValue(
                    `notes.${index}.isClientVisible`,
                    event.currentTarget.checked,
                  )
                }
              />
              <Checkbox
                label="Pinned"
                disabled={isBusy}
                checked={form.values.notes[index].isPinned}
                onChange={(event) =>
                  form.setFieldValue(
                    `notes.${index}.isPinned`,
                    event.currentTarget.checked,
                  )
                }
              />
            </Group>
          </Grid.Col>

          <Grid.Col span={12}>
            <Dropzone
              accept={["image/png", "image/jpeg", "image/webp"]}
              maxFiles={10}
              disabled={isBusy}
              onDrop={async (files) => {
                const currentNote = form.values.notes[index];
                const existingFiles = currentNote?.images || [];
                const nextFiles = [...existingFiles, ...files].slice(0, 10);

                form.setFieldValue(`notes.${index}.images`, nextFiles);

                try {
                  const uploaded = await startUpload(files);

                  const imgs: UploadedNoteImage[] = (uploaded ?? []).map(
                    (u) => ({
                      url: u.url,
                      fileKey: u.key,
                    }),
                  );

                  const latestUploaded =
                    form.values.notes[index]?.uploadedImages || [];

                  form.setFieldValue(`notes.${index}.uploadedImages`, [
                    ...latestUploaded,
                    ...imgs,
                  ]);
                } catch (error) {
                  console.error(error);
                  notifications.show({
                    title: "Upload failed",
                    message: "Could not upload note images.",
                    color: "red",
                  });
                }
              }}
            >
              <Flex direction="column" align="center">
                <IoImageOutline size={24} />
                <Text mt="xs" size="xs">
                  Drag note images here or click to upload
                </Text>
                {isUploading && (
                  <Text mt="xs" size="xs" c="dimmed">
                    Uploading...
                  </Text>
                )}
              </Flex>
            </Dropzone>

            {form.values.notes[index]?.uploadedImages?.length ? (
              <Group mt="sm">
                {form.values.notes[index].uploadedImages.map((img) => (
                  <Box key={img.fileKey} pos="relative">
                    <Image
                      src={img.url}
                      alt="note_image"
                      w={80}
                      h={80}
                      radius="md"
                      fit="cover"
                    />
                    <ActionIcon
                      size="sm"
                      radius="xl"
                      color="red"
                      variant="filled"
                      style={{ position: "absolute", top: 4, right: 4 }}
                      onClick={() => removeNoteImage(index, img.fileKey)}
                      disabled={isBusy}
                    >
                      <IoCloseOutline size={14} />
                    </ActionIcon>
                  </Box>
                ))}
              </Group>
            ) : null}
          </Grid.Col>

          <Grid.Col span={12}>
            <Button
              color="red"
              variant="light"
              type="button"
              disabled={isBusy || form.values.notes.length === 1}
              onClick={() => removeJobNote(note.id)}
            >
              Remove Note
            </Button>
          </Grid.Col>
        </Grid>
      </Card>
    ));

  const renderAppointments = () =>
    form.values.appointments.map((appt, index) => {
      const shouldFetch =
        opened &&
        !!appt.startDate &&
        !!appt.startTime &&
        !!appt.endTime &&
        appt.endTime > appt.startTime;

      const {
        data: staffData,
        isLoading: staffLoading,
        isFetching: staffFetching,
        isError: staffError,
      } = useQuery<Staff[]>({
        queryKey: [
          "available-staff",
          appt.startDate,
          appt.startTime,
          appt.endTime,
          debouncedSearchAssignees,
        ],
        queryFn: () =>
          getAvailableStaff({
            date: appt.startDate!,
            startTime: appt.startTime || "",
            endTime: appt.endTime || "",
            q: debouncedSearchAssignees,
          }),
        enabled: shouldFetch,
        staleTime: 30_000,
      });

      return (
        <Card withBorder mt="sm" key={appt.id}>
          <Grid>
            <Grid.Col span={4}>
              <DatePickerInput
                label="Date"
                {...form.getInputProps(`appointments.${index}.startDate`)}
              />
            </Grid.Col>

            <Grid.Col span={4}>
              <TimeInput
                label="Start"
                {...form.getInputProps(`appointments.${index}.startTime`)}
              />
            </Grid.Col>

            <Grid.Col span={4}>
              <TimeInput
                label="End"
                {...form.getInputProps(`appointments.${index}.endTime`)}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <MultiSelect
                label="Staff"
                searchable
                placeholder={
                  !shouldFetch
                    ? "Select date & time first"
                    : staffLoading
                      ? "Loading staff..."
                      : staffError
                        ? "Failed to load staff"
                        : "Assign staff"
                }
                rightSection={
                  staffFetching ? <Loader size="xs" /> : undefined
                }
                data={
                  staffData?.map((s) => ({
                    value: s.id,
                    label: s.name || s.email,
                  })) || []
                }
                onSearchChange={setSearchAssignees}
                {...form.getInputProps(`appointments.${index}.staffId`)}
              />
            </Grid.Col>
          </Grid>
        </Card>
      );
    });

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      size="xl"
      title="New Job"
      centered
      closeOnClickOutside={!isBusy}
      closeOnEscape={!isBusy}
      withCloseButton={!isBusy}
      classNames={{
        header: "app-modal__header",
        title: "app-modal__title",
      }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="sm">
          {(isUploading || isSubmitting) && (
            <Paper p="sm" radius="md" withBorder bg="gray.0">
              <Group gap="xs">
                <Loader size="sm" />
                <Text size="sm">
                  {isUploading
                    ? "Uploading images. Please wait..."
                    : "Saving job..."}
                </Text>
              </Group>
            </Paper>
          )}

          <Paper>
            <SegmentedControl
              mt="sm"
              color="lime"
              value={form.values.jobType}
              disabled={isBusy}
              onChange={(value) =>
                form.setFieldValue("jobType", value as JobFormValues["jobType"])
              }
              data={[
                { label: "One-off", value: "ONE_OFF" },
                { label: "Recurring", value: "RECURRING" },
              ]}
            />

            <TextInput
              mt="sm"
              label="Title"
              placeholder="Job Title"
              disabled={isBusy}
              {...form.getInputProps("title")}
            />

            <Grid mt="sm">
              <Grid.Col span={6}>
                <Select
                  label="Client"
                  searchable
                  disabled={clientsLoading || isBusy}
                  placeholder={
                    clientsLoading
                      ? "Loading clients..."
                      : clientsError
                        ? "Failed to load clients"
                        : "Select client"
                  }
                  rightSection={
                    clientsFetching ? <Loader size="xs" /> : undefined
                  }
                  {...form.getInputProps("clientId")}
                  data={
                    clientsData?.data?.map((c: Client) => ({
                      value: c.id,
                      label: c.companyName || `${c.firstName} ${c.lastName}`,
                    })) || []
                  }
                  onSearchChange={setSearchClients}
                />
              </Grid.Col>

              <Grid.Col span={6}>
                <Select
                  label="Client Address"
                  disabled={!form.values.clientId || addressesLoading || isBusy}
                  placeholder={
                    !form.values.clientId
                      ? "Select client first"
                      : addressesLoading
                        ? "Loading addresses..."
                        : addressesError
                          ? "Failed to load addresses"
                          : "Select address"
                  }
                  rightSection={
                    addressesFetching ? <Loader size="xs" /> : undefined
                  }
                  {...form.getInputProps("addressId")}
                  data={
                    addressesData?.data?.map((a) => ({
                      value: a.id,
                      label: `${a.street1}, ${a.city}, ${a.province}`,
                    })) || []
                  }
                />
              </Grid.Col>
            </Grid>

            <Divider my="sm" />

            <Group align="center" justify="space-between">
              <Text fw={500}>Services</Text>
              <Button
                leftSection={<IoAddOutline />}
                size="xs"
                type="button"
                disabled={isBusy}
                onClick={addLineItem}
              >
                Add Line Item
              </Button>
            </Group>

            {form.values.lineItems.map((item, index) => (
              <Card withBorder mt="sm" key={item.id}>
                <Grid>
                  <Grid.Col span={6}>
                    <TextInput
                      label="Name"
                      placeholder="Service Name"
                      disabled={isBusy}
                      {...form.getInputProps(`lineItems.${index}.name`)}
                    />
                  </Grid.Col>
                  <Grid.Col span={2}>
                    <NumberInput
                      label="Qty"
                      placeholder="Service Qty"
                      min={1}
                      disabled={isBusy}
                      {...form.getInputProps(`lineItems.${index}.quantity`)}
                    />
                  </Grid.Col>
                  <Grid.Col span={2}>
                    <NumberInput
                      label="Unit Cost"
                      min={0}
                      prefix="$"
                      disabled={isBusy}
                      {...form.getInputProps(`lineItems.${index}.unitCost`)}
                    />
                  </Grid.Col>
                  <Grid.Col span={2}>
                    <NumberInput
                      label="Unit Price"
                      min={0}
                      prefix="$"
                      disabled={isBusy}
                      {...form.getInputProps(`lineItems.${index}.unitPrice`)}
                    />
                  </Grid.Col>
                </Grid>

                <Textarea
                  mt="sm"
                  label="Description"
                  disabled={isBusy}
                  {...form.getInputProps(`lineItems.${index}.description`)}
                />
              </Card>
            ))}

            <Divider my="sm" />

            {form.values.jobType === "RECURRING" && (
              <Card withBorder mt="sm">
                <Text fw={500} mb="xs">
                  Recurrence
                </Text>

                <Grid>
                  <Grid.Col span={6}>
                    <Select
                      label="Frequency"
                      disabled={isBusy}
                      data={[
                        { value: "weekly", label: "Weekly" },
                        { value: "monthly", label: "Monthly" },
                      ]}
                      value={form.values.recurrence.frequency}
                      onChange={(v: string | null) =>
                        form.setFieldValue(
                          "recurrence.frequency",
                          (v ?? "weekly") as RecurrenceForm["frequency"],
                        )
                      }
                    />
                  </Grid.Col>

                  <Grid.Col span={6}>
                    <NumberInput
                      label={`Every (${form.values.recurrence.frequency === "weekly" ? "weeks" : "months"})`}
                      min={1}
                      disabled={isBusy}
                      value={form.values.recurrence.interval}
                      onChange={(v) =>
                        form.setFieldValue(
                          "recurrence.interval",
                          Number(v) || 1,
                        )
                      }
                    />
                  </Grid.Col>

                  <Grid.Col span={12}>
                    <Radio.Group
                      label="Ends"
                      value={form.values.recurrence.endType}
                      onChange={(v: string) =>
                        form.setFieldValue(
                          "recurrence.endType",
                          v as RecurrenceForm["endType"],
                        )
                      }
                    >
                      <Stack gap="xs" mt="xs">
                        <Radio value="after" label="After" disabled={isBusy} />
                        <Radio value="on" label="On date" disabled={isBusy} />
                      </Stack>
                    </Radio.Group>
                  </Grid.Col>

                  {form.values.recurrence.endType === "after" && (
                    <Grid.Col span={6}>
                      <NumberInput
                        label="Occurrences"
                        min={1}
                        disabled={isBusy}
                        value={form.values.recurrence.endsAfter}
                        onChange={(v) =>
                          form.setFieldValue(
                            "recurrence.endsAfter",
                            Number(v) || 1,
                          )
                        }
                      />
                    </Grid.Col>
                  )}

                  {form.values.recurrence.endType === "on" && (
                    <Grid.Col span={6}>
                      <DatePickerInput
                        label="End date"
                        placeholder="End date"
                        disabled={isBusy}
                        value={form.values.recurrence.endsOn ?? null}
                        onChange={(d) =>
                          form.setFieldValue(
                            "recurrence.endsOn",
                            d as Date | null,
                          )
                        }
                        minDate={
                          form.values.appointments?.[0]?.startDate ?? undefined
                        }
                      />
                    </Grid.Col>
                  )}
                </Grid>
              </Card>
            )}

            <Group align="center" justify="space-between" mt="sm">
              <Text fw={500}>Appointments</Text>
              <Button
                leftSection={<IoAddOutline />}
                size="xs"
                type="button"
                disabled={isBusy || form.values.jobType === "RECURRING"}
                onClick={addAppointment}
              >
                Add Appointment
              </Button>
            </Group>

            {renderAppointments()}
          </Paper>

          <Divider my="sm" />

          <Group align="center" justify="space-between">
            <Text fw={500}>Notes</Text>
            <Button
              leftSection={<IoAddOutline />}
              size="xs"
              type="button"
              disabled={isBusy}
              onClick={addJobNote}
            >
              Add Notes
            </Button>
          </Group>

          {renderJobNotes()}

          <Group justify="right" mt="md">
            <Button
              variant="default"
              onClick={handleClose}
              type="button"
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              color="green"
              loading={isSubmitting}
              disabled={isBusy}
            >
              {isUploading ? "Uploading..." : "Save Job"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
