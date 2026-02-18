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
  Radio,
  Checkbox,
  Center,
  Text,
  Card,
  MultiSelect,
  Flex,
} from "@mantine/core";
import { DateInput, TimePicker } from "@mantine/dates";
import { Dropzone } from "@mantine/dropzone";
import { useDebouncedValue } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  IoAddOutline,
  IoCalendarOutline,
  IoImageOutline,
  IoPersonOutline,
  IoRadioButtonOffOutline,
  IoReloadOutline,
  IoTextOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { createJob, CreateJobPayload, JobFormValues } from "@/lib/api/jobs";
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

export default function NewJobModal({
  opened,
  onClose,
  selectedInfo,
  onSuccess,
}: Props) {
  console.log("selectedInfo", selectedInfo);

  const form = useForm<JobFormValues>({
    initialValues: {
      title: "",
      clientId: "",
      staffId: [],
      addressId: "",
      jobType: "ONE_OFF",
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
      isAnytime: false,
      visitInstructions: "",
      recurrence: {
        frequency: "weekly",
        interval: 1,
        endType: "after",
        endsAfter: 6,
        endsUnit: "months",
        endsOn: null,
      },
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
      notes: "",
    },
    validate: {
      title: (value) =>
        value.trim().length < 3 ? "Title must be at least 3 characters" : null,

      clientId: (value) => (!value ? "Client is required" : null),

      addressId: (value) => (!value ? "Address is required" : null),

      staffId: (value) =>
        !value || value.length === 0
          ? "At least one staff member must be assigned"
          : null,

      startDate: (value) => (!value ? "Start date is required" : null),

      startTime: (value, values) => {
        if (values.isAnytime) return null;
        if (!value) return "Start time is required";
        return null;
      },

      endTime: (value, values) => {
        if (values.isAnytime) return null;
        if (!value) return "End time is required";

        if (!values.startTime) return null;

        const [sh, sm] = values.startTime.split(":").map(Number);
        const [eh, em] = value.split(":").map(Number);

        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;

        if (endMinutes <= startMinutes) {
          return "End time must be after start time";
        }

        return null;
      },

      visitInstructions: (value) =>
        value.length > 500
          ? "Visit instructions cannot exceed 500 characters"
          : null,

      recurrence: {
        interval: (value, values) => {
          if (values.jobType !== "RECURRING") return null;
          if (!value || value < 1) return "Repeat interval must be at least 1";
          return null;
        },

        endsAfter: (value, values) => {
          if (
            values.jobType !== "RECURRING" ||
            values.recurrence.endType !== "after"
          )
            return null;

          if (!value || value < 1) return "Must repeat at least once";

          return null;
        },

        endsOn: (value, values) => {
          if (
            values.jobType !== "RECURRING" ||
            values.recurrence.endType !== "on"
          )
            return null;

          if (!value) return "End date is required";

          if (values.startDate && value <= values.startDate)
            return "End date must be after start date";

          return null;
        },
      },

      lineItems: (value) => {
        if (!value || value.length === 0)
          return "At least one line item is required";
        return null;
      },
    },
  });

  const s = selectedInfo?.start
    ? selectedInfo.start.toTimeString().slice(0, 5)
    : "";
  console.log(s);

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

  const updateItem = (
    index: string | number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    form.setFieldValue(`lineItems.${index}.${field}`, value);
  };

  const addItem = () => {
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

  const handleOnSubmit = async (values: CreateJobPayload) => {
    console.log("info", selectedInfo);
    console.log("values", values);
    const data = {
      title: form.values.title,
      clientId: form.values.clientId,
      staffId: form.values.staffId,
      addressId: form.values.addressId,
      jobType: form.values.jobType,
      startDate: form.values.startDate,
      startTime: form.values.startTime,
      endTime: form.values.endTime,
      isAnytime: form.values.isAnytime,
      recurrence: form.values.recurrence,
      visitInstructions: form.values.visitInstructions,
    };
    await createJob(data);
    onSuccess();
    form.reset();
    onClose();
  };

  const renderLineItems = () =>
    form.values.lineItems.map((item, index) => {
      const total = item.quantity * item.unitCost;

      return (
        <Card withBorder key={item.id} mt={index ? "xs" : 0}>
          <Grid align="flex-end">
            <Grid.Col span={12}>
              <TextInput
                label="Name"
                placeholder="Enter name"
                value={item.name}
                onChange={(e) => updateItem(index, "name", e.target.value)}
              />
            </Grid.Col>

            <Grid.Col span={3}>
              <NumberInput
                label="Quantity"
                placeholder="Enter quantity"
                min={1}
                value={item.quantity}
                onChange={(val) => updateItem(index, "quantity", val)}
              />
            </Grid.Col>

            <Grid.Col span={3}>
              <NumberInput
                label="Unit cost"
                placeholder="Enter cost"
                prefix="$"
                decimalScale={2}
                value={item.unitCost}
                onChange={(val) => updateItem(index, "unitCost", val)}
              />
            </Grid.Col>

            <Grid.Col span={3}>
              <NumberInput
                label="Unit price"
                prefix="$"
                placeholder="Enter price"
                decimalScale={2}
                value={item.unitPrice}
                onChange={(val) =>
                  updateItem(item.id, "unitPrice", Number(val))
                }
              />
            </Grid.Col>

            <Grid.Col span={3}>
              <TextInput
                label="Total"
                placeholder="Enter total"
                value={`$${total.toFixed(2)}`}
                readOnly
              />
            </Grid.Col>
          </Grid>

          <Textarea
            mt="sm"
            placeholder="Description"
            value={item.description}
            onChange={(e) => updateItem(item.id, "description", e.target.value)}
          />
        </Card>
      );
    });

  const renderDateTimeBlock = () => (
    <Grid>
      <Grid.Col span={4}>
        <DateInput
          label="Start date"
          leftSection={<IoCalendarOutline />}
          {...form.getInputProps("startDate")}
        />
      </Grid.Col>

      <Grid.Col span={4}>
        <TimePicker
          disabled={form.values.isAnytime}
          label="Start time"
          leftSection={<IoTimeOutline />}
          format="12h"
          withDropdown
          {...form.getInputProps("startTime")}
        />
      </Grid.Col>

      <Grid.Col span={4}>
        <TimePicker
          disabled={form.values.isAnytime}
          label="End time"
          leftSection={<IoTimeOutline />}
          format="12h"
          withDropdown
          {...form.getInputProps("endTime")}
        />
      </Grid.Col>
    </Grid>
  );

  const renderRecurrenceBlock = () => (
    <Grid>
      <Grid.Col span={6}>
        <Select
          mt="sm"
          label="Repeats"
          leftSection={<IoReloadOutline />}
          data={[
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
          ]}
          {...form.getInputProps("recurrence.frequency")}
        />
      </Grid.Col>
      <Grid.Col span={6}>
        <NumberInput
          mt="sm"
          label="Repeat every"
          min={1}
          {...form.getInputProps("recurrence.interval")}
        />
      </Grid.Col>
      <Grid.Col span={12}>
        <Radio.Group
          mt="sm"
          label="Ends"
          {...form.getInputProps("recurrence.endType")}
        >
          <Stack mt="sm">
            <Radio value="after" label="After" />

            {form.values.recurrence.endType === "after" && (
              <Grid>
                <Grid.Col span={6}>
                  <NumberInput
                    min={1}
                    {...form.getInputProps("recurrence.endsAfter")}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select
                    data={[
                      { value: "months", label: "Months" },
                      { value: "weeks", label: "Weeks" },
                    ]}
                    {...form.getInputProps("recurrence.endsUnit")}
                  />
                </Grid.Col>
              </Grid>
            )}

            <Radio value="on" label="On date" />

            {form.values.recurrence.endType === "on" && (
              <DateInput {...form.getInputProps("recurrence.endsOn")} />
            )}
          </Stack>
        </Radio.Group>
      </Grid.Col>
    </Grid>
  );

  return (
    <Modal
      key={selectedInfo?.start?.toISOString() ?? "new"}
      opened={opened}
      onClose={onClose}
      size="lg"
      title="New Job"
      centered
    >
      <form
        onSubmit={form.onSubmit(
          (values) => {
            handleOnSubmit(values);
          },
          (errors) => {
            console.log("VALIDATION ERRORS:", errors);
          },
        )}
      >
        <Paper>
          <Group mb="sm" justify="space-between">
            <Text fw={500} size="sm">
              Select Job Type
            </Text>
            <SegmentedControl
              size="xs"
              color="green"
              value={form.values.jobType}
              onChange={(value) =>
                form.setFieldValue(
                  "jobType",
                  value as CreateJobPayload["jobType"],
                )
              }
              data={[
                {
                  label: (
                    <Center>
                      <IoRadioButtonOffOutline />
                      <span style={{ marginLeft: 6 }}>One off</span>
                    </Center>
                  ),
                  value: "ONE_OFF",
                },
                {
                  label: (
                    <Center>
                      <IoReloadOutline />
                      <span style={{ marginLeft: 6 }}>Recurring</span>
                    </Center>
                  ),
                  value: "RECURRING",
                },
              ]}
            />
          </Group>

          <TextInput
            leftSection={<IoTextOutline />}
            label="Title"
            placeholder="Enter title"
            {...form.getInputProps("title")}
          />

          <Grid mt="sm">
            <Grid.Col span={6}>
              <Select
                leftSection={<IoPersonOutline />}
                {...form.getInputProps("clientId")}
                data={
                  clientsData?.data.map((client: Client) => ({
                    value: client.id,
                    label:
                      client.companyName ||
                      `${client.firstName} ${client.lastName}`,
                  })) || []
                }
                placeholder="Select Clients"
                onSearchChange={setSearchClients}
                searchable
                label="Client"
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <MultiSelect
                leftSection={<IoPersonOutline />}
                {...form.getInputProps("staffId")}
                placeholder="Select Assignee"
                data={
                  staffData?.data.map((staff: Staff) => ({
                    value: staff.id,
                    label: staff.name,
                  })) || []
                }
                onSearchChange={setSearchAssignees}
                searchable
                label="Assignees"
              />
            </Grid.Col>
          </Grid>

          <Select
            mt="sm"
            label="Client Address"
            {...form.getInputProps("addressId")}
            placeholder="Select Address"
            data={
              addressesData?.data.map((address) => ({
                value: address?.id || "",
                label: `${address.street1}, ${address.city}, ${address.province}`,
              })) || []
            }
          />

          <Divider my="md" />

          <Group mb="sm" justify="space-between">
            <Text fw={500} size="sm">
              Services
            </Text>
            <Button
              leftSection={<IoAddOutline />}
              size="xs"
              variant="light"
              color="green"
              onClick={addItem}
            >
              Add Line Item
            </Button>
          </Group>

          {renderLineItems()}

          <Divider my="md" />

          <Text fw={500} size="sm" mb="sm">
            Date and Time
          </Text>

          {renderDateTimeBlock()}

          <Checkbox
            my="md"
            label="Anytime"
            {...form.getInputProps("isAnytime", { type: "checkbox" })}
          />

          {form.values.jobType === "RECURRING" && renderRecurrenceBlock()}

          <Textarea
            mt="md"
            label="Visit instructions"
            placeholder="Type instructions here..."
            minRows={3}
            {...form.getInputProps("visitInstructions")}
          />

          <Dropzone mt="xs" onDrop={() => {}}>
            <Flex direction="column" align="center">
              <IoImageOutline />
              <Text mt="xs" size="xs">
                Drag images here or click to select files
              </Text>
            </Flex>
          </Dropzone>
        </Paper>

        <Group justify="flex-end" mt="md">
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
