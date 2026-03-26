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

type StaffMeResponse = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  staffProfile?: {
    id: string;
    userId: string;
    position: string;
    hourlyRate: number;
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

  const profile = data.staffProfile;
  const address = profile?.staffAddress;
  const emergency = profile?.emergencyContact;

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
        <Group justify="space-between" align="flex-start">
          <Group align="center" wrap="nowrap">
            <Avatar
              radius="xl"
              size={64}
              name={data.name}
              variant="filled"
              color="green"
            />

            <Stack gap={4}>
              <Title order={3}>{data.name}</Title>

              <Group gap="xs">
                <Badge variant="filled" color="blue" radius="lg">
                  {data.role}
                </Badge>

                {profile?.position && (
                  <Badge variant="outline" radius="lg">
                    {profile.position}
                  </Badge>
                )}
              </Group>
            </Stack>
          </Group>
        </Group>

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
    </Box>
  );
}
