"use client";

import { useEffect, useMemo } from "react";
import {
  ActionIcon,
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
  Stack,
  Textarea,
} from "@mantine/core";
import { DateInput, TimeInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Loader from "../UI/Loader";
import { useDashboardUI } from "@/stores/store";
import { useAppointment } from "@/hooks/useAppointment";
import { updateAppointment } from "@/lib/api/appointments";
import { getStaff } from "@/lib/api/users";
import { dateOnlyAndHHmmToIso, isoToDateOnly, isoToHHmm } from "@/lib/dateTime";
import { deleteAppointmentImage, useUploadThing } from "@/lib/uploadthing";
import { IoCloseOutline } from "react-icons/io5";

type Status = "SCHEDULED" | "COMPLETED" | "CANCELLED";

type AppointmentForm = {
  id: string;
  startDate: Date | null;
  startTime: string;
  endTime: string;
  staffId: string[];
  notes: string;
  images: File[]; // local picked files
  imageUrls: string[]; // uploaded URLs
};

type FormValues = {
  date: Date | null;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  status: Status;
  staff: string[];
  note: string;
};

type Props = {
  onSuccess: () => void;
};

function isValidHHmm(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export default function AppointmentInfoModal({ onSuccess }: Props) {
  const { startUpload, isUploading } = useUploadThing("appointmentImages");
  const { appointmentOpen, closeAppointment, selectedApptId } =
    useDashboardUI();
  const { data: appointment, isLoading } = useAppointment(selectedApptId);
  const qc = useQueryClient();
  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ["staff", "all"],
    queryFn: getStaff,
    staleTime: 60_000,
  });

  const staffOptions = useMemo(() => {
    return (staffData?.data ?? []).map((s: any) => ({
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

  // Populate on load/change
  useEffect(() => {
    if (!appointment) return;

    const noteValue =
      Array.isArray(appointment.notes) && appointment.notes.length
        ? (appointment.notes
            .slice()
            .sort(
              (a: any, b: any) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )[0]?.content ?? "")
        : "";

    form.setValues({
      date: isoToDateOnly(appointment.startTime),
      startTime: isoToHHmm(appointment.startTime),
      endTime: isoToHHmm(appointment.endTime),
      status: appointment.status,
      staff: (appointment.staff ?? []).map((s: any) => s.id),
      note: noteValue,
    });

    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appointment?.id,
    appointment?.startTime,
    appointment?.endTime,
    appointment?.status,
    // optional but good:
    appointment?.staff?.map((s: any) => s.id).join(","),
    appointment?.notes?.length,
  ]);

  const handleClose = () => {
    form.reset(); // revert any unsaved edits to last initialValues snapshot
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
  };

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => deleteAppointmentImage(imageId),

    onMutate: async (imageId) => {
      await qc.cancelQueries({ queryKey: ["appointment", selectedApptId] });

      const prev = qc.getQueryData<any>(["appointment", selectedApptId]);

      // Optimistically remove image from cached appointment
      qc.setQueryData(["appointment", selectedApptId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          images: (old.images ?? []).filter((img: any) => img.id !== imageId),
        };
      });

      return { prev };
    },

    onError: (_err, _imageId, ctx) => {
      // rollback on failure
      if (ctx?.prev) {
        qc.setQueryData(["appointment", selectedApptId], ctx.prev);
      }
    },

    onSettled: () => {
      // refetch to be 100% consistent
      qc.invalidateQueries({ queryKey: ["appointment", selectedApptId] });
      onSuccess();
    },
  });

  return (
    <Modal
      size="sm"
      title="Appointment Details"
      opened={appointmentOpen}
      onClose={handleClose}
      centered
      closeOnClickOutside={false}
    >
      {isLoading ? (
        <Loader />
      ) : !appointment ? null : (
        <Paper radius="md">
          <Divider
            label="Appointment Information"
            mb="sm"
            labelPosition="left"
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <Stack gap="sm">
              <DateInput
                label="Date"
                value={form.values.date}
                onChange={(d) => form.setFieldValue("date", d)}
                error={form.errors.date}
              />

              <Group grow>
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
              </Group>

              <Select
                label="Status"
                data={[
                  { value: "SCHEDULED", label: "Scheduled" },
                  { value: "COMPLETED", label: "Completed" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]}
                {...form.getInputProps("status")}
              />

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
                label="Note"
                autosize
                minRows={3}
                placeholder="Add internal note for this visit..."
                {...form.getInputProps("note")}
              />
            </Stack>

            {appointment?.images?.length > 0 && (
              <Group mt="xs" wrap="wrap" gap="xs">
                {appointment.images.map((img: any) => (
                  <Box
                    key={img.id}
                    pos="relative"
                    w={64}
                    h={64}
                    style={{ borderRadius: 8, overflow: "hidden" }}
                  >
                    <Image
                      src={img.url}
                      alt="attached"
                      width={64}
                      height={64}
                      fit="cover"
                    />

                    <ActionIcon
                      size="sm"
                      variant="filled"
                      color="dark"
                      pos="absolute"
                      top={4}
                      right={4}
                      loading={deleteImageMutation.isPending}
                      onClick={() => {
                        console.log("DELETE CLICK", img.id);

                        deleteImageMutation.mutate(img.id);
                      }}
                      aria-label="Delete image"
                    >
                      <IoCloseOutline size={14} />
                    </ActionIcon>
                  </Box>
                ))}
              </Group>
            )}

            <Flex mt="sm" gap="xs">
              <Button variant="default" onClick={handleClose} fullWidth>
                Cancel
              </Button>

              <Button type="submit" fullWidth disabled={!form.isDirty()}>
                Save
              </Button>
            </Flex>
          </form>
        </Paper>
      )}
    </Modal>
  );
}
