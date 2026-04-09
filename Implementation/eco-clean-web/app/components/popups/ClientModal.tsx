"use client";

import {
  createClient,
  deleteClient,
  type ClientWithRelations,
  type CreateClientPayload,
  updateClient,
} from "@/lib/api/client";
import {
  Modal,
  TextInput,
  Select,
  Checkbox,
  Button,
  Grid,
  Stack,
  Group,
  Title,
  Text,
  Paper,
  Divider,
  Textarea,
  Radio,
  Loader,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";

type AddressForm = {
  id?: string;
  street1: string;
  street2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  billingSameAsProperty: boolean;
};

type ClientForm = {
  title: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  email: string;
  preferredContact: string;
  leadSource: string;
  note: string;
  addresses: AddressForm[];
};

type Props = {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  clientId?: string;
};

type ClientAddressWithBilling = ClientWithRelations["addresses"][number] & {
  isBilling?: boolean;
};

const DEFAULT_VALUES: ClientForm = {
  title: "No title",
  firstName: "",
  lastName: "",
  company: "",
  phone: "",
  email: "",
  preferredContact: "email",
  leadSource: "",
  note: "",
  addresses: [
    {
      street1: "",
      street2: "",
      city: "",
      province: "",
      postalCode: "",
      country: "Canada",
      billingSameAsProperty: true,
    },
  ],
};

const PROVINCES = ["QC"];

function formatPostalCode(value: string) {
  const cleaned = value.replace(/\s/g, "").toUpperCase().slice(0, 6);
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)}`;
}

function formatPhone(value: string) {
  const cleaned = value.replace(/\D/g, "").slice(0, 11);

  if (cleaned.length <= 1 && cleaned.startsWith("1")) return cleaned;
  const digits = cleaned.startsWith("1") ? cleaned.slice(1) : cleaned;

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export default function ClientPropertyModal({
  opened,
  onClose,
  clientId,
  onSuccess,
}: Props) {
  const queryClient = useQueryClient();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const form = useForm<ClientForm>({
    initialValues: DEFAULT_VALUES,
    validate: {
      firstName: (v) => (!v.trim() ? "First name is required" : null),
      lastName: (v) => (!v.trim() ? "Last name is required" : null),
      email: (v) =>
        /^\S+@\S+\.\S+$/.test(v.trim()) ? null : "Invalid email address",
      phone: (value) => {
        if (!value) return "Phone number is required";
        const cleaned = value.replace(/\D/g, "");
        if (!/^1?\d{10}$/.test(cleaned)) {
          return "Enter a valid Canadian phone number";
        }
        return null;
      },
      addresses: {
        street1: (v) => (!v.trim() ? "Street address is required" : null),
        city: (v) => (!v.trim() ? "City is required" : null),
        province: (v) => (!v ? "Province is required" : null),
        postalCode: (value) => {
          if (!value) return "Postal code is required";

          const regex =
            /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ ]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;

          if (!regex.test(value.trim())) {
            return "Enter a valid Canadian postal code (e.g. H3B 4G5)";
          }

          return null;
        },
      },
    },
  });

  const {
    data: client,
    isLoading: clientLoading,
    isFetching: clientFetching,
    isError: clientError,
  } = useQuery({
    queryKey: ["client", clientId],
    enabled: opened && !!clientId,
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) throw new Error("Failed to fetch client");
      const json = await res.json();
      return json.data ?? json;
    },
  });

  const mutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id?: string;
      payload: CreateClientPayload;
    }) => {
      return id ? updateClient(id, payload) : createClient(payload);
    },
    onSuccess: async (data, variables) => {
      if (variables?.id) {
        queryClient.setQueryData(["client", variables.id], data);
      }

      await queryClient.invalidateQueries({ queryKey: ["clients"] });

      if (variables?.id) {
        await queryClient.invalidateQueries({
          queryKey: ["client", variables.id],
        });
      }

      notifications.show({
        title: "Success",
        message: variables?.id
          ? "Client updated successfully"
          : "Client created successfully",
        color: "green",
      });

      onSuccess?.();
      form.reset();
      onClose();
    },
    onError: (error) => {
      console.error(error);
      notifications.show({
        title: "Failed",
        message: "Could not save client. Please try again.",
        color: "red",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Missing client id");
      return deleteClient(clientId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["clients"] }),
        queryClient.invalidateQueries({ queryKey: ["client", clientId] }),
      ]);

      notifications.show({
        title: "Client deleted",
        message: "The client has been soft deleted and hidden from the app.",
        color: "green",
      });

      onSuccess?.();
      form.reset();
      onClose();
    },
    onError: (error) => {
      console.error(error);
      notifications.show({
        title: "Delete failed",
        message: "Could not delete client. Please try again.",
        color: "red",
      });
    },
  });

  const isBusy =
    mutation.isPending ||
    deleteMutation.isPending ||
    clientLoading ||
    clientFetching;

  const handleSubmit = (values: ClientForm) => {
    form.clearErrors();

    const payload = {
      title: values.title,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      companyName: values.company.trim(),
      phone: values.phone.trim(),
      email: values.email.trim().toLowerCase(),
      preferredContact:
        values.preferredContact === "call"
          ? "PHONE"
          : values.preferredContact === "sms"
            ? "TEXT"
            : "EMAIL",
      leadSource: values.leadSource.trim(),
      note: values.note.trim(),
      addresses: values.addresses.map((a) => ({
        id: a.id,
        street1: a.street1.trim(),
        street2: a.street2?.trim() || "",
        city: a.city.trim(),
        province: a.province,
        postalCode: formatPostalCode(a.postalCode),
        country: a.country,
        isBilling: !a.billingSameAsProperty,
      })),
    };

    mutation.mutate({ id: clientId, payload });
  };

  useEffect(() => {
    if (!opened) return;

    if (!clientId) {
      form.setValues(DEFAULT_VALUES);
      form.resetDirty(DEFAULT_VALUES);
      return;
    }

    if (!client) return;

    const nextValues: ClientForm = {
      title: client.title ?? "No title",
      firstName: client.firstName ?? "",
      lastName: client.lastName ?? "",
      company: client.companyName ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
      preferredContact:
        client.preferredContact === "PHONE"
          ? "call"
          : client.preferredContact === "TEXT"
            ? "sms"
            : "email",
      leadSource: client.leadSource ?? "",
      note: client.notes?.[0]?.content ?? "",
      addresses: ((
        (client as ClientWithRelations).addresses as ClientAddressWithBilling[]
      )?.length
        ? ((client as ClientWithRelations)
            .addresses as ClientAddressWithBilling[])
        : []
      ).map((a) => ({
        id: a.id,
        street1: a.street1 ?? "",
        street2: a.street2 ?? "",
        city: a.city ?? "",
        province: a.province ?? "",
        postalCode: a.postalCode ?? "",
        country: a.country ?? "Canada",
        billingSameAsProperty: !a.isBilling,
      })),
    };

    form.setValues(nextValues);
    form.resetDirty(nextValues);
  }, [opened, clientId, client]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal
      size="xl"
      centered
      opened={opened}
      onClose={isBusy ? () => {} : onClose}
      title={clientId ? "Edit client" : "Add client"}
      radius="lg"
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
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xl">
          {(clientLoading || mutation.isPending) && (
            <Paper withBorder p="sm" radius="lg">
              <Group gap="xs">
                <Loader size="sm" />
                <Text size="sm">
                  {clientLoading
                    ? "Loading client details..."
                    : "Saving client..."}
                </Text>
              </Group>
            </Paper>
          )}

          {clientError && clientId ? (
            <Paper withBorder p="sm" radius="lg">
              <Text size="sm" c="red">
                Failed to load client details.
              </Text>
            </Paper>
          ) : null}

          <Grid>
            <Grid.Col span={12}>
              <Title order={5}>Primary contact details</Title>
              <Text size="sm" c="dimmed">
                Provide the main point of contact to ensure smooth communication
                and reliable client records.
              </Text>
            </Grid.Col>

            <Grid.Col span={12}>
              <Stack gap="md">
                <Grid>
                  <Grid.Col span={3}>
                    <Select
                      label="Title"
                      data={["No title", "Mr.", "Mrs.", "Ms.", "Dr."]}
                      disabled={isBusy}
                      {...form.getInputProps("title")}
                    />
                  </Grid.Col>

                  <Grid.Col span={4.5}>
                    <TextInput
                      label="First name"
                      placeholder="Enter first name"
                      withAsterisk
                      disabled={isBusy}
                      {...form.getInputProps("firstName")}
                    />
                  </Grid.Col>

                  <Grid.Col span={4.5}>
                    <TextInput
                      label="Last name"
                      placeholder="Enter last name"
                      withAsterisk
                      disabled={isBusy}
                      {...form.getInputProps("lastName")}
                    />
                  </Grid.Col>
                </Grid>

                <TextInput
                  label="Company name"
                  placeholder="Enter company name"
                  disabled={isBusy}
                  {...form.getInputProps("company")}
                />

                <Divider />

                <Title order={6}>Communication</Title>

                <TextInput
                  label="Phone number"
                  type="tel"
                  placeholder="(604) 123-4567"
                  disabled={isBusy}
                  {...form.getInputProps("phone")}
                  onChange={(e) =>
                    form.setFieldValue(
                      "phone",
                      formatPhone(e.currentTarget.value),
                    )
                  }
                />

                <TextInput
                  label="Email"
                  placeholder="Enter email address"
                  withAsterisk
                  type="email"
                  disabled={isBusy}
                  {...form.getInputProps("email")}
                />

                <Radio.Group
                  label="Preferred communication method"
                  disabled={isBusy}
                  {...form.getInputProps("preferredContact")}
                >
                  <Group mt="xs">
                    <Radio value="call" label="Call" />
                    <Radio value="sms" label="SMS" />
                    <Radio value="email" label="Email" />
                  </Group>
                </Radio.Group>

                <Divider />

                <Title order={6}>Lead information</Title>

                <TextInput
                  label="Lead source"
                  placeholder="How did this client hear about us?"
                  disabled={isBusy}
                  {...form.getInputProps("leadSource")}
                />
              </Stack>
            </Grid.Col>
          </Grid>

          <Divider />

          <Grid>
            <Grid.Col span={12}>
              <Title order={5}>Property address</Title>
              <Text size="sm" c="dimmed">
                Enter the primary service address, billing address, or any
                additional locations where services may take place.
              </Text>
            </Grid.Col>

            <Grid.Col span={12}>
              <Stack gap="md">
                {form.values.addresses.map((_, index) => (
                  <Paper key={index} withBorder p="md" radius="lg">
                    <Stack>
                      <Group justify="space-between">
                        <strong>Address {index + 1}</strong>

                        {form.values.addresses.length > 1 && (
                          <Button
                            size="xs"
                            variant="light"
                            color="red"
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              form.removeListItem("addresses", index)
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </Group>

                      <TextInput
                        label="Street 1"
                        placeholder="Enter address"
                        disabled={isBusy}
                        {...form.getInputProps(`addresses.${index}.street1`)}
                      />

                      <TextInput
                        label="Street 2"
                        placeholder="Enter address"
                        disabled={isBusy}
                        {...form.getInputProps(`addresses.${index}.street2`)}
                      />

                      <Grid>
                        <Grid.Col span={6}>
                          <TextInput
                            label="City"
                            placeholder="Enter city"
                            disabled={isBusy}
                            {...form.getInputProps(`addresses.${index}.city`)}
                          />
                        </Grid.Col>

                        <Grid.Col span={6}>
                          <Select
                            label="Province"
                            placeholder="Select province"
                            data={PROVINCES}
                            disabled={isBusy}
                            {...form.getInputProps(
                              `addresses.${index}.province`,
                            )}
                          />
                        </Grid.Col>
                      </Grid>

                      <Grid>
                        <Grid.Col span={6}>
                          <TextInput
                            label="Postal code"
                            placeholder="H3B 4G5"
                            disabled={isBusy}
                            {...form.getInputProps(
                              `addresses.${index}.postalCode`,
                            )}
                            onChange={(e) =>
                              form.setFieldValue(
                                `addresses.${index}.postalCode`,
                                e.currentTarget.value.toUpperCase(),
                              )
                            }
                            onBlur={(e) =>
                              form.setFieldValue(
                                `addresses.${index}.postalCode`,
                                formatPostalCode(e.currentTarget.value),
                              )
                            }
                          />
                        </Grid.Col>

                        <Grid.Col span={6}>
                          <Select
                            label="Country"
                            data={["Canada"]}
                            disabled={isBusy}
                            {...form.getInputProps(
                              `addresses.${index}.country`,
                            )}
                          />
                        </Grid.Col>
                      </Grid>

                      <Checkbox
                        label="Billing address is the same as property address"
                        disabled={isBusy}
                        {...form.getInputProps(
                          `addresses.${index}.billingSameAsProperty`,
                          { type: "checkbox" },
                        )}
                      />
                    </Stack>
                  </Paper>
                ))}

                <Button
                  variant="light"
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    form.insertListItem("addresses", {
                      street1: "",
                      street2: "",
                      city: "",
                      province: "",
                      postalCode: "",
                      country: "Canada",
                      billingSameAsProperty: true,
                    })
                  }
                >
                  Add another address
                </Button>
              </Stack>
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span={12}>
              <Title order={5}>Add notes</Title>
              <Text size="sm" c="dimmed">
                Add any relevant information about the client, such as
                preferences, special instructions, or important details that can
                help provide better service and maintain a comprehensive client
                profile.
              </Text>
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                id="client-note-textarea"
                placeholder="Type your note here..."
                minRows={4}
                autosize
                disabled={isBusy}
                {...form.getInputProps("note")}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end">
            {clientId ? (
              <Button
                color="red"
                variant="light"
                type="button"
                disabled={isBusy}
                loading={deleteMutation.isPending}
                onClick={() => setConfirmDeleteOpen(true)}
              >
                Delete
              </Button>
            ) : null}
            <Button
              variant="default"
              type="button"
              disabled={isBusy}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={isBusy}
            >
              {clientId ? "Update" : "Create"}
            </Button>
          </Group>
        </Stack>
      </form>

      <Modal
        opened={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Delete client"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Soft delete this client? They will be hidden from lists but
            existing linked records will remain.
          </Text>

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={deleteMutation.isPending}
              onClick={() => {
                deleteMutation.mutate();
                setConfirmDeleteOpen(false);
              }}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Modal>
  );
}
