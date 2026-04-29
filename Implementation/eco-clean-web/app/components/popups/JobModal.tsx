"use client";

import {
  Badge,
  Modal,
  Stack,
  Grid,
  TextInput,
  Button,
  Group,
  Paper,
  Select,
  SegmentedControl,
  Textarea,
  NumberInput,
  MultiSelect,
  Flex,
  Radio,
  Text,
  Checkbox,
  ActionIcon,
  ScrollArea,
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
import { useEffect, useMemo, useState } from "react";
import { IoClose, IoImage } from "@/lib/icons";
import { createJob, CreateJobPayload, JobFormValues } from "@/lib/api/jobs";
import { getClientAddresses, getClients } from "@/lib/api/client";
import { getStaff } from "@/lib/api/users";
import { runStaffRecommendationPreview } from "@/lib/api/appointments";
import {
  CalendarSelection,
  CandidateResponse,
  CandidateStaff,
  Client,
  Staff,
} from "@/types";
import { DateTime } from "luxon";
import { AI_FEATURES_ENABLED } from "@/lib/config/ai";
import { formatStaffOptionLabel } from "@/lib/appointments/staffAvailability";
import { appDateKeyToDate, APP_TZ } from "@/lib/dateTime";
import { useUploadThing } from "@/lib/uploadthing";
import { notifications } from "@mantine/notifications";
import AIStaffSuggestionCard from "../cards/AIStaffSuggestionCard";
import ChecklistEditor, {
  ChecklistDraftItem,
} from "../appointments/ChecklistEditor";
import ImageViewer from "../media/ImageViewer";
import classes from "./JobModal.module.css";
import Loader from "../UI/Loader";

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
  leadStaffId: string;
  checklist: ChecklistDraftItem[];
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
  leadStaffId?: string | null;
  checklist?: Array<{
    id?: string;
    label: string;
  }>;
  note?: string | null;
  images?: Array<{ url: string; fileKey?: string | null }>;
};

const SUPPORTED_SHIFT_START = "03:00";
const SUPPORTED_SHIFT_END = "22:00";

function toTotalMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function getAppointmentTimeError(startTime: string, endTime: string) {
  const startMinutes = toTotalMinutes(startTime.trim());
  const endMinutes = toTotalMinutes(endTime.trim());
  const supportedStartMinutes = toTotalMinutes(SUPPORTED_SHIFT_START);
  const supportedEndMinutes = toTotalMinutes(SUPPORTED_SHIFT_END);

  if (
    startMinutes === null ||
    endMinutes === null ||
    supportedStartMinutes === null ||
    supportedEndMinutes === null
  ) {
    return "Enter a valid time";
  }

  if (endMinutes <= startMinutes) {
    return "End time must be later than start time";
  }

  if (
    startMinutes < supportedStartMinutes ||
    endMinutes > supportedEndMinutes
  ) {
    return `Appointments must stay within ${SUPPORTED_SHIFT_START} to ${SUPPORTED_SHIFT_END}`;
  }

  return null;
}

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

  if (
    !start.isValid ||
    !end.isValid ||
    getAppointmentTimeError(appointment.startTime, appointment.endTime)
  ) {
    return null;
  }

  return {
    appointmentStart: start.toUTC().toISO(),
    appointmentEnd: end.toUTC().toISO(),
  };
}

function toRecurrenceEndsOnDate(value: Date | string | null | undefined) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const formatted = DateTime.fromFormat(value, "yyyy-LL-dd", {
      zone: APP_TZ,
    });
    if (formatted.isValid) {
      return formatted.startOf("day").toJSDate();
    }

    const iso = DateTime.fromISO(value, { zone: APP_TZ });
    if (iso.isValid) {
      return iso.startOf("day").toJSDate();
    }
  }

  return null;
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
    leadStaffId: appt.leadStaffId.trim() || null,
    checklist: appt.checklist
      .map((item) => ({
        ...(item.persistedId ? { id: item.persistedId } : {}),
        label: item.label.trim(),
      }))
      .filter((item) => item.label.length > 0),
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
    appt.checklist.some((item) => item.label.trim()) ||
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
    leadStaffId: "",
    checklist: [],
    notes: "",
    uploadedImages: [],
  };
}

function getNextLeadStaffId(staffIds: string[], currentLeadStaffId: string) {
  if (staffIds.length === 1) return staffIds[0];
  if (currentLeadStaffId && staffIds.includes(currentLeadStaffId)) {
    return currentLeadStaffId;
  }
  return "";
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
  const aiFeaturesEnabled = AI_FEATURES_ENABLED;

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
        aiFeaturesEnabled &&
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

  const removeLineItem = (id: string) => {
    if (form.values.lineItems.length === 1) {
      form.setFieldValue("lineItems", [
        {
          id: crypto.randomUUID(),
          name: "",
          quantity: 1,
          unitCost: 0,
          unitPrice: 0,
          description: "",
        },
      ]);
      return;
    }

    form.setFieldValue(
      "lineItems",
      form.values.lineItems.filter((item) => item.id !== id),
    );
  };

  const addAppointment = () => {
    if (form.values.jobType === "RECURRING") return;

    form.setFieldValue("appointments", [
      ...form.values.appointments,
      blankAppointment(),
    ]);
  };

  const removeAppointment = (id: string) => {
    if (form.values.jobType === "RECURRING") return;
    if (form.values.appointments.length === 1) {
      form.setFieldValue("appointments", [blankAppointment()]);
      return;
    }

    form.setFieldValue(
      "appointments",
      form.values.appointments.filter((appointment) => appointment.id !== id),
    );
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

      if (!values.isAnytime) {
        const timeError = getAppointmentTimeError(
          appt.startTime ?? "",
          appt.endTime ?? "",
        );

        if (timeError) {
          form.setFieldError(`appointments.${index}.startTime`, timeError);
          form.setFieldError(`appointments.${index}.endTime`, timeError);
          return;
        }
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
                values.recurrence.endType === "on" &&
                toRecurrenceEndsOnDate(values.recurrence.endsOn)
                  ? DateTime.fromJSDate(
                      toRecurrenceEndsOnDate(values.recurrence.endsOn)!,
                      {
                        zone: APP_TZ,
                      },
                    ).toFormat("yyyy-LL-dd")
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
      <Paper
        withBorder
        mt="sm"
        key={note.id}
        radius="md"
        p="md"
        className={classes.subCard}
      >
        <div className={classes.subCardHeader}>
          <Group gap="xs">
            <Badge variant="light" color="gray" radius="xl">
              Note {index + 1}
            </Badge>
          </Group>
          <Button
            color="red"
            variant="light"
            type="button"
            size="xs"
            disabled={isBusy || form.values.notes.length === 1}
            onClick={() => removeJobNote(note.id)}
          >
            Remove Note
          </Button>
        </div>
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="Note title"
              placeholder="e.g. Gate access"
              disabled={isBusy}
              {...form.getInputProps(`notes.${index}.title`)}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
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
              className={classes.dropzone}
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
                <IoImage size={24} />
                <Text mt="xs" size="xs">
                  Drag note images here or click to upload (4MB Max, up to 10
                  images)
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
                  <ImageViewer
                    key={img.fileKey}
                    src={img.url}
                    alt="Note image"
                    modalTitle="Note Image"
                    thumbWidth={80}
                    thumbHeight={80}
                    overlay={
                      <ActionIcon
                        size="sm"
                        radius="xl"
                        color="red"
                        variant="filled"
                        className={classes.thumbAction}
                        onClick={() => removeNoteImage(index, img.fileKey)}
                        disabled={isBusy}
                      >
                        <IoClose size={14} />
                      </ActionIcon>
                    }
                  />
                ))}
              </Group>
            ) : null}
          </Grid.Col>
        </Grid>
      </Paper>
    ));

  const renderAppointments = () =>
    form.values.appointments.map((appt, index) => {
      const candidateQuery = appointmentCandidateQueries[index];
      const staffRecommendationQuery =
        appointmentStaffRecommendationQueries[index];
      const candidatePayload = candidateQuery?.data?.data;
      const recommendedMembers = candidatePayload?.recommendedMembers ?? [];
      const unavailableMembers =
        candidatePayload?.staffMembers?.filter((member: CandidateStaff) => {
          const m = member;
          return (
            (m.leaves?.length ?? 0) > 0 || (m.assignments?.length ?? 0) > 0
          );
        }) ?? [];
      const staffMembers = candidatePayload?.staffMembers?.length
        ? candidatePayload.staffMembers
        : ((staffData?.data as Staff[] | undefined) ?? []);

      const search = debouncedSearchAssignees.trim().toLowerCase();
      const visibleStaff = staffMembers.filter((member: CandidateStaff) => {
        if (!search) return true;
        return member.name.toLowerCase().includes(search);
      });

      const multiSelectData = visibleStaff.map((member: CandidateStaff) => {
        return {
          value: member.id,
          label: formatStaffOptionLabel(member, recommendedMembers),
        };
      });
      const candidateWindow = buildAppointmentWindow(
        appt,
        form.values.isAnytime,
      );
      const candidatesDisabled =
        !form.values.addressId || !candidateWindow?.appointmentStart;
      const selectedStaffIds = form.values.appointments[index]?.staffId ?? [];
      const leadOptions = selectedStaffIds
        .map((staffId) => {
          const selectedMember = staffMembers.find(
            (member: CandidateStaff) => member.id === staffId,
          );

          return selectedMember
            ? {
                value: selectedMember.id,
                label: formatStaffOptionLabel(
                  selectedMember,
                  recommendedMembers,
                ),
              }
            : null;
        })
        .filter(
          (option): option is { value: string; label: string } => !!option,
        );

      return (
        <Paper
          withBorder
          mt="sm"
          key={appt.id}
          radius="md"
          p="md"
          className={classes.subCard}
        >
          <div className={classes.subCardHeader}>
            <Group gap="xs">
              <Badge variant="light" color="gray" radius="xl">
                Appointment {index + 1}
              </Badge>
              {selectedStaffIds.length ? (
                <Badge variant="light" color="lime" radius="xl">
                  {selectedStaffIds.length} assigned
                </Badge>
              ) : null}
            </Group>
            <Button
              color="red"
              variant="light"
              type="button"
              size="xs"
              disabled={
                isBusy ||
                form.values.jobType === "RECURRING" ||
                form.values.appointments.length === 1
              }
              onClick={() => removeAppointment(appt.id)}
            >
              Remove
            </Button>
          </div>
          <Grid>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <DatePickerInput
                label="Date"
                {...form.getInputProps(`appointments.${index}.startDate`)}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TimeInput
                label="Start"
                min={SUPPORTED_SHIFT_START}
                max={SUPPORTED_SHIFT_END}
                {...form.getInputProps(`appointments.${index}.startTime`)}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TimeInput
                label="End"
                min={SUPPORTED_SHIFT_START}
                max={SUPPORTED_SHIFT_END}
                {...form.getInputProps(`appointments.${index}.endTime`)}
              />
            </Grid.Col>
            {aiFeaturesEnabled ? (
              <Grid.Col span={12}>
                <AIStaffSuggestionCard
                  recommendedMembers={recommendedMembers}
                  unavailableMembers={unavailableMembers}
                  isLoading={candidateQuery?.isLoading}
                  isDisabled={candidatesDisabled}
                  aiSuggestion={staffRecommendationQuery?.data ?? null}
                  isAiLoading={staffRecommendationQuery?.isLoading}
                  aiError={staffRecommendationQuery?.isError ?? false}
                />
              </Grid.Col>
            ) : null}
            <Grid.Col span={12}>
              <MultiSelect
                label="Staff"
                searchable
                placeholder={
                  candidateQuery?.isLoading || staffLoading
                    ? "Loading staff..."
                    : candidateQuery?.isError || staffError
                      ? "Failed to load staff"
                      : candidatesDisabled
                        ? "Select address, date, and time first"
                        : "Assign available staff"
                }
                disabled={
                  (candidateQuery?.isLoading ?? false) || staffLoading || isBusy
                }
                rightSection={
                  candidateQuery?.isFetching || staffFetching ? (
                    <Loader />
                  ) : undefined
                }
                data={multiSelectData}
                onSearchChange={setSearchAssignees}
                value={form.values.appointments[index]?.staffId ?? []}
                onChange={(value) => {
                  form.setFieldValue(`appointments.${index}.staffId`, value);
                  form.setFieldValue(
                    `appointments.${index}.leadStaffId`,
                    getNextLeadStaffId(
                      value,
                      form.values.appointments[index]?.leadStaffId ?? "",
                    ),
                  );
                }}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Select
                label="Team Lead"
                description="Only the team lead or sole participant can check off the checklist."
                placeholder={
                  selectedStaffIds.length
                    ? "Select team lead"
                    : "Assign staff first"
                }
                disabled={!selectedStaffIds.length || isBusy}
                data={leadOptions}
                value={form.values.appointments[index]?.leadStaffId ?? ""}
                onChange={(value) =>
                  form.setFieldValue(
                    `appointments.${index}.leadStaffId`,
                    value ?? "",
                  )
                }
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <ChecklistEditor
                items={form.values.appointments[index]?.checklist ?? []}
                disabled={isBusy}
                label="Appointment Checklist"
                description="These items will appear on the staff task screen for completion."
                addLabel="Add checklist item"
                onChange={(items) =>
                  form.setFieldValue(`appointments.${index}.checklist`, items)
                }
              />
            </Grid.Col>
          </Grid>
        </Paper>
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
        content: "app-modal__content",
        header: "app-modal__header",
        title: "app-modal__title",
        body: "app-modal__body",
      }}
    >
      <ScrollArea.Autosize mah="75dvh" offsetScrollbars>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md" className={classes.shell} pb="xs">
            {(isUploading || isSubmitting) && (
              <Paper
                p="sm"
                radius="md"
                withBorder
                bg="gray.0"
                className={classes.statusBanner}
              >
                <Group gap="xs">
                  <Loader />
                  <Text size="sm">
                    {isUploading
                      ? "Uploading images. Please wait..."
                      : "Saving job..."}
                  </Text>
                </Group>
              </Paper>
            )}

            <Paper withBorder radius="md" p="lg" className={classes.heroCard}>
              <Stack gap="md">
                <Group justify="space-between" align="flex-start" wrap="wrap">
                  <Stack gap={4}>
                    <Text
                      size="xs"
                      fw={800}
                      c="#64748b"
                      className={classes.sectionEyebrow}
                    >
                      Scheduling Workspace
                    </Text>
                    <Text size="xl" fw={800} c="#0f172a">
                      Build the job and its first visits in one pass
                    </Text>
                    <Text size="sm" c="#475569" maw={620}>
                      Set the client, service details, schedule, assignees,
                      checklist, and internal notes before the job goes live.
                    </Text>
                  </Stack>
                  <SegmentedControl
                    color="lime"
                    value={form.values.jobType}
                    disabled={isBusy}
                    onChange={(value) =>
                      form.setFieldValue(
                        "jobType",
                        value as JobFormValues["jobType"],
                      )
                    }
                    data={[
                      { label: "One-off", value: "ONE_OFF" },
                      { label: "Recurring", value: "RECURRING" },
                    ]}
                  />
                </Group>

                <div className={classes.heroMeta}>
                  <span className={classes.summaryChip}>
                    {form.values.lineItems.length} service
                    {form.values.lineItems.length === 1 ? "" : "s"}
                  </span>
                  <span className={classes.summaryChip}>
                    {form.values.jobType === "RECURRING"
                      ? "Recurring plan"
                      : `${form.values.appointments.length} appointment${form.values.appointments.length === 1 ? "" : "s"}`}
                  </span>
                  <span className={classes.summaryChip}>
                    {
                      form.values.notes.filter(
                        (note) =>
                          note.content.trim() ||
                          note.title.trim() ||
                          note.uploadedImages.length > 0,
                      ).length
                    }{" "}
                    note
                    {form.values.notes.filter(
                      (note) =>
                        note.content.trim() ||
                        note.title.trim() ||
                        note.uploadedImages.length > 0,
                    ).length === 1
                      ? ""
                      : "s"}
                  </span>
                  <span className={classes.summaryChip}>
                    {form.values.clientId ? "Client selected" : "Choose client"}
                  </span>
                </div>
              </Stack>
            </Paper>

            <Paper
              withBorder
              radius="md"
              p="lg"
              className={classes.sectionCard}
            >
              <Stack gap="md">
                <div className={classes.sectionHeader}>
                  <Stack gap={2}>
                    <Text
                      size="xs"
                      fw={800}
                      c="#64748b"
                      className={classes.sectionEyebrow}
                    >
                      Core Details
                    </Text>
                    <Text fw={800} c="#0f172a">
                      Client, address, and visit setup
                    </Text>
                  </Stack>
                </div>

                <TextInput
                  label="Title"
                  placeholder="Job Title"
                  disabled={isBusy}
                  {...form.getInputProps("title")}
                />

                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
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
                      rightSection={clientsFetching ? <Loader /> : undefined}
                      {...form.getInputProps("clientId")}
                      data={
                        clientsData?.data?.map((c: Client) => ({
                          value: c.id,
                          label:
                            c.companyName || `${c.firstName} ${c.lastName}`,
                        })) || []
                      }
                      onSearchChange={setSearchClients}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Client Address"
                      disabled={
                        !form.values.clientId || addressesLoading || isBusy
                      }
                      placeholder={
                        !form.values.clientId
                          ? "Select client first"
                          : addressesLoading
                            ? "Loading addresses..."
                            : addressesError
                              ? "Failed to load addresses"
                              : "Select address"
                      }
                      rightSection={addressesFetching ? <Loader /> : undefined}
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

                <Checkbox
                  label="Allow anytime scheduling for this job"
                  disabled={isBusy}
                  checked={form.values.isAnytime}
                  onChange={(event) =>
                    form.setFieldValue("isAnytime", event.currentTarget.checked)
                  }
                />

                <Textarea
                  label="Visit Instructions"
                  placeholder="Parking, access instructions, alarm details, or service expectations"
                  minRows={3}
                  disabled={isBusy}
                  {...form.getInputProps("visitInstructions")}
                />
              </Stack>
            </Paper>

            <Paper
              withBorder
              radius="md"
              p="lg"
              className={classes.sectionCard}
            >
              <Stack gap="md">
                <div className={classes.sectionHeader}>
                  <Stack gap={2}>
                    <Text
                      size="xs"
                      fw={800}
                      c="#64748b"
                      className={classes.sectionEyebrow}
                    >
                      Services
                    </Text>
                    <Text fw={800} c="#0f172a">
                      Define what is being delivered
                    </Text>
                  </Stack>
                  <Button
                    size="xs"
                    type="button"
                    disabled={isBusy}
                    onClick={addLineItem}
                  >
                    Add Line Item
                  </Button>
                </div>

                {form.values.lineItems.map((item, index) => (
                  <Paper
                    withBorder
                    radius="md"
                    p="md"
                    key={item.id}
                    className={classes.subCard}
                  >
                    <div className={classes.subCardHeader}>
                      <Badge variant="light" color="gray" radius="xl">
                        Line Item {index + 1}
                      </Badge>
                      <Button
                        color="red"
                        variant="light"
                        size="xs"
                        type="button"
                        disabled={isBusy}
                        onClick={() => removeLineItem(item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                    <Grid>
                      <Grid.Col span={{ base: 12, sm: 6 }}>
                        <TextInput
                          label="Name"
                          placeholder="Service Name"
                          disabled={isBusy}
                          {...form.getInputProps(`lineItems.${index}.name`)}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 2 }}>
                        <NumberInput
                          label="Qty"
                          placeholder="Service Qty"
                          min={1}
                          disabled={isBusy}
                          {...form.getInputProps(`lineItems.${index}.quantity`)}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 2 }}>
                        <NumberInput
                          label="Unit Cost"
                          min={0}
                          prefix="$"
                          disabled={isBusy}
                          {...form.getInputProps(`lineItems.${index}.unitCost`)}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 2 }}>
                        <NumberInput
                          label="Unit Price"
                          min={0}
                          prefix="$"
                          disabled={isBusy}
                          {...form.getInputProps(
                            `lineItems.${index}.unitPrice`,
                          )}
                        />
                      </Grid.Col>
                    </Grid>

                    <Textarea
                      mt="sm"
                      label="Description"
                      disabled={isBusy}
                      {...form.getInputProps(`lineItems.${index}.description`)}
                    />
                  </Paper>
                ))}
              </Stack>
            </Paper>

            {form.values.jobType === "RECURRING" && (
              <Paper
                withBorder
                radius="md"
                p="lg"
                className={classes.sectionCard}
              >
                <Stack gap="md">
                  <div className={classes.sectionHeader}>
                    <Stack gap={2}>
                      <Text
                        size="xs"
                        fw={800}
                        c="#64748b"
                        className={classes.sectionEyebrow}
                      >
                        Recurrence
                      </Text>
                      <Text fw={800} c="#0f172a">
                        Control how often this job repeats
                      </Text>
                    </Stack>
                  </div>

                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
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

                    <Grid.Col span={{ base: 12, sm: 6 }}>
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
                          <Radio
                            value="after"
                            label="After"
                            disabled={isBusy}
                          />
                          <Radio value="on" label="On date" disabled={isBusy} />
                        </Stack>
                      </Radio.Group>
                    </Grid.Col>

                    {form.values.recurrence.endType === "after" && (
                      <Grid.Col span={{ base: 12, sm: 6 }}>
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
                      <Grid.Col span={{ base: 12, sm: 6 }}>
                        <DatePickerInput
                          label="End date"
                          placeholder="End date"
                          disabled={isBusy}
                          value={toRecurrenceEndsOnDate(
                            form.values.recurrence.endsOn,
                          )}
                          onChange={(d) =>
                            form.setFieldValue(
                              "recurrence.endsOn",
                              toRecurrenceEndsOnDate(d as Date | string | null),
                            )
                          }
                          minDate={
                            form.values.appointments?.[0]?.startDate
                              ? appDateKeyToDate(
                                  form.values.appointments[0].startDate,
                                )
                              : undefined
                          }
                        />
                      </Grid.Col>
                    )}
                  </Grid>
                </Stack>
              </Paper>
            )}

            <Paper
              withBorder
              radius="md"
              p="lg"
              className={classes.sectionCard}
            >
              <Stack gap="md">
                <div className={classes.sectionHeader}>
                  <Stack gap={2}>
                    <Text
                      size="xs"
                      fw={800}
                      c="#64748b"
                      className={classes.sectionEyebrow}
                    >
                      Appointments
                    </Text>
                    <Text fw={800} c="#0f172a">
                      Plan who goes, when, and what gets checked off
                    </Text>
                  </Stack>
                  <Button
                    size="xs"
                    type="button"
                    disabled={isBusy || form.values.jobType === "RECURRING"}
                    onClick={addAppointment}
                  >
                    Add Appointment
                  </Button>
                </div>

                {renderAppointments()}
              </Stack>
            </Paper>

            <Paper
              withBorder
              radius="md"
              p="lg"
              className={classes.sectionCard}
            >
              <Stack gap="md">
                <div className={classes.sectionHeader}>
                  <Stack gap={2}>
                    <Text
                      size="xs"
                      fw={800}
                      c="#64748b"
                      className={classes.sectionEyebrow}
                    >
                      Job Notes
                    </Text>
                    <Text fw={800} c="#0f172a">
                      Capture internal context and supporting images
                    </Text>
                  </Stack>
                  <Button
                    size="xs"
                    type="button"
                    disabled={isBusy}
                    onClick={addJobNote}
                  >
                    Add Note
                  </Button>
                </div>

                {renderJobNotes()}
              </Stack>
            </Paper>

            <Paper withBorder radius="md" p="md">
              <Group justify="right">
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
                  color="lime"
                  loading={isSubmitting}
                  disabled={isBusy}
                >
                  {isUploading ? "Uploading..." : "Save Job"}
                </Button>
              </Group>
            </Paper>
          </Stack>
        </form>
      </ScrollArea.Autosize>
    </Modal>
  );
}
