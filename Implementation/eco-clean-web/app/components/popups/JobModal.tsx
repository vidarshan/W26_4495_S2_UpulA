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
  Text,
} from "@mantine/core";
import { DateInput, TimePicker } from "@mantine/dates";
import { Dropzone } from "@mantine/dropzone";
import { useDebouncedValue } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { IoAddOutline, IoImageOutline } from "react-icons/io5";
import { createJob, JobFormValues } from "@/lib/api/jobs";
import { getClientAddresses, getClients } from "@/lib/api/client";
import { getStaff } from "@/lib/api/users";
import { Staff } from "@/app/types/staff";
import { Client } from "../tables/ClientTable";
import { CalendarSelection } from "@/types";

interface Props {
  opened: boolean;
  onClose: () => void;
  selectedInfo: CalendarSelection;
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

type AppointmentForm = {
  startDate: Date | null;
  startTime: string;
  endTime: string;
  staffId: string[];
  notes: string;
  images: File[];
};

export default function NewJobModal({
  opened,
  onClose,
  selectedInfo,
  onSuccess,
}: Props) {
  const form = useForm<JobFormValues>({
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
          id: crypto.randomUUID(),
          startDate: selectedInfo?.start
            ? new Date(
                selectedInfo.start.getFullYear(),
                selectedInfo.start.getMonth(),
                selectedInfo.start.getDate(),
              )
            : null,
          startTime: selectedInfo?.startStr
            ? selectedInfo.startStr.substring(11, 16)
            : "",
          endTime: selectedInfo?.endStr
            ? selectedInfo.endStr.substring(11, 16)
            : "",
          staffId: [],
          notes: "",
          images: [],
        },
      ],
      recurrence: {
        frequency: "weekly",
        interval: 1,
        endType: "after",
        endsAfter: 6,
        endsUnit: "months",
        endsOn: null,
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
    queryKey: ["staff", debouncedSearchAssignees],
    queryFn: getStaff,
  });

  const { data: addressesData } = useQuery({
    queryKey: ["client-addresses", form.values.clientId],
    queryFn: () => getClientAddresses(form.values.clientId),
    enabled: !!form.values.clientId,
  });

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    form.setFieldValue(`lineItems.${index}.${field}`, value);
  };

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

  const updateAppointment = (
    index: number,
    field: keyof AppointmentForm,
    value: any,
  ) => {
    form.setFieldValue(`appointments.${index}.${field}`, value);
  };

  const addAppointment = () => {
    form.setFieldValue("appointments", [
      ...form.values.appointments,
      {
        id: crypto.randomUUID(),
        startDate: null,
        startTime: "",
        endTime: "",
        staffId: [],
        notes: "",
        images: [],
      },
    ]);
  };

  const handleSubmit = async (values: JobFormValues) => {
    const payload = {
      ...values,
      appointments: values.appointments.map((appt) => ({
        startDate: appt.startDate,
        startTime: appt.startTime,
        endTime: appt.endTime,
        staffId: appt.staffId.length ? appt.staffId : undefined,
        notes: appt.notes ? [appt.notes] : undefined,
        images: appt.images?.length
          ? appt.images.map((file) => ({
              url: URL.createObjectURL(file),
            }))
          : undefined,
      })),
    };

    await createJob(payload);
    onSuccess();
    form.reset();
    onClose();
  };

  const renderAppointments = () =>
    form.values.appointments.map((appt, index) => (
      <Card withBorder mt="sm" key={appt.id}>
        <Grid>
          <Grid.Col span={4}>
            <DateInput
              label="Date"
              {...form.getInputProps(`appointments.${index}.startDate`)}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <TimePicker
              label="Start"
              disabled={form.values.isAnytime}
              {...form.getInputProps(`appointments.${index}.startTime`)}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <TimePicker
              label="End"
              disabled={form.values.isAnytime}
              {...form.getInputProps(`appointments.${index}.endTime`)}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <MultiSelect
              label="Staff"
              placeholder="Assign staff"
              data={
                staffData?.data.map((staff: Staff) => ({
                  value: staff.id,
                  label: staff.name,
                })) || []
              }
              onSearchChange={setSearchAssignees}
              searchable
              {...form.getInputProps(`appointments.${index}.staffId`)}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <Textarea
              label="Notes"
              placeholder="Enter notes"
              {...form.getInputProps(`appointments.${index}.notes`)}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <Dropzone
              onDrop={(files) =>
                updateAppointment(index, "images", [
                  ...(appt.images || []),
                  ...files.slice(0, 10 - (appt.images?.length || 0)),
                ])
              }
              maxFiles={10}
            >
              <Flex direction="column" align="center">
                <IoImageOutline size={24} />
                <Text mt="xs" size="xs">
                  Drag images here or click to upload (max 10)
                </Text>
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
                  clientsData?.data.map((c: Client) => ({
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
                  addressesData?.data.map((a) => ({
                    value: a.id,
                    label: `${a.street1}, ${a.city}, ${a.province}`,
                  })) || []
                }
              />
            </Grid.Col>
          </Grid>

          <Divider my="sm" />

          <Group justify="apart">
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

          <Text fw={500} mb="sm">
            Appointments
          </Text>
          {renderAppointments()}
          <Button
            mt="sm"
            leftSection={<IoAddOutline />}
            size="xs"
            onClick={addAppointment}
          >
            Add Appointment
          </Button>
        </Paper>

        <Group justify="right" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" color="green">
            Save Job
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
