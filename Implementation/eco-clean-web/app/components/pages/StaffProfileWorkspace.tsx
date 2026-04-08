"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IoCheckmarkOutline,
  IoCloseOutline,
  IoPencilOutline,
} from "react-icons/io5";

type EmergencyContact = {
  name: string;
  phoneNumber: string;
  relationship: string;
};

type StaffState = {
  id: string;
  name: string;
  email: string;
  staffIdDisplay: string;
  roleLabel: string;
  phone: string;
  address: string;
  postalCode: string;
  emergencyContact: EmergencyContact;
};

function DetailField({
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
    <Stack gap={6}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <TextInput
        value={value}
        readOnly={readOnly}
        variant={readOnly ? "default" : "filled"}
        onChange={(event) => onChange?.(event.currentTarget.value)}
      />
    </Stack>
  );
}

function ActionTile({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Card
      withBorder
      radius="lg"
      p="md"
      className="staff-app-surface quick-action-card"
      onClick={onClick}
    >
      <Stack gap={6}>
        <Text fw={700}>{title}</Text>
        <Text size="sm" c="dimmed">
          {description}
        </Text>
      </Stack>
    </Card>
  );
}

export default function StaffProfileWorkspace() {
  const [staff, setStaff] = useState<StaffState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
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
          email: result.email ?? "",
          roleLabel: result.staffProfile?.position ?? "Staff member",
          staffIdDisplay:
            result.staffProfile?.staffId ?? result.id.slice(0, 8).toUpperCase(),
          phone: result.phone ?? result.staffProfile?.phoneNumber ?? "",
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

    fetchProfile();
  }, []);

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

      if (!res.ok) {
        throw new Error("Failed to update profile.");
      }

      setIsEditing(false);
      notifications.show({
        title: "Profile updated",
        message: "Your contact details were saved successfully.",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Update failed",
        message:
          error instanceof Error ? error.message : "Please try again.",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !staff) {
    return (
      <CenterPage />
    );
  }

  return (
    <Container p={0} className="staff-app-page">
      <Stack className="staff-page-stack">
        <Card
          withBorder
          radius="lg"
          p="lg"
          className="staff-app-surface staff-app-surface--hero"
        >
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start" gap="md">
              <Box>
                <Text
                  size="xs"
                  fw={700}
                  c="#64748b"
                  tt="uppercase"
                  style={{ letterSpacing: "0.08em" }}
                >
                  Personal workspace
                </Text>
                <Title order={2} mt={6}>
                  Profile
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Keep your contact details up to date so the team can reach you when needed.
                </Text>
              </Box>

              <Stack gap="xs" align="flex-end">
                <Badge variant="light" color="lime">
                  {staff.roleLabel}
                </Badge>
                <Badge variant="light" color="gray">
                  Staff ID {staff.staffIdDisplay}
                </Badge>
              </Stack>
            </Group>

            <SimpleGrid cols={{ base: 2, sm: 2, lg: 4 }} className="staff-summary-grid">
              <Card withBorder radius="lg" p="md" className="staff-app-surface">
                <Text size="sm" c="dimmed">
                  Full name
                </Text>
                <Text fw={700} mt={6}>
                  {staff.name}
                </Text>
              </Card>
              <Card withBorder radius="lg" p="md" className="staff-app-surface">
                <Text size="sm" c="dimmed">
                  Email
                </Text>
                <Text fw={700} mt={6}>
                  {staff.email}
                </Text>
              </Card>
              <Card withBorder radius="lg" p="md" className="staff-app-surface">
                <Text size="sm" c="dimmed">
                  Phone
                </Text>
                <Text fw={700} mt={6}>
                  {staff.phone || "Not added"}
                </Text>
              </Card>
              <Card withBorder radius="lg" p="md" className="staff-app-surface">
                <Text size="sm" c="dimmed">
                  Emergency contact
                </Text>
                <Text fw={700} mt={6}>
                  {staff.emergencyContact.name || "Not added"}
                </Text>
              </Card>
            </SimpleGrid>
          </Stack>
        </Card>

        <Group justify="space-between" gap="sm" wrap="wrap">
          {!isEditing ? (
            <Button
              leftSection={<IoPencilOutline />}
              variant="light"
              color="lime"
              onClick={() => setIsEditing(true)}
            >
              Edit Details
            </Button>
          ) : (
            <Group gap="xs" wrap="wrap">
              <Button
                color="lime"
                leftSection={<IoCheckmarkOutline />}
                loading={saving}
                onClick={handleSave}
              >
                Save Changes
              </Button>
              <Button
                variant="default"
                leftSection={<IoCloseOutline />}
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </Group>
          )}
        </Group>

        <SimpleGrid cols={{ base: 1, lg: 2 }} className="staff-form-grid">
          <Card withBorder radius="lg" p="lg" className="staff-app-surface">
            <Stack gap="md">
              <Box>
                <Text fw={700}>Personal details</Text>
                <Text size="sm" c="dimmed" mt={4}>
                  Your basic contact details in one place.
                </Text>
              </Box>

              <DetailField label="Full name" value={staff.name} readOnly />
              <DetailField label="Email" value={staff.email} readOnly />
              <DetailField
                label="Phone number"
                value={staff.phone}
                readOnly={!isEditing}
                onChange={(value) => setStaff({ ...staff, phone: value })}
              />
            </Stack>
          </Card>

          <Card withBorder radius="lg" p="lg" className="staff-app-surface">
            <Stack gap="md">
              <Box>
                <Text fw={700}>Address and support</Text>
                <Text size="sm" c="dimmed" mt={4}>
                  Home address and emergency contact details.
                </Text>
              </Box>

              <DetailField
                label="Street address"
                value={staff.address}
                readOnly={!isEditing}
                onChange={(value) => setStaff({ ...staff, address: value })}
              />
              <DetailField
                label="Postal code"
                value={staff.postalCode}
                readOnly={!isEditing}
                onChange={(value) => setStaff({ ...staff, postalCode: value })}
              />

              <Card
                withBorder
                radius="lg"
                p="md"
                className="staff-app-surface"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98))",
                }}
              >
                <Stack gap={6}>
                  <Text fw={700}>Emergency contact</Text>
                  <Text size="sm" c="dimmed">
                    {staff.emergencyContact.name
                      ? `${staff.emergencyContact.name} • ${staff.emergencyContact.phoneNumber || "No phone"}`
                      : "No emergency contact added yet."}
                  </Text>
                  <Group>
                    <Button
                      variant="default"
                      onClick={() => setEmergencyModalOpen(true)}
                    >
                      {staff.emergencyContact.name ? "Review Contact" : "Add Contact"}
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </Stack>
          </Card>
        </SimpleGrid>

        <Card withBorder radius="lg" p="lg" className="staff-app-surface">
          <Stack gap="md">
            <Box>
              <Text fw={700}>Quick links</Text>
              <Text size="sm" c="dimmed" mt={4}>
                Go straight to the pages you use most often.
              </Text>
            </Box>

            <SimpleGrid cols={{ base: 1, sm: 2 }} className="staff-form-grid">
              <ActionTile
                title="Enter Time"
                description="Review your current pay period and submit timesheets."
                onClick={() => router.push("/staff/enter-time")}
              />
              <ActionTile
                title="Pay History"
                description="Look back at older pay slips."
                onClick={() => router.push("/staff/pay-history")}
              />
              <ActionTile
                title="Availability"
                description="Choose the days and times you can work."
                onClick={() => router.push("/staff/enter-availability")}
              />
              <ActionTile
                title="Apply Leave"
                description="Ask for time off."
                onClick={() => router.push("/staff/apply-leave")}
              />
            </SimpleGrid>
          </Stack>
        </Card>
      </Stack>

      <Modal
        opened={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        title="Emergency Contact"
        centered
        classNames={{
          content: "app-modal__content",
          header: "app-modal__header",
          title: "app-modal__title",
          body: "app-modal__body",
        }}
      >
        <Stack gap="md">
          <DetailField
            label="Name"
            value={staff.emergencyContact.name}
            readOnly={!isEditing}
            onChange={(value) =>
              setStaff({
                ...staff,
                emergencyContact: { ...staff.emergencyContact, name: value },
              })
            }
          />
          <DetailField
            label="Phone number"
            value={staff.emergencyContact.phoneNumber}
            readOnly={!isEditing}
            onChange={(value) =>
              setStaff({
                ...staff,
                emergencyContact: {
                  ...staff.emergencyContact,
                  phoneNumber: value,
                },
              })
            }
          />
          <DetailField
            label="Relationship"
            value={staff.emergencyContact.relationship}
            readOnly={!isEditing}
            onChange={(value) =>
              setStaff({
                ...staff,
                emergencyContact: {
                  ...staff.emergencyContact,
                  relationship: value,
                },
              })
            }
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEmergencyModalOpen(false)}>
              Close
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

function CenterPage() {
  return (
    <Container p={0} className="staff-app-page">
      <Stack className="staff-page-stack" align="center" justify="center" style={{ minHeight: "50vh" }}>
        <Loader size="lg" color="lime" />
      </Stack>
    </Container>
  );
}
