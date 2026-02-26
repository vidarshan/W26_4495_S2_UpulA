"use client";
import { createClient, updateClient } from "@/lib/api/client";
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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  IoAttachOutline,
  IoGlobeOutline,
  IoMailOpenOutline,
  IoMegaphoneOutline,
  IoTextOutline,
} from "react-icons/io5";

type AddressForm = {
  id?: string; // include for edit
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

export default function ClientPropertyModal({
  opened,
  onClose,
  clientId,
  onSuccess,
}: Props) {
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client", clientId],
    enabled: opened && !!clientId,
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) throw new Error("Failed to fetch client");
      const json = await res.json();
      return json.data ?? json;
    },
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: any }) => {
      return id ? updateClient(id, payload) : createClient(payload);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      if (variables?.id) {
        await queryClient.invalidateQueries({
          queryKey: ["client", variables.id],
        });
      }
      onSuccess?.();
      onClose();
      form.reset();
    },
    onError: (error) => console.error(error),
  });

  const form = useForm({
    initialValues: {
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
    },

    validate: {
      firstName: (v) => (!v ? "First name is required" : null),
      lastName: (v) => (!v ? "Last name is required" : null),
      email: (v) => (/^\S+@\S+$/.test(v) ? null : "Invalid email address"),
      phone: (v) => (v.length < 10 ? "Invalid phone number" : null),

      addresses: {
        street1: (v) => (!v ? "Street address is required" : null),
        city: (v) => (!v ? "City is required" : null),
        province: (v) => (!v ? "Province is required" : null),
        postalCode: (v) => (!v ? "Postal code is required" : null),
      },
    },
  });

  const handleSubmit = async (values: ClientForm) => {
    try {
      form.clearErrors();

      const payload = {
        title: values.title,
        firstName: values.firstName,
        lastName: values.lastName,
        companyName: values.company,
        phone: values.phone,
        email: values.email,
        preferredContact: values.preferredContact,
        leadSource: values.leadSource,
        note: values.note,
        addresses: values.addresses.map((a) => ({
          id: a.id,
          street1: a.street1,
          street2: a.street2,
          city: a.city,
          province: a.province,
          postalCode: a.postalCode,
          country: a.country,
        })),
      };

      mutation.mutate({ id: clientId, payload });
      form.reset();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!opened) return;

    // create mode
    if (!clientId) {
      form.setValues({
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
      });
      return;
    }

    // edit mode
    if (!client) return;

    form.setValues({
      title: client.title ?? "No title",
      firstName: client.firstName ?? "",
      lastName: client.lastName ?? "",
      company: client.companyName ?? "", // IMPORTANT: companyName -> company
      phone: client.phone ?? "",
      email: client.email ?? "",
      preferredContact: client.preferredContact ?? "email",
      leadSource: client.leadSource ?? "",
      note: client.notes?.[0]?.content ?? "",
      addresses: (client.addresses?.length ? client.addresses : []).map(
        (a: any) => ({
          id: a.id,
          street1: a.street1 ?? "",
          street2: a.street2 ?? "",
          city: a.city ?? "",
          province: a.province ?? "",
          postalCode: a.postalCode ?? "",
          country: a.country ?? "Canada",
          billingSameAsProperty: false, // since API has isBilling; set however you want
        }),
      ),
    });
  }, [opened, clientId, client]);

  return (
    <Modal
      size="xl"
      centered
      opened={opened}
      onClose={onClose}
      title={client ? "Edit client" : "Add client"}
      radius="lg"
    >
      <form onSubmit={form.onSubmit((values) => handleSubmit(values))}>
        <Stack gap="xl">
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
                      leftSection={<IoTextOutline />}
                      label="Title"
                      data={["No title", "Mr.", "Mrs.", "Ms.", "Dr."]}
                      {...form.getInputProps("title")}
                    />
                  </Grid.Col>

                  <Grid.Col span={4.5}>
                    <TextInput
                      leftSection={<IoTextOutline />}
                      label="First name"
                      placeholder="Enter first name"
                      withAsterisk
                      {...form.getInputProps("firstName")}
                    />
                  </Grid.Col>

                  <Grid.Col span={4.5}>
                    <TextInput
                      leftSection={<IoTextOutline />}
                      label="Last name"
                      placeholder="Enter last name"
                      withAsterisk
                      {...form.getInputProps("lastName")}
                    />
                  </Grid.Col>
                </Grid>
                <TextInput
                  label="Company name"
                  leftSection={<IoTextOutline />}
                  placeholder="Enter company name"
                  {...form.getInputProps("company")}
                />
                <Divider />
                <Title order={6}>Communication</Title>
                <TextInput
                  leftSection={<IoMegaphoneOutline />}
                  label="Phone number"
                  type="tel"
                  placeholder="Enter phone number"
                  {...form.getInputProps("phone")}
                />
                <TextInput
                  label="Email"
                  leftSection={<IoMailOpenOutline />}
                  placeholder="Enter email address"
                  withAsterisk
                  type="email"
                  {...form.getInputProps("email")}
                />
                <Radio.Group
                  label="Preferred communication method"
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
                  leftSection={<IoTextOutline />}
                  placeholder="How did this client hear about us?"
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
                  <Paper key={index} withBorder p="md" radius="md">
                    <Stack>
                      <Group justify="space-between">
                        <strong>Address {index + 1}</strong>

                        {form.values.addresses.length > 1 && (
                          <Button
                            size="xs"
                            variant="subtle"
                            color="red"
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
                        leftSection={<IoTextOutline />}
                        placeholder="Enter address"
                        {...form.getInputProps(`addresses.${index}.street1`)}
                      />

                      <TextInput
                        label="Street 2"
                        leftSection={<IoTextOutline />}
                        placeholder="Enter address"
                        {...form.getInputProps(`addresses.${index}.street2`)}
                      />

                      <Grid>
                        <Grid.Col span={6}>
                          <TextInput
                            label="City"
                            placeholder="Enter city"
                            leftSection={<IoTextOutline />}
                            {...form.getInputProps(`addresses.${index}.city`)}
                          />
                        </Grid.Col>

                        <Grid.Col span={6}>
                          <TextInput
                            label="Province"
                            placeholder="Enter province"
                            leftSection={<IoTextOutline />}
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
                            leftSection={<IoTextOutline />}
                            placeholder="Enter postal code"
                            {...form.getInputProps(
                              `addresses.${index}.postalCode`,
                            )}
                          />
                        </Grid.Col>

                        <Grid.Col span={6}>
                          <Select
                            label="Country"
                            leftSection={<IoGlobeOutline />}
                            data={["Canada", "United States"]}
                            {...form.getInputProps(
                              `addresses.${index}.country`,
                            )}
                          />
                        </Grid.Col>
                      </Grid>

                      <Checkbox
                        label="Billing address is the same as property address"
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
                leftSection={<IoAttachOutline />}
                placeholder="Type your note here..."
                minRows={4}
                autosize
                {...form.getInputProps("note")}
              />
            </Grid.Col>
          </Grid>

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{client ? "Update" : "Create"}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
