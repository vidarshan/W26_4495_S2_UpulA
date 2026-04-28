"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IoCall, IoDocumentText, IoMail, IoPerson } from "@/lib/icons";
import Loader from "../UI/Loader";

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
        disabled={readOnly}
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

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card withBorder radius="lg" p="lg" className="staff-app-surface">
      <Stack gap="md">
        <Box>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">
            {eyebrow}
          </Text>
          <Text fw={700} mt={4}>
            {title}
          </Text>
          <Text size="sm" c="dimmed" mt={4}>
            {description}
          </Text>
        </Box>
        {children}
      </Stack>
    </Card>
  );
}

function SummaryStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Paper withBorder radius="lg" p="md" className="staff-app-surface">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Box>
          <Text size="sm" c="dimmed">
            {label}
          </Text>
          <Text fw={700} mt={6}>
            {value}
          </Text>
        </Box>
        <ThemeIcon variant="light" color="lime" radius="lg" size="lg">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

export default function StaffProfileWorkspace() {
  const [staff, setStaff] = useState<StaffState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
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
            phoneNumber:
              result.staffProfile?.emergencyContact?.phoneNumber ?? "",
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
        message: error instanceof Error ? error.message : "Please try again.",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !staff) {
    return <CenterPage />;
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
            <Grid gutter="lg" align="stretch">
              <Grid.Col span={{ base: 12, lg: 8 }}>
                <Stack gap="md" h="100%">
                  <Group
                    justify="space-between"
                    align="flex-start"
                    gap="md"
                    wrap="wrap"
                  >
                    <Box>
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                        Personal workspace
                      </Text>
                      <Title order={2} mt={6}>
                        {staff.name}
                      </Title>
                      <Text size="sm" c="dimmed" mt={4}>
                        Keep your contact details up to date so the team can
                        reach you when needed.
                      </Text>
                    </Box>

                    <Group gap="xs">
                      <Badge variant="light" color="lime">
                        {staff.roleLabel}
                      </Badge>
                      <Badge variant="light" color="gray">
                        Staff ID {staff.staffIdDisplay}
                      </Badge>
                    </Group>
                  </Group>

                  <Text size="sm" c="dimmed">
                    Keep this workspace current so scheduling, payroll, and
                    emergency contact records stay accurate.
                  </Text>
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, lg: 4 }}>
                <Paper
                  withBorder
                  radius="lg"
                  p="md"
                  className="staff-app-surface"
                >
                  <Stack gap="sm" h="100%" justify="space-between">
                    <Box>
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                        Workspace actions
                      </Text>
                      <Text fw={700} mt={4}>
                        {isEditing
                          ? "Editing profile"
                          : "Profile is up to date"}
                      </Text>
                      <Text size="sm" c="dimmed" mt={4}>
                        Review your details, update contact information, and
                        manage your emergency contact.
                      </Text>
                    </Box>

                    {!isEditing ? (
                      <Button
                        variant="light"
                        color="lime"
                        fullWidth
                        onClick={() => setIsEditing(true)}
                      >
                        Edit Details
                      </Button>
                    ) : (
                      <Stack gap="xs">
                        <Button
                          color="lime"
                          fullWidth
                          loading={saving}
                          onClick={handleSave}
                        >
                          Save Changes
                        </Button>
                        <Button
                          variant="default"
                          fullWidth
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>

            <SimpleGrid
              cols={{ base: 1, sm: 2, lg: 4 }}
              className="staff-summary-grid"
            >
              <SummaryStat
                label="Full name"
                value={staff.name}
                icon={<IoPerson size={18} />}
              />
              <SummaryStat
                label="Email"
                value={staff.email}
                icon={<IoMail size={18} />}
              />
              <SummaryStat
                label="Phone"
                value={staff.phone || "Not added"}
                icon={<IoCall size={18} />}
              />
              <SummaryStat
                label="Emergency contact"
                value={staff.emergencyContact.name || "Not added"}
                icon={<IoDocumentText size={18} />}
              />
            </SimpleGrid>
          </Stack>
        </Card>

        <Grid gutter="lg">
          <Grid.Col span={{ base: 12, xl: 8 }}>
            <Stack gap="lg">
              <SectionCard
                eyebrow="Contact record"
                title="Personal details"
                description="Your identity and direct contact details in one place."
              >
                <Stack gap="md">
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <DetailField
                      label="Full name"
                      value={staff.name}
                      readOnly
                    />
                    <DetailField label="Email" value={staff.email} readOnly />
                    <DetailField
                      label="Phone number"
                      value={staff.phone}
                      readOnly={!isEditing}
                      onChange={(value) => setStaff({ ...staff, phone: value })}
                    />
                    <DetailField
                      label="Postal code"
                      value={staff.postalCode}
                      readOnly={!isEditing}
                      onChange={(value) =>
                        setStaff({ ...staff, postalCode: value })
                      }
                    />
                  </SimpleGrid>

                  <Divider />

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <Paper
                      withBorder
                      radius="lg"
                      p="md"
                      className="staff-app-surface"
                    >
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                        Staff role
                      </Text>
                      <Text fw={700} mt={6}>
                        {staff.roleLabel}
                      </Text>
                    </Paper>
                    <Paper
                      withBorder
                      radius="lg"
                      p="md"
                      className="staff-app-surface"
                    >
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                        Staff identifier
                      </Text>
                      <Text fw={700} mt={6}>
                        {staff.staffIdDisplay}
                      </Text>
                    </Paper>
                  </SimpleGrid>
                </Stack>
              </SectionCard>

              <SectionCard
                eyebrow="Address book"
                title="Home address"
                description="Use this section to keep your stored address current."
              >
                <Stack gap="md">
                  <DetailField
                    label="Street address"
                    value={staff.address}
                    readOnly={!isEditing}
                    onChange={(value) => setStaff({ ...staff, address: value })}
                  />
                </Stack>
              </SectionCard>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, xl: 4 }}>
            <Stack gap="lg">
              <SectionCard
                eyebrow="Support contact"
                title="Emergency contact"
                description="Review the person we should contact if something urgent comes up."
              >
                <Stack gap="md">
                  <Stack gap={6}>
                    <Text fw={700}>
                      {staff.emergencyContact.name || "No contact added"}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {staff.emergencyContact.phoneNumber || "No phone number"}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {staff.emergencyContact.relationship || "No relationship"}
                    </Text>
                  </Stack>
                </Stack>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <DetailField
                    label="Name"
                    value={staff.emergencyContact.name}
                    readOnly={!isEditing}
                    onChange={(value) =>
                      setStaff({
                        ...staff,
                        emergencyContact: {
                          ...staff.emergencyContact,
                          name: value,
                        },
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
                </SimpleGrid>
              </SectionCard>

              <SectionCard
                eyebrow="Navigation"
                title="Quick links"
                description="Go straight to the pages you use most often."
              >
                <Stack gap="md">
                  <SimpleGrid
                    cols={{ base: 1, sm: 2, xl: 1 }}
                    className="staff-form-grid"
                  >
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
              </SectionCard>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}

function CenterPage() {
  return (
    <Container p={0} className="staff-app-page">
      <Stack
        className="staff-page-stack"
        align="center"
        justify="center"
        mih="50vh"
      >
        <Loader />
      </Stack>
    </Container>
  );
}
