"use client";

import {
  Avatar,
  Badge,
  Card,
  Divider,
  Grid,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Center,
  Box,
  Button,
  Modal,
  TextInput
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import {
  IoCallOutline,
  IoHomeOutline,
  IoMailOutline,
  IoPersonOutline,
  IoShieldOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";


type StaffMeResponse = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  staffProfile?: {
    id: string;
    userId: string;
    staffId: string;
    position: string;
    hourlyRate: number;
    phoneNumber?: string;
    staffAddress?: {
      street1: string;
      street2: string | null;
      city: string;
      province: string;
      postalCode: string;
      country: string;
    } | null;
    emergencyContact?: {
      name: string;
      phoneNumber: string;
      relationship: string;
    } | null;
  } | null;
};

type InfoRowProps = {
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
};



function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <Group align="flex-start" wrap="nowrap">
      <ThemeIcon variant="light" color="orange" radius="xl" size="md">
        {icon}
      </ThemeIcon>

      <Stack gap={2}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
          {label}
        </Text>
        <Text size="sm" fw={500}>
          {value ?? "—"}
        </Text>
      </Stack>
    </Group>
  );
}

export default function StaffProfileDetailsCard() {



  const { data, isLoading, error } = useQuery<StaffMeResponse>({
    queryKey: ["staff-me"],
    queryFn: async () => {
      const res = await fetch("/api/staff/me");

      if (!res.ok) {
        throw new Error("Failed to load staff profile");
      }

      return (await res.json()) as StaffMeResponse;
    },
  });
  const queryClient = useQueryClient();

  const profile = data?.staffProfile;
  const address = profile?.staffAddress;
  const emergency = profile?.emergencyContact;

  const [addressOpen, setAddressOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  const [phoneOpen, setPhoneOpen] = useState(false);

  const [formPhone, setFormPhone] = useState("");

  const [formAddress, setFormAddress] = useState(() =>
    address
      ? {
        street1: address.street1 ?? "",
        street2: address.street2 ?? null,
        city: address.city ?? "",
        province: address.province ?? "",
        postalCode: address.postalCode ?? "",
        country: address.country ?? "",
      }
      : {
        street1: "",
        street2: null,
        city: "",
        province: "",
        postalCode: "",
        country: "",
      }
  );

  useEffect(() => {
    if (address) {
      setFormAddress({
        street1: address.street1 ?? "",
        street2: address.street2 ?? "",
        city: address.city ?? "",
        province: address.province ?? "",
        postalCode: address.postalCode ?? "",
        country: address.country ?? "",
      });
    }

    if (emergency) {
      setFormEmergency({
        name: emergency.name ?? "",
        phoneNumber: emergency.phoneNumber ?? "",
        relationship: emergency.relationship ?? "",
      });
    }

    if (profile?.phoneNumber) {
      setFormPhone(profile.phoneNumber);
    }
  }, [address, emergency]);

  const [formEmergency, setFormEmergency] = useState(() =>
    emergency
      ? {
        name: emergency.name ?? "",
        phoneNumber: emergency.phoneNumber ?? "",
        relationship: emergency.relationship ?? "",
      }
      : {
        name: "",
        phoneNumber: "",
        relationship: "",
      }
  );



  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (error || !data) {
    return (
      <Card radius="xl" padding="lg" withBorder shadow="sm">
        <Text c="red">Failed to load staff profile.</Text>
      </Card>
    );
  }



  const fullAddress = address
    ? [
      address.street1,
      address.street2,
      `${address.city}, ${address.province} ${address.postalCode}`,
      address.country,
    ]
      .filter(Boolean)
      .join(", ")
    : null;

  return (
    <Box p="md">
      <Stack gap="lg">
        <Center>
          <Stack align="center" gap="xs">
            <Avatar
              radius="xl"
              size={72}
              name={data.name}
              variant="filled"
              color="green"
            />

            <Title order={3} ta="center">
              {data.name}
            </Title>

            <Group gap="xs" justify="center">
              <Badge variant="filled" color="blue" radius="sm">
                {data.role}
              </Badge>

              {profile?.position && (
                <Badge variant="outline" radius="sm">
                  {profile.position}
                </Badge>
              )}

              {/* STAFF ID */}
              {profile?.id && (
                <Badge variant="light" color="gray">
                  ID: {profile.staffId}
                </Badge>
              )}
            </Group>
            <Group justify="space-between" align="center">
              <InfoRow
                icon={<IoCallOutline />}
                label="Contact Number"
                value={profile?.phoneNumber || "—"}
              />

              <Button size="xs" variant="light" onClick={() => setPhoneOpen(true)}>
                Edit
              </Button>
            </Group>


          </Stack>
        </Center>

        <Divider />

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" verticalSpacing="lg">
          <InfoRow icon={<IoMailOutline />} label="Email" value={data.email} />

          <InfoRow
            icon={<IoTimeOutline />}
            label="Joined"
            value={new Date(data.createdAt).toLocaleDateString()}
          />

          <InfoRow
            icon={<IoPersonOutline />}
            label="Position"
            value={profile?.position}
          />

          <InfoRow
            icon={<IoShieldOutline />}
            label="Hourly Rate"
            value={
              profile?.hourlyRate != null
                ? `$${profile.hourlyRate.toFixed(2)}/hr`
                : undefined
            }
          />
        </SimpleGrid>

        <Grid gutter="lg">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper withBorder radius="lg" p="md">
              <Stack gap="md">
                <Group gap="sm">
                  <ThemeIcon variant="light" radius="xl" size={34}>
                    <IoHomeOutline size={18} />
                  </ThemeIcon>
                  <Title order={5}>Address</Title>
                  <Button size="xs" variant="light" onClick={() => setAddressOpen(true)}>
                    Edit
                  </Button>
                </Group>

                {address ? (
                  <Stack gap={8}>
                    <Text size="sm" fw={500}>
                      {address.street1}
                    </Text>

                    {address.street2 && (
                      <Text size="sm">{address.street2}</Text>
                    )}

                    <Text size="sm">
                      {address.city}, {address.province}
                    </Text>

                    <Text size="sm">{address.postalCode}</Text>
                    <Text size="sm">{address.country}</Text>

                    <Divider my={4} />

                    <Text size="xs" c="dimmed">
                      {fullAddress}
                    </Text>
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">
                    No address available
                  </Text>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper withBorder radius="lg" p="md">
              <Stack gap="md">
                <Group gap="sm">
                  <ThemeIcon variant="light" radius="xl" size={34}>
                    <IoCallOutline size={18} />
                  </ThemeIcon>
                  <Title order={5}>Emergency Contact</Title>
                  <Button size="xs" variant="light" onClick={() => setEmergencyOpen(true)}>
                    Edit
                  </Button>
                </Group>

                {emergency ? (
                  <Stack gap="sm">
                    <InfoRow
                      icon={<IoPersonOutline size={18} />}
                      label="Name"
                      value={emergency.name}
                    />

                    <InfoRow
                      icon={<IoCallOutline size={18} />}
                      label="Phone"
                      value={emergency.phoneNumber}
                    />

                    <InfoRow
                      icon={<IoShieldOutline size={18} />}
                      label="Relationship"
                      value={emergency.relationship}
                    />
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">
                    No emergency contact available
                  </Text>
                )}
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>

      <Modal
        opened={addressOpen}
        onClose={() => setAddressOpen(false)}
        title="Edit Address"
      >
        <Stack>
          <TextInput
            label="Street 1"
            value={formAddress.street1}
            onChange={(e) =>
              setFormAddress((prev) => ({
                ...prev,
                street1: e.target.value,
              }))
            }
          />

          <TextInput
            label="Street 2"
            value={formAddress.street2 ?? ""}
            onChange={(e) =>
              setFormAddress((prev) => ({
                ...prev,
                street2: e.target.value,
              }))
            }
          />

          <TextInput
            label="City"
            value={formAddress.city}
            onChange={(e) =>
              setFormAddress((prev) => ({
                ...prev,
                city: e.target.value,
              }))
            }
          />

          <TextInput
            label="Province"
            value={formAddress.province}
            onChange={(e) =>
              setFormAddress((prev) => ({
                ...prev,
                province: e.target.value,
              }))
            }
          />

          <TextInput
            label="Postal Code"
            value={formAddress.postalCode}
            onChange={(e) =>
              setFormAddress((prev) => ({
                ...prev,
                postalCode: e.target.value,
              }))
            }
          />

          <TextInput
            label="Country"
            value={formAddress.country}
            onChange={(e) =>
              setFormAddress((prev) => ({
                ...prev,
                country: e.target.value,
              }))
            }
          />

          <Button
            mt="md"
            onClick={async () => {
              await fetch("/api/staff/address", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...formAddress,
                  street2: formAddress.street2 || null,
                  postalCode: formAddress.postalCode || null,
                }),
              });

              queryClient.invalidateQueries({ queryKey: ["staff-me"] });

              setAddressOpen(false);
            }}
          >
            Save
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        title="Edit Emergency Contact"
      >
        <Stack>
          <TextInput
            label="Name"
            value={formEmergency.name}
            onChange={(e) =>
              setFormEmergency((prev) => ({ ...prev, name: e.target.value }))
            }
          />

          <TextInput
            label="Phone"
            value={formEmergency?.phoneNumber || ""}
            onChange={(e) =>
              setFormEmergency({
                ...formEmergency,
                phoneNumber: e.target.value,
              })
            }
          />

          <TextInput
            label="Relationship"
            value={formEmergency?.relationship || ""}
            onChange={(e) =>
              setFormEmergency({
                ...formEmergency,
                relationship: e.target.value,
              })
            }
          />

          <Button
            onClick={async () => {
              await fetch("/api/staff/emergency", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formEmergency),
              });
              setEmergencyOpen(false);
            }}
          >
            Save
          </Button>
        </Stack>
      </Modal>
      <Modal
        opened={phoneOpen}
        onClose={() => setPhoneOpen(false)}
        title="Edit Contact Number"
      >
        <Stack>
          <TextInput
            label="Phone Number"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
          />

          <Button
            onClick={async () => {
              await fetch("/api/staff/phone", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phoneNumber: formPhone }),
              });

              queryClient.invalidateQueries({ queryKey: ["staff-me"] });

              setPhoneOpen(false);
            }}
          >
            Save
          </Button>
        </Stack>
      </Modal>


    </Box>
  );
}
