"use client";

import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";

export default function StaffProfilePage() {
  // Replace with real data later (session / API)
  const staff = {
    name: "Upul Atapattu",
    staffId: "STF-0001",
    phone: "+1 (604) 555-0199",
    address: "12667 110A Avenue, Surrey, BC",
    postalCode: "V3V 0A1",
    emergencyContact: "Ayesha — +1 (604) 555-0123",
  };

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Staff Profile</Title>

        <ActionIcon
          variant="subtle"
          size="lg"
          aria-label="Settings"
          onClick={() => console.log("Open settings")}
        >
          <IconSettings size={22} />
        </ActionIcon>
      </Group>

      <Card withBorder radius="md" p="xl">
        <Grid gutter="xl" align="center">
          {/* Left column: Name / ID / Phone */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <LabeledField label="Name" value={staff.name} />
              <LabeledField label="ID" value={staff.staffId} />
              <LabeledField label="Phone Number" value={staff.phone} />
            </Stack>
          </Grid.Col>

          {/* Center column: Photo */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Group justify="center">
              <Box
                w={220}
                h={220}
                style={{
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  border: "2px solid var(--mantine-color-blue-filled)",
                }}
              >
                <Avatar
                  size={200}
                  radius={200}
                  color="blue"
                  variant="light"
                  // You can set src later: src="/some-photo.jpg"
                >
                  <Text fw={700} c="blue">
                    Photo
                  </Text>
                </Avatar>
              </Box>
            </Group>
          </Grid.Col>

          {/* Right column: Address / Postal / Emergency */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <LabeledField label="Address" value={staff.address} />
              <LabeledField label="Postal Code" value={staff.postalCode} />
              <LabeledField label="Emergency Contact" value={staff.emergencyContact} />
            </Stack>
          </Grid.Col>
        </Grid>

        {/* Bottom buttons */}
        <Grid mt="xl" gutter="lg">
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <BigActionButton onClick={() => console.log("Enter time")}>
              Enter Time
            </BigActionButton>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <BigActionButton onClick={() => console.log("Pay stubs")}>
              Pay Stubs
            </BigActionButton>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <BigActionButton onClick={() => console.log("Availability")}>
              Availability
            </BigActionButton>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <BigActionButton onClick={() => console.log("Apply leave")}>
              Apply Leave
            </BigActionButton>
          </Grid.Col>
        </Grid>
      </Card>
    </Container>
  );
}

function LabeledField({ label, value }: { label: string; value: string }) {
  return (
    <Group gap="sm" align="stretch" wrap="nowrap">
      <Box w={140}>
        <Card
          radius="sm"
          p="sm"
          withBorder
          style={{
            background: "var(--mantine-color-blue-filled)",
            color: "var(--mantine-color-white)",
            textAlign: "center",
          }}
        >
          <Text fw={700} size="sm">
            {label}
          </Text>
        </Card>
      </Box>

      {/* Display-only field; swap to TextInput for editing later */}
      <TextInput value={value} readOnly styles={{ input: { height: 44 } }} w="100%" />
    </Group>
  );
}

function BigActionButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button
      fullWidth
      size="lg"
      radius="md"
      onClick={onClick}
      styles={{
        root: {
          height: 56,
          fontWeight: 700,
        },
      }}
    >
      {children}
    </Button>
  );
}
