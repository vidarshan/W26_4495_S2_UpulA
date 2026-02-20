"use client";

import { useEffect, useMemo } from "react";
import {
  Button,
  Divider,
  Flex,
  Group,
  Modal,
  MultiSelect,
  Paper,
  Select,
  Stack,
  Textarea,
} from "@mantine/core";
import { DateInput, TimeInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useQuery } from "@tanstack/react-query";

import Loader from "../UI/Loader";
import { useDashboardUI } from "@/stores/store";
import { useAppointment } from "@/hooks/useAppointment";
import { updateAppointment } from "@/lib/api/appointments";
import { getStaff } from "@/lib/api/users";
import { dateOnlyAndHHmmToIso, isoToDateOnly, isoToHHmm } from "@/lib/dateTime";

type Status = "SCHEDULED" | "COMPLETED" | "CANCELLED";

type FormValues = {
  date: Date | null;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  status: Status;
  staff: string[];
  note: string;
};

type Props = {
  onSuccess?: () => void;
};

function isValidHHmm(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export default function AppointmentInfoModal({ onSuccess }: Props) {
  const { appointmentOpen, closeAppointment, selectedApptId } =
    useDashboardUI();
  const { data: appointment, isLoading } = useAppointment(selectedApptId);

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
  }, [appointment?.id]);

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
