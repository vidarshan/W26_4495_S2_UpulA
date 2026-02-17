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
import { useState } from "react";
import {
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
  const queryClient = useQueryClient();
  console.log(selectedInfo);
  const form = useForm<JobFormValues>({
    initialValues: {
      title: "",
      clientId: "",
      staffId: [],
      addressId: "",
      jobType: "ONE_OFF",
      startDate: null,
      startTime: "",
      endTime: "",
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
      lineItems: [],
      notes: "",
    },
  });

  const [searchClients, setSearchClients] = useState("");
  const [searchAssignees, setSearchAssignees] = useState("");
  const [debouncedSearchClients] = useDebouncedValue(searchClients, 300);
  const [debouncedSearchAssignees] = useDebouncedValue(searchAssignees, 300);

  const [items, setItems] = useState<LineItem[]>([
    {
      id: crypto.randomUUID(),
      name: "",
      quantity: 1,
      unitCost: 0,
      unitPrice: 0,
      description: "",
    },
  ]);

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

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
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

  const handleOnSubmit = async (values) => {
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
  };

  const renderLineItems = () =>
    items.map((item, index) => {
      const total = item.quantity * item.unitPrice;

      return (
        <Card withBorder key={item.id} mt={index ? "xs" : 0}>
          <Grid align="flex-end">
            <Grid.Col span={12}>
              <TextInput
                label="Name"
                value={item.name}
                onChange={(e) => updateItem(item.id, "name", e.target.value)}
              />
            </Grid.Col>

            <Grid.Col span={3}>
              <NumberInput
                label="Quantity"
                min={1}
                value={item.quantity}
                onChange={(val) => updateItem(item.id, "quantity", Number(val))}
              />
            </Grid.Col>

            <Grid.Col span={3}>
              <NumberInput
                label="Unit cost"
                prefix="$"
                decimalScale={2}
                value={item.unitCost}
                onChange={(val) => updateItem(item.id, "unitCost", Number(val))}
              />
            </Grid.Col>

            <Grid.Col span={3}>
              <NumberInput
                label="Unit price"
                prefix="$"
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
          label="Start time"
          leftSection={<IoTimeOutline />}
          format="12h"
          withDropdown
          {...form.getInputProps("startTime")}
        />
      </Grid.Col>

      <Grid.Col span={4}>
        <TimePicker
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
    <Modal opened={opened} onClose={onClose} size="lg" title="New Job" centered>
      <form
        onSubmit={form.onSubmit((values) => {
          console.log(values);
          handleOnSubmit(values);
          form.reset();
          onClose();
        })}
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
                onSearchChange={setSearchClients}
                searchable
                label="Client"
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <MultiSelect
                leftSection={<IoPersonOutline />}
                {...form.getInputProps("staffId")}
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
            <Button size="xs" variant="light" color="green" onClick={addItem}>
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
