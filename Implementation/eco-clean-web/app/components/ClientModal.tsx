"use client";
import React, { useState } from "react";
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
  Accordion,
  Paper,
  Divider,
  Textarea,
  RadioGroup,
  Radio,
} from "@mantine/core";

type Props = {
  opened: boolean;
  onClose: () => void;
};

type Address = {
  street1: string;
  street2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};

export default function ClientPropertyModal({ opened, onClose }: Props) {
  const emptyAddress: Address = {
    street1: "",
    street2: "",
    city: "",
    province: "",
    postalCode: "",
    country: "",
  };

  const [addresses, setAddresses] = useState<Address[]>([emptyAddress]);

  const addAddress = () => {
    setAddresses((prev) => [...prev, emptyAddress]);
  };

  const updateAddress = (
    index: number,
    field: keyof Address,
    value: string,
  ) => {
    setAddresses((prev) =>
      prev.map((addr, i) => (i === index ? { ...addr, [field]: value } : addr)),
    );
  };

  const removeAddress = (index: number) => {
    setAddresses((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Add client"
      size="xl"
      radius="lg"
    >
      <Stack gap="xl">
        <Grid>
          <Grid.Col span={4}>
            <Title order={5}>Primary contact details</Title>
            <Text size="sm" c="dimmed">
              Provide the main point of contact to ensure smooth communication
              and reliable client records.
            </Text>
          </Grid.Col>

          <Grid.Col span={8}>
            <Stack gap="md">
              {/* Name row */}
              <Grid>
                <Grid.Col span={3}>
                  <Select
                    label="Title"
                    placeholder="No title"
                    data={["No title", "Mr.", "Mrs.", "Ms.", "Dr."]}
                  />
                </Grid.Col>

                <Grid.Col span={4.5}>
                  <TextInput label="First name" />
                </Grid.Col>

                <Grid.Col span={4.5}>
                  <TextInput label="Last name" />
                </Grid.Col>
              </Grid>

              {/* Company */}
              <TextInput label="Company name" />

              {/* Communication */}
              <Title order={6}>Communication</Title>

              <TextInput label="Phone number" />
              <TextInput label="Email" />

              <RadioGroup label="Preferred communication method">
                <Group>
                  <Radio value="call" label="Call" />
                  <Radio value="sms" label="SMS" />
                  <Radio value="email" label="Email" />
                </Group>
              </RadioGroup>

              <Title order={6}>Lead information</Title>
              <TextInput label="Lead source" />
            </Stack>
          </Grid.Col>
        </Grid>
        <Divider />
        <Grid>
          <Grid.Col span={4}>
            <Title order={5}>Property address</Title>
            <Text size="sm" c="dimmed">
              Enter the primary service address, billing address, or any
              additional locations where services may take place.
            </Text>

            <Button mt="sm" variant="light">
              Add another address
            </Button>
          </Grid.Col>
          <Grid.Col span={8}>
            <Stack gap="md">
              {addresses.map((address, index) => (
                <Paper key={index} withBorder p="md" radius="md">
                  <Stack>
                    <Group justify="space-between">
                      <strong>Address {index + 1}</strong>
                      {addresses.length > 1 && (
                        <Button
                          size="xs"
                          variant="subtle"
                          color="red"
                          onClick={() => removeAddress(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </Group>

                    <TextInput
                      label="Street 1"
                      value={address.street1}
                      onChange={(e) =>
                        updateAddress(index, "street1", e.target.value)
                      }
                    />

                    <TextInput
                      label="Street 2"
                      value={address.street2}
                      onChange={(e) =>
                        updateAddress(index, "street2", e.target.value)
                      }
                    />

                    <Grid>
                      <Grid.Col span={6}>
                        <TextInput
                          label="City"
                          value={address.city}
                          onChange={(e) =>
                            updateAddress(index, "city", e.target.value)
                          }
                        />
                      </Grid.Col>

                      <Grid.Col span={6}>
                        <TextInput
                          label="Province"
                          value={address.province}
                          onChange={(e) =>
                            updateAddress(index, "province", e.target.value)
                          }
                        />
                      </Grid.Col>
                    </Grid>

                    <Grid>
                      <Grid.Col span={6}>
                        <TextInput
                          label="Postal code"
                          value={address.postalCode}
                          onChange={(e) =>
                            updateAddress(index, "postalCode", e.target.value)
                          }
                        />
                      </Grid.Col>

                      <Grid.Col span={6}>
                        <Select
                          label="Country"
                          data={["Canada", "United States"]}
                          value={address.country}
                          onChange={(value) =>
                            updateAddress(index, "country", value || "")
                          }
                        />
                      </Grid.Col>
                    </Grid>

                    <Checkbox label="Billing address is the same as property address" />
                  </Stack>
                </Paper>
              ))}

              <Button variant="light" onClick={addAddress}>
                Add another address
              </Button>
            </Stack>
          </Grid.Col>
        </Grid>

        <Accordion variant="contained">
          <Accordion.Item value="note">
            <Accordion.Control>Add note</Accordion.Control>

            <Accordion.Panel>
              <Stack>
                <Text size="sm" c="dimmed">
                  Add internal notes about this property or client. Notes are
                  visible to your team only.
                </Text>

                <Textarea
                  placeholder="Type your note here..."
                  minRows={4}
                  autosize
                />

                <Group justify="flex-end">
                  <Button variant="default" size="sm">
                    Cancel
                  </Button>
                  <Button size="sm">Save note</Button>
                </Group>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button>Create</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
