"use client";

import {
  ActionIcon,
  Avatar,
  Box,
  Button,
  Card,
  Center,
  Container,
  Grid,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IoCheckmarkOutline,
  IoCloseOutline,
  IoPencilOutline,
  IoSettingsOutline,
} from "react-icons/io5";

type EmergencyContact = {
  name: string;
  phoneNumber: string;
  relationship: string;
};

type StaffState = {
  id: string;
  name: string;
  staffIdDisplay: string;
  phone: string;
  address: string;
  postalCode: string;
  emergencyContact: EmergencyContact;
};

export default function StaffProfilePage() {
  const [staff, setStaff] = useState<StaffState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const response = await fetch("/api/staff/me");
      const result = await response.json();

      if (!response.ok || !result?.id) {
        console.error("Invalid profile response:", result);
        return;
      }

      setStaff({
        id: result.id,
        name: result.name ?? "",
        staffIdDisplay:
          result.staffProfile?.staffId ?? result.id.slice(0, 8).toUpperCase(),

        phone: result.phone ?? "",

        address: result.staffProfile?.staffAddress?.street1 ?? "",
        postalCode: result.staffProfile?.staffAddress?.postalCode ?? "",

        emergencyContact: {
          name: result.staffProfile?.emergencyContact?.name ?? "",
          phoneNumber: result.staffProfile?.emergencyContact?.phoneNumber ?? "",
          relationship:
            result.staffProfile?.emergencyContact?.relationship ?? "",
        },
      });
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!staff) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: staff.phone,
          address: staff.address,
          postalCode: staff.postalCode,
          emergencyContact: staff.emergencyContact,
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        alert("Profile updated successfully!");
      } else {
        alert("Failed to update profile.");
      }
    } catch (error) {
      alert("Error saving profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !staff) {
    return (
      <Container
        size="lg"
        py="xl"
        style={{ display: "flex", justifyContent: "center" }}
      >
        <Loader />
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Staff Profile</Title>
        <Group>
          {!isEditing ? (
            <Button
              leftSection={<IoPencilOutline />}
              variant="light"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </Button>
          ) : (
            <Group gap="xs">
              <Button
                color="green"
                leftSection={<IoCheckmarkOutline />}
                loading={saving}
                onClick={handleSave}
              >
                Save
              </Button>
              <Button
                variant="subtle"
                color="gray"
                leftSection={<IoCloseOutline />}
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </Group>
          )}
          <ActionIcon variant="subtle" size="lg">
            <IoSettingsOutline size={22} />
          </ActionIcon>
        </Group>
      </Group>

      <Card withBorder radius="md" p="xl">
        <Grid gutter="xl" align="center">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <LabeledField label="Name" value={staff.name} readOnly />
              <LabeledField label="ID" value={staff.staffIdDisplay} readOnly />
              <LabeledField
                label="Phone Number"
                value={staff.phone}
                readOnly={!isEditing}
                onChange={(v) => setStaff({ ...staff, phone: v })}
              />
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Center>
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
                <Avatar size={200} radius={200} color="blue" variant="light">
                  <Text fw={700} c="blue">
                    Photo
                  </Text>
                </Avatar>
              </Box>
            </Center>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <LabeledField
                label="Address"
                value={staff.address}
                readOnly={!isEditing}
                onChange={(v) => setStaff({ ...staff, address: v })}
              />

              <LabeledField
                label="Postal Code"
                value={staff.postalCode}
                readOnly={!isEditing}
                onChange={(v) => setStaff({ ...staff, postalCode: v })}
              />

              <ClickableLabeledField
                label="Emergency Contact"
                value={staff.emergencyContact.name}
                onClick={() => setEmergencyModalOpen(true)}
              />
            </Stack>
          </Grid.Col>
        </Grid>
      </Card>

      <Grid mt="xl" gutter="lg">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <BigActionButton onClick={() => router.push("/staff/enter-time")}>
            Enter Time
          </BigActionButton>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <BigActionButton onClick={() => router.push("/staff/pay-history")}>
            Pay Stubs
          </BigActionButton>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <BigActionButton
            onClick={() => router.push("/staff/enter-availability")}
          >
            Availability
          </BigActionButton>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <BigActionButton onClick={() => router.push("/staff/apply-leave")}>
            Apply Leave
          </BigActionButton>
        </Grid.Col>
      </Grid>

      <Modal
        opened={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        title="Emergency Contact"
        centered
      >
        <Stack>
          <TextInput
            label="Name"
            value={staff.emergencyContact.name}
            readOnly={!isEditing}
            onChange={(e) =>
              setStaff({
                ...staff,
                emergencyContact: {
                  ...staff.emergencyContact,
                  name: e.currentTarget.value,
                },
              })
            }
          />

          <TextInput
            label="Phone Number"
            value={staff.emergencyContact.phoneNumber}
            readOnly={!isEditing}
            onChange={(e) =>
              setStaff({
                ...staff,
                emergencyContact: {
                  ...staff.emergencyContact,
                  phoneNumber: e.currentTarget.value,
                },
              })
            }
          />

          <TextInput
            label="Relationship"
            value={staff.emergencyContact.relationship}
            readOnly={!isEditing}
            onChange={(e) =>
              setStaff({
                ...staff,
                emergencyContact: {
                  ...staff.emergencyContact,
                  relationship: e.currentTarget.value,
                },
              })
            }
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => setEmergencyModalOpen(false)}
            >
              Close
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

function LabeledField({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <Group gap="sm" align="stretch" wrap="nowrap">
      <Box w={140}>
        <Card
          radius="lg"
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
      <TextInput
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.currentTarget.value)}
        variant={readOnly ? "default" : "filled"}
        styles={{ input: { height: 44 } }}
        w="100%"
      />
    </Group>
  );
}

function ClickableLabeledField({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <Group gap="sm" align="stretch" wrap="nowrap">
      <Box w={140}>
        <Card
          radius="lg"
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
      <Button
        variant="default"
        onClick={onClick}
        styles={{
          root: {
            height: 44,
            justifyContent: "flex-start",
            width: "100%",
            fontWeight: 400,
          },
        }}
      >
        {value || "Add emergency contact"}
      </Button>
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
      styles={{ root: { height: 56, fontWeight: 700 } }}
    >
      {children}
    </Button>
  );
}
