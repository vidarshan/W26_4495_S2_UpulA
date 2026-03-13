'use client';

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
} from '@mantine/core';
import { useRouter } from 'next/navigation';
import { IoSettingsOutline } from 'react-icons/io5';
import { useEffect, useState } from 'react';

export default function StaffProfilePage() {
  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchProfile() {
      try {
        // In a real app, you'd get the ID from the session.
        // For testing, use the ID you used in Postman.
        const response = await fetch(
          '/api/staff/3b32d468-9f20-4808-9f25-bffabed6a9cb',
        );
        const result = await response.json();

        // Map the database fields to your UI
        setStaff({
          name: result.name,
          staffId: result.id.slice(0, 8).toUpperCase(), // Shortened UUID for display
          phone: result.phone || 'Not Provided',
          address: result.staffProfile?.postalCode || 'No Postal Code',
          postalCode: result.staffProfile?.postalCode || '',
          emergencyContact: 'Not Set',
        });
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  // 1. ADD THIS GUARD HERE
  if (loading) {
    return (
      <Container size="lg" py="xl" style={{ display: 'flex', justifyContent: 'center' }}>
        <Text>Loading profile...</Text>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Staff Profile</Title>

        <ActionIcon
          variant="subtle"
          size="lg"
          aria-label="Settings"
          onClick={() => console.log('Open settings')}
        >
          <IoSettingsOutline size={22} />
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
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  border: '2px solid var(--mantine-color-blue-filled)',
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
              <LabeledField
                label="Emergency Contact"
                value={staff.emergencyContact}
              />
            </Stack>
          </Grid.Col>
        </Grid>
      </Card>

      {/* Bottom buttons */}
      <Grid mt="xl" gutter="lg">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <BigActionButton onClick={() => router.push('/enter-time')}>
            Enter Time
          </BigActionButton>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <BigActionButton onClick={() => router.push('/your-pay')}>
            Pay Stubs
          </BigActionButton>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <BigActionButton onClick={() => router.push('/enter-availability')}>
            Availability
          </BigActionButton>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6 }}>
          <BigActionButton onClick={() => router.push('/apply-leave')}>
            Apply Leave
          </BigActionButton>
        </Grid.Col>
      </Grid>
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
            background: 'var(--mantine-color-blue-filled)',
            color: 'var(--mantine-color-white)',
            textAlign: 'center',
          }}
        >
          <Text fw={700} size="sm">
            {label}
          </Text>
        </Card>
      </Box>

      {/* Display-only field; swap to TextInput for editing later */}
      <TextInput
        value={value}
        readOnly
        styles={{ input: { height: 44 } }}
        w="100%"
      />
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
