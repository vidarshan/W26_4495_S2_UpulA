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
} from "@mantine/core";
import { DateInput, TimeInput } from "@mantine/dates";
import { Dropzone } from "@mantine/dropzone";
import { useDebouncedValue } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { IoAddOutline, IoImageOutline } from "react-icons/io5";
import { createJob, JobFormValues } from "@/lib/api/jobs";
import { getClientAddresses, getClients } from "@/lib/api/client";
import { getStaff } from "@/lib/api/users";
import { Staff } from "@/app/types/staff";
import { Client } from "../tables/ClientTable";
import { CalendarSelection } from "@/types";
import { DateTime } from "luxon";
import { APP_TZ } from "@/lib/dateTime";
import { useUploadThing } from "@/lib/uploadthing";
import { notifications } from "@mantine/notifications";

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

type AppointmentForm = {
  id: string;
  startDate: Date | null;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  staffId: string[];
  notes: string;
  images: File[]; // local picked files (optional)
  uploadedImages: UploadedImage[]; // ✅ persisted (url + fileKey)
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

  recurrence: RecurrenceForm;
  appointments: AppointmentForm[];
  lineItems: LineItem[];
};

function jsDateToHHmm(d: Date) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const dt = DateTime.fromJSDate(d, { zone: APP_TZ });
  return dt.isValid ? dt.toFormat("HH:mm") : "";
}

function blankAppointment(): AppointmentForm {
  return {
    id: crypto.randomUUID(),
    startDate: null,
    startTime: "",
    endTime: "",
    staffId: [],
    notes: "",
    images: [],
    uploadedImages: [],
  };
}

export default function NewJobModal({
  opened,
  onClose,
  selectedInfo,
  onSuccess,
}: Props) {
  const { startUpload, isUploading } = useUploadThing("appointmentImages");

  const form = useForm<JobFormValuesWithRecurrence>({
    mode: "controlled",
    initialValues: {
      title: "",
      clientId: "",
      addressId: "",
      jobType: "ONE_OFF",
      isAnytime: false,
      visitInstructions: "",
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
          startDate: selectedInfo?.start
            ? new Date(
                selectedInfo.start.getFullYear(),
                selectedInfo.start.getMonth(),
                selectedInfo.start.getDate(),
              )
            : null,
          startTime: selectedInfo?.start
            ? jsDateToHHmm(selectedInfo.start)
            : "",
          endTime: selectedInfo?.end ? jsDateToHHmm(selectedInfo.end) : "",
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
    },
    validate: {
      title: (v) => (!v.trim() ? "Title is required" : null),
      clientId: (v) => (!v ? "Client is required" : null),
      addressId: (v) => (!v ? "Address is required" : null),
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

  const { data: clientsData } = useQuery({
    queryKey: ["clients", debouncedSearchClients],
    queryFn: () => getClients(debouncedSearchClients),
  });

  const { data: staffData } = useQuery({
    queryKey: [
      "staff",
      { q: debouncedSearchAssignees, paginate: false },
    ] as const,
    queryFn: () => getStaff(),
    staleTime: 60_000,
  });

  const { data: addressesData } = useQuery({
    queryKey: ["client-addresses", form.values.clientId],
    queryFn: () => getClientAddresses(form.values.clientId),
    enabled: !!form.values.clientId,
  });

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
    form.setFieldValue("appointments", [
      ...form.values.appointments,
      blankAppointment(),
    ]);
  };

  // Fill appointment[0] from FullCalendar selection
  const startStr = selectedInfo?.startStr || "";
  const endStr = selectedInfo?.endStr || "";
  const allDay = !!selectedInfo?.allDay;

  useEffect(() => {
    if (!opened) return;
    if (!startStr) return;

    const startDT = DateTime.fromISO(startStr, { zone: APP_TZ });
    const endDT = endStr ? DateTime.fromISO(endStr, { zone: APP_TZ }) : null;
    if (!startDT.isValid) return;

    const startDate = startDT.startOf("day").toJSDate();

    const startTime = allDay ? "09:00" : startDT.toFormat("HH:mm");
    const endTime = allDay
      ? "11:00"
      : endDT && endDT.isValid
        ? endDT.toFormat("HH:mm")
        : "";

    form.setFieldValue("appointments.0.startDate", startDate);
    form.setFieldValue("appointments.0.startTime", startTime);
    form.setFieldValue("appointments.0.endTime", endTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, startStr, endStr, allDay]);

  // Keep endsAfter/endsOn coherent
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
  }, [form.values.jobType, form.values.recurrence.endType]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values: JobFormValuesWithRecurrence) => {
    const mapAppt = (appt: AppointmentForm) => ({
      id: appt.id,
      startDate: appt.startDate,
      startTime: appt.startTime,
      endTime: appt.endTime,
      staffId: appt.staffId?.length ? appt.staffId : undefined,
      notes: appt.notes?.trim() ? appt.notes : undefined,
      images: appt.uploadedImages?.length
        ? appt.uploadedImages.map((img) => ({
            url: img.url,
            fileKey: img.fileKey,
          }))
        : undefined,
    });

    const payload = {
      ...values,
      recurrence:
        values.jobType === "RECURRING" ? values.recurrence : undefined,
      appointments:
        values.jobType === "RECURRING"
          ? [mapAppt(values.appointments[0])]
          : values.appointments.map(mapAppt),
    };

    await createJob(payload);
    onSuccess();
    form.reset();
    onClose();
    notifications.show({
      title: `Success`,
      message: "Moved the appointment",
      color: "green",
    });
  };

  const renderAppointments = () =>
    form.values.appointments.map((appt, index) => (
      <Card withBorder mt="sm" key={appt.id}>
        <Grid>
          <Grid.Col span={4}>
            <DateInput
              key={form.key(`appointments.${index}.startDate`)}
              label="Date"
              {...form.getInputProps(`appointments.${index}.startDate`)}
            />
          </Grid.Col>

          <Grid.Col span={4}>
            <TimeInput
              key={form.key(`appointments.${index}.startTime`)}
              label="Start"
              disabled={form.values.isAnytime}
              {...form.getInputProps(`appointments.${index}.startTime`)}
            />
          </Grid.Col>

          <Grid.Col span={4}>
            <TimeInput
              key={form.key(`appointments.${index}.endTime`)}
              label="End"
              disabled={form.values.isAnytime}
              {...form.getInputProps(`appointments.${index}.endTime`)}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <MultiSelect
              label="Staff"
              placeholder="Assign staff"
              data={
                staffData?.data?.map((s: Staff) => ({
                  value: s.id,
                  label: s.name,
                })) || []
              }
              onSearchChange={setSearchAssignees}
              searchable
              {...form.getInputProps(`appointments.${index}.staffId`)}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <Textarea
              label="Notes"
              placeholder="Enter notes"
              {...form.getInputProps(`appointments.${index}.notes`)}
            />
          </Grid.Col>

          {appt.uploadedImages?.length ? (
            <Group mt="xs">
              {appt.uploadedImages.map((img) => (
                <Image
                  key={img.fileKey}
                  src={img.url}
                  alt="attached_img"
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: "cover",
                    borderRadius: 8,
                  }}
                />
              ))}
            </Group>
          ) : null}

          <Grid.Col span={12}>
            <Dropzone
              accept={["image/png", "image/jpeg", "image/webp"]}
              maxFiles={10}
              onDrop={async (files) => {
                // keep local files (optional)
                const existing = appt.images || [];
                const nextFiles = [...existing, ...files].slice(0, 10);
                form.setFieldValue(`appointments.${index}.images`, nextFiles);

                // upload immediately
                const uploaded = await startUpload(files);

                const imgs: UploadedImage[] = (uploaded ?? []).map((u) => ({
                  url: u.url,
                  fileKey: u.key, // ✅ UploadThing's key
                }));

                // append uploaded images (url + fileKey)
                form.setFieldValue(`appointments.${index}.uploadedImages`, [
                  ...(appt.uploadedImages || []),
                  ...imgs,
                ]);
              }}
            >
              <Flex direction="column" align="center">
                <IoImageOutline size={24} />
                <Text mt="xs" size="xs">
                  Drag images here or click to upload (max 10)
                </Text>
                {isUploading && (
                  <Text mt="xs" size="xs" c="dimmed">
                    Uploading...
                  </Text>
                )}
              </Flex>
            </Dropzone>
          </Grid.Col>
        </Grid>
      </Card>
    ));

  return (
    <Modal opened={opened} onClose={onClose} size="xl" title="New Job" centered>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Paper>
          <SegmentedControl
            mt="sm"
            value={form.values.jobType}
            onChange={(value) =>
              form.setFieldValue("jobType", value as JobFormValues["jobType"])
            }
            data={[
              { label: "One-off", value: "ONE_OFF" },
              { label: "Recurring", value: "RECURRING" },
            ]}
          />

          <TextInput mt="sm" label="Title" {...form.getInputProps("title")} />

          <Grid mt="sm">
            <Grid.Col span={6}>
              <Select
                label="Client"
                placeholder="Select client"
                {...form.getInputProps("clientId")}
                data={
                  clientsData?.data?.map((c: Client) => ({
                    value: c.id,
                    label: c.companyName || `${c.firstName} ${c.lastName}`,
                  })) || []
                }
                onSearchChange={setSearchClients}
                searchable
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <Select
                label="Client Address"
                placeholder="Select address"
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
                    {...form.getInputProps(`lineItems.${index}.name`)}
                  />
                </Grid.Col>
                <Grid.Col span={2}>
                  <NumberInput
                    label="Qty"
                    min={1}
                    {...form.getInputProps(`lineItems.${index}.quantity`)}
                  />
                </Grid.Col>
                <Grid.Col span={2}>
                  <NumberInput
                    label="Unit Cost"
                    min={0}
                    prefix="$"
                    {...form.getInputProps(`lineItems.${index}.unitCost`)}
                  />
                </Grid.Col>
                <Grid.Col span={2}>
                  <NumberInput
                    label="Unit Price"
                    min={0}
                    prefix="$"
                    {...form.getInputProps(`lineItems.${index}.unitPrice`)}
                  />
                </Grid.Col>
              </Grid>

              <Textarea
                mt="sm"
                label="Description"
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
                    data={[
                      { value: "weekly", label: "Weekly" },
                      { value: "monthly", label: "Monthly" },
                    ]}
                    value={form.values.recurrence.frequency}
                    onChange={(v) =>
                      form.setFieldValue(
                        "recurrence.frequency",
                        v as "weekly" | "monthly",
                      )
                    }
                  />
                </Grid.Col>

                <Grid.Col span={6}>
                  <NumberInput
                    label={`Every (${form.values.recurrence.frequency === "weekly" ? "weeks" : "months"})`}
                    min={1}
                    value={form.values.recurrence.interval}
                    onChange={(v) =>
                      form.setFieldValue("recurrence.interval", Number(v) || 1)
                    }
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <Radio.Group
                    label="Ends"
                    value={form.values.recurrence.endType}
                    onChange={(v) =>
                      form.setFieldValue(
                        "recurrence.endType",
                        v as "after" | "on",
                      )
                    }
                  >
                    <Stack gap="xs" mt="xs">
                      <Radio value="after" label="After" />
                      <Radio value="on" label="On date" />
                    </Stack>
                  </Radio.Group>
                </Grid.Col>

                {form.values.recurrence.endType === "after" && (
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Occurrences"
                      min={1}
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
                    <DateInput
                      label="End date"
                      value={form.values.recurrence.endsOn}
                      onChange={(d) =>
                        form.setFieldValue(
                          "recurrence.endsOn",
                          d ? new Date(d) : null,
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

          <Divider my="sm" />

          <Group align="center" justify="space-between">
            <Text fw={500}>Appointments</Text>
            <Button
              leftSection={<IoAddOutline />}
              size="xs"
              onClick={addAppointment}
            >
              Add Appointment
            </Button>
          </Group>

          {renderAppointments()}
        </Paper>

        <Group justify="right" mt="md">
          <Button variant="default" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" color="green" disabled={isUploading}>
            Save Job
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
