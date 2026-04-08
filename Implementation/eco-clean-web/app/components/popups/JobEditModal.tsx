"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Grid,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Textarea,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useDebouncedValue } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IoAdd,
  IoCalendar,
  IoClose,
  IoConstruct,
  IoLocation,
  IoRefresh,
} from "react-icons/io5";

import Loader from "../UI/Loader";
import { useJob } from "@/hooks/useJob";
import { getClientAddresses, getClients } from "@/lib/api/client";
import { updateJob } from "@/lib/api/jobs";
import { queryKeys } from "@/lib/queryKeys";
import { useDashboardUI } from "@/stores/store";
import { Client, LineItem } from "@/types";
import { APP_TZ, isoToDateOnly } from "@/lib/dateTime";
import { DateTime } from "luxon";

type EditableLineItem = {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  description: string;
};

type FormValues = {
  title: string;
  clientId: string;
  addressId: string;
  isAnytime: boolean;
  visitInstructions: string;
  recurrence: {
    frequency: "weekly" | "monthly";
    interval: number;
    endType: "after" | "on";
    endsAfter: number;
    endsOn: Date | null;
  };
  lineItems: EditableLineItem[];
};

type Props = {
  onSuccess: () => void;
};

function createEmptyLineItem(): EditableLineItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    quantity: 1,
    unitCost: 0,
    unitPrice: 0,
    description: "",
  };
}

function mapJobLineItems(items?: LineItem[]) {
  if (!items?.length) return [createEmptyLineItem()];

  return items.map((item) => ({
    id: item.id || crypto.randomUUID(),
    name: item.name || "",
    quantity: item.quantity || 1,
    unitCost: item.unitCost ?? 0,
    unitPrice: item.unitPrice ?? 0,
    description: item.description ?? "",
  }));
}

const heroPaperStyles = {
  root: {
    background:
      "radial-gradient(circle at top right, rgba(101, 163, 13, 0.16), transparent 34%), linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.96))",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    boxShadow:
      "inset 0 1px 0 rgba(255, 255, 255, 0.78), 0 16px 34px rgba(148, 163, 184, 0.14)",
  },
} as const;

const sectionPaperStyles = {
  root: {
    background:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96))",
    border: "1px solid rgba(203, 213, 225, 0.75)",
    boxShadow: "0 10px 24px rgba(148, 163, 184, 0.1)",
  },
} as const;

const lineItemPaperStyles = {
  root: {
    background:
      "linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98))",
    border: "1px solid rgba(203, 213, 225, 0.78)",
  },
} as const;

export default function JobEditModal({ onSuccess }: Props) {
  const { editJobOpen, closeEditJob, selectedJobId, selectedApptId } =
    useDashboardUI();
  const { data: job, isLoading } = useJob(selectedJobId);
  const qc = useQueryClient();

  const [searchClients, setSearchClients] = useState("");
  const [debouncedSearchClients] = useDebouncedValue(searchClients, 250);

  const form = useForm<FormValues>({
    mode: "controlled",
    initialValues: {
      title: "",
      clientId: "",
      addressId: "",
      isAnytime: false,
      visitInstructions: "",
      recurrence: {
        frequency: "weekly",
        interval: 1,
        endType: "after",
        endsAfter: 6,
        endsOn: null,
      },
      lineItems: [createEmptyLineItem()],
    },
    validate: {
      title: (value) =>
        value.trim().length < 3 ? "Title must be at least 3 characters" : null,
      clientId: (value) => (!value ? "Client is required" : null),
      addressId: (value) => (!value ? "Address is required" : null),
      visitInstructions: (value) =>
        value.trim().length > 500
          ? "Visit instructions cannot exceed 500 characters"
          : null,
      recurrence: {
        interval: (value) =>
          job?.type === "RECURRING" && (!value || value < 1)
            ? "Repeat interval must be at least 1"
            : null,
        endsAfter: (value, values) =>
          job?.type === "RECURRING" &&
          values.recurrence.endType === "after" &&
          (!value || value < 1)
            ? "Must repeat at least once"
            : null,
        endsOn: (value, values) =>
          job?.type === "RECURRING" &&
          values.recurrence.endType === "on" &&
          !value
            ? "End date is required"
            : null,
      },
      lineItems: (value) => {
        if (!value.length) return "At least one line item is required";

        const hasInvalidItem = value.some(
          (item) => !item.name.trim() || Number(item.quantity) < 1,
        );

        return hasInvalidItem
          ? "Each line item needs a name and quantity"
          : null;
      },
    },
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ["clients", "edit-job", debouncedSearchClients],
    queryFn: () => getClients(debouncedSearchClients),
    enabled: editJobOpen,
  });

  const { data: addressesData, isLoading: addressesLoading } = useQuery({
    queryKey: ["client-addresses", "edit-job", form.values.clientId],
    queryFn: () => getClientAddresses(form.values.clientId),
    enabled: editJobOpen && !!form.values.clientId,
  });

  useEffect(() => {
    if (!job) return;

    form.setValues({
      title: job.title ?? "",
      clientId: job.clientId ?? "",
      addressId: job.addressId ?? "",
      isAnytime: !!job.isAnytime,
      visitInstructions: job.visitInstructions ?? "",
      recurrence: {
        frequency:
          job.recurrence?.frequency === "monthly" ? "monthly" : "weekly",
        interval: job.recurrence?.interval ?? 1,
        endType: job.recurrence?.endType === "on" ? "on" : "after",
        endsAfter: job.recurrence?.endsAfter ?? 6,
        endsOn: job.recurrence?.endsOn
          ? isoToDateOnly(job.recurrence.endsOn)
          : null,
      },
      lineItems: mapJobLineItems(job.lineItems),
    });
    form.resetDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, job?.updatedAt]);

  useEffect(() => {
    if (job?.type !== "RECURRING") return;

    if (form.values.recurrence.endType === "after") {
      if (form.values.recurrence.endsOn) {
        form.setFieldValue("recurrence.endsOn", null);
      }
      if (
        !form.values.recurrence.endsAfter ||
        form.values.recurrence.endsAfter < 1
      ) {
        form.setFieldValue("recurrence.endsAfter", 1);
      }
    }
  }, [
    form,
    form.values.recurrence.endType,
    form.values.recurrence.endsAfter,
    form.values.recurrence.endsOn,
    job?.type,
  ]);

  useEffect(() => {
    const availableAddressIds = new Set(
      (addressesData?.data ?? []).map((address) => address.id),
    );

    if (
      form.values.addressId &&
      availableAddressIds.size > 0 &&
      !availableAddressIds.has(form.values.addressId)
    ) {
      form.setFieldValue("addressId", "");
    }
  }, [addressesData?.data, form.values.addressId, form]);

  const clientOptions = useMemo(() => {
    const options = (clientsData?.data ?? []).map((client: Client) => ({
      value: client.id,
      label: client.companyName || `${client.firstName} ${client.lastName}`,
    }));

    if (
      job?.client &&
      !options.some((option) => option.value === job.client.id)
    ) {
      options.unshift({
        value: job.client.id,
        label:
          job.client.companyName ||
          `${job.client.firstName} ${job.client.lastName}`,
      });
    }

    return options;
  }, [clientsData?.data, job?.client]);

  const addressOptions = useMemo(() => {
    const options = (addressesData?.data ?? []).map((address) => ({
      value: address.id,
      label: `${address.street1}, ${address.city}, ${address.province}`,
    }));

    if (
      job?.address &&
      !options.some((option) => option.value === job.address.id)
    ) {
      options.unshift({
        value: job.address.id,
        label: `${job.address.street1}, ${job.address.city}, ${job.address.province}`,
      });
    }

    return options;
  }, [addressesData?.data, job?.address]);

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!selectedJobId) throw new Error("No job selected");

      return updateJob(selectedJobId, {
        title: values.title.trim(),
        clientId: values.clientId,
        addressId: values.addressId,
        isAnytime: values.isAnytime,
        visitInstructions: values.visitInstructions.trim() || null,
        recurrence:
          job?.type === "RECURRING"
            ? {
                frequency: values.recurrence.frequency,
                interval: Math.max(
                  1,
                  Math.trunc(values.recurrence.interval || 1),
                ),
                endType: values.recurrence.endType,
                endsAfter:
                  values.recurrence.endType === "after"
                    ? Math.max(1, Math.trunc(values.recurrence.endsAfter || 1))
                    : null,
                endsOn:
                  values.recurrence.endType === "on" && values.recurrence.endsOn
                    ? DateTime.fromJSDate(values.recurrence.endsOn, {
                        zone: APP_TZ,
                      }).toFormat("yyyy-LL-dd")
                    : null,
              }
            : null,
        lineItems: values.lineItems.map((item) => ({
          name: item.name.trim(),
          quantity: Math.max(1, Math.trunc(Number(item.quantity) || 1)),
          unitCost: Number.isFinite(item.unitCost) ? item.unitCost : null,
          unitPrice: Number.isFinite(item.unitPrice) ? item.unitPrice : null,
          description: item.description.trim() || null,
        })),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.jobs.all });
      qc.invalidateQueries({ queryKey: queryKeys.jobs.detail(selectedJobId) });

      if (selectedApptId) {
        qc.invalidateQueries({
          queryKey: queryKeys.appointments.detail(selectedApptId),
        });
      }

      onSuccess();
      closeEditJob();
      notifications.show({
        title: "Success",
        message: "Updated the job",
        color: "green",
      });
    },
    onError: (error) => {
      notifications.show({
        title: "Unable to update job",
        message: error.message || "Something went wrong",
        color: "red",
      });
    },
  });

  const handleClose = () => {
    form.reset();
    closeEditJob();
  };

  const addLineItem = () => {
    form.insertListItem("lineItems", createEmptyLineItem());
  };

  const removeLineItem = (index: number) => {
    if (form.values.lineItems.length === 1) {
      form.setFieldValue("lineItems", [createEmptyLineItem()]);
      return;
    }

    form.removeListItem("lineItems", index);
  };

  return (
    <Modal
      opened={editJobOpen}
      onClose={handleClose}
      title="Edit Job"
      size="xl"
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
      ) : !job ? null : (
        <form
          onSubmit={form.onSubmit((values) => updateMutation.mutate(values))}
        >
          <Stack gap="md">
            <Paper withBorder radius="xl" p="lg" styles={sectionPaperStyles}>
              <Stack gap="md">
                <Group justify="space-between" align="flex-start" wrap="wrap">
                  <Stack gap={2}>
                    <Text size="sm" fw={800} c="dark">
                      Core details
                    </Text>
                  </Stack>
                </Group>
                <TextInput
                  label="Title"
                  placeholder="Job title"
                  disabled={updateMutation.isPending}
                  {...form.getInputProps("title")}
                />

                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Client"
                      searchable
                      leftSection={<IoLocation size={16} />}
                      placeholder={
                        clientsLoading ? "Loading clients..." : "Select client"
                      }
                      data={clientOptions}
                      disabled={updateMutation.isPending}
                      onSearchChange={setSearchClients}
                      onChange={(value) => {
                        form.setFieldValue("clientId", value ?? "");
                        form.setFieldValue("addressId", "");
                      }}
                      value={form.values.clientId}
                      error={form.errors.clientId}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Service Address"
                      leftSection={<IoLocation size={16} />}
                      placeholder={
                        !form.values.clientId
                          ? "Select client first"
                          : addressesLoading
                            ? "Loading addresses..."
                            : "Select address"
                      }
                      data={addressOptions}
                      disabled={
                        !form.values.clientId || updateMutation.isPending
                      }
                      {...form.getInputProps("addressId")}
                    />
                  </Grid.Col>
                </Grid>

                <Checkbox
                  label="Allow anytime scheduling for this job"
                  disabled={updateMutation.isPending}
                  {...form.getInputProps("isAnytime", { type: "checkbox" })}
                />

                <Textarea
                  label="Visit Instructions"
                  placeholder="Access notes, parking details, alarm codes, or special requests"
                  autosize
                  minRows={3}
                  disabled={updateMutation.isPending}
                  {...form.getInputProps("visitInstructions")}
                />
              </Stack>
            </Paper>

            {job.type === "RECURRING" && (
              <Paper withBorder radius="xl" p="lg" styles={sectionPaperStyles}>
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start" wrap="wrap">
                    <Stack gap={2}>
                      <Text size="sm" fw={800} c="dark">
                        Recurrence
                      </Text>
                      <Text size="sm" c="dimmed">
                        Adjust how often this job repeats and when the series
                        should stop generating future visits.
                      </Text>
                    </Stack>
                  </Group>

                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label="Frequency"
                        data={[
                          { value: "weekly", label: "Weekly" },
                          { value: "monthly", label: "Monthly" },
                        ]}
                        disabled={updateMutation.isPending}
                        value={form.values.recurrence.frequency}
                        onChange={(value) =>
                          form.setFieldValue(
                            "recurrence.frequency",
                            (value as "weekly" | "monthly") || "weekly",
                          )
                        }
                      />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <NumberInput
                        label={`Every (${form.values.recurrence.frequency === "weekly" ? "weeks" : "months"})`}
                        min={1}
                        allowDecimal={false}
                        disabled={updateMutation.isPending}
                        {...form.getInputProps("recurrence.interval")}
                      />
                    </Grid.Col>
                  </Grid>

                  <Stack gap="xs">
                    <Group justify="space-between" align="center" wrap="wrap">
                      <Text size="sm" fw={700}>
                        Ends
                      </Text>
                      <SegmentedControl
                        color="lime"
                        data={[
                          { label: "After", value: "after" },
                          { label: "On Date", value: "on" },
                        ]}
                        disabled={updateMutation.isPending}
                        value={form.values.recurrence.endType}
                        onChange={(value) =>
                          form.setFieldValue(
                            "recurrence.endType",
                            value as "after" | "on",
                          )
                        }
                      />
                    </Group>
                  </Stack>

                  {form.values.recurrence.endType === "after" ? (
                    <NumberInput
                      label="Number of occurrences"
                      min={1}
                      allowDecimal={false}
                      disabled={updateMutation.isPending}
                      {...form.getInputProps("recurrence.endsAfter")}
                    />
                  ) : (
                    <DateInput
                      label="End Date"
                      disabled={updateMutation.isPending}
                      value={form.values.recurrence.endsOn}
                      onChange={(value) =>
                        form.setFieldValue(
                          "recurrence.endsOn",
                          value ? new Date(value) : null,
                        )
                      }
                      error={form.errors["recurrence.endsOn"]}
                    />
                  )}
                </Stack>
              </Paper>
            )}

            <Paper withBorder radius="xl" p="lg" styles={sectionPaperStyles}>
              <Group
                mb="sm"
                justify="space-between"
                align="flex-start"
                wrap="wrap"
              >
                <Stack gap={2}>
                  <Text size="sm" fw={800} c="dark">
                    Services
                  </Text>
                </Stack>
                <Button
                  type="button"
                  size="sm"
                  variant="light"
                  leftSection={<IoAdd />}
                  onClick={addLineItem}
                  disabled={updateMutation.isPending}
                >
                  Add Line Item
                </Button>
              </Group>

              <Stack gap="sm">
                {form.values.lineItems.map((item, index) => (
                  <Paper
                    key={item.id}
                    withBorder
                    radius="lg"
                    p="md"
                    styles={lineItemPaperStyles}
                  >
                    <Group justify="space-between" align="flex-start" mb="xs">
                      <Badge variant="light" radius="xl" color="gray">
                        Item {index + 1}
                      </Badge>
                      <ActionIcon
                        type="button"
                        variant="subtle"
                        color="red"
                        onClick={() => removeLineItem(index)}
                        disabled={updateMutation.isPending}
                        aria-label={`Remove line item ${index + 1}`}
                      >
                        <IoClose size={18} />
                      </ActionIcon>
                    </Group>

                    <Grid>
                      <Grid.Col span={{ base: 12, sm: 6 }}>
                        <TextInput
                          label="Name"
                          placeholder="Service name"
                          disabled={updateMutation.isPending}
                          {...form.getInputProps(`lineItems.${index}.name`)}
                        />
                      </Grid.Col>

                      <Grid.Col span={{ base: 12, sm: 2 }}>
                        <NumberInput
                          label="Qty"
                          min={1}
                          allowDecimal={false}
                          disabled={updateMutation.isPending}
                          {...form.getInputProps(`lineItems.${index}.quantity`)}
                        />
                      </Grid.Col>

                      <Grid.Col span={{ base: 12, sm: 2 }}>
                        <NumberInput
                          label="Unit Cost"
                          min={0}
                          decimalScale={2}
                          prefix="$"
                          disabled={updateMutation.isPending}
                          {...form.getInputProps(`lineItems.${index}.unitCost`)}
                        />
                      </Grid.Col>

                      <Grid.Col span={{ base: 12, sm: 2 }}>
                        <NumberInput
                          label="Unit Price"
                          min={0}
                          decimalScale={2}
                          prefix="$"
                          disabled={updateMutation.isPending}
                          {...form.getInputProps(
                            `lineItems.${index}.unitPrice`,
                          )}
                        />
                      </Grid.Col>
                    </Grid>

                    <Textarea
                      mt="sm"
                      label="Description"
                      placeholder="Optional details"
                      autosize
                      minRows={2}
                      disabled={updateMutation.isPending}
                      {...form.getInputProps(`lineItems.${index}.description`)}
                    />
                  </Paper>
                ))}
              </Stack>
            </Paper>

            <Group grow>
              <Button variant="default" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={updateMutation.isPending}
                leftSection={<IoCalendar size={16} />}
              >
                Save Job Changes
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  );
}
