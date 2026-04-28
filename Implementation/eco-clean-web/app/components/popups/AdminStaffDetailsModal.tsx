"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Grid,
  Group,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Checkbox,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IoCall,
  IoCash,
  IoHome,
  IoMail,
  IoPencil,
  IoPerson,
  IoShield,
  IoCard,
} from "@/lib/icons";
import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Loader from "../UI/Loader";

type Props = {
  opened: boolean;
  onClose: () => void;
  staff: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    staffProfile?: {
      staffId?: string | null;
      position?: string | null;
      hourlyRate?: number | null;
      phoneNumber?: string | null;
      staffAddress?: {
        street1?: string | null;
        street2?: string | null;
        city?: string | null;
        province?: string | null;
        postalCode?: string | null;
        country?: string | null;
      } | null;
      emergencyContact?: {
        name?: string | null;
        phoneNumber?: string | null;
        relationship?: string | null;
      } | null;
    } | null;
  } | null;
};

export default function AdminStaffDetailsModal({
  opened,
  onClose,
  staff,
}: Props) {
  const staffId = staff?.id ?? null;
  const [isSaving, setIsSaving] = useState(false);
  const [activeView, setActiveView] = useState<"overview" | "financial">(
    "overview",
  );

  const fetchStaffDetails = async (id: string) => {
    const res = await fetch(`/api/admin/staff/${id}`);
    if (!res.ok) throw new Error("Failed");
    return res.json();
  };

  const { data } = useQuery({
    queryKey: ["admin-staff", staffId],
    queryFn: () => {
      if (!staffId) throw new Error("Missing staff id");
      return fetchStaffDetails(staffId);
    },
    enabled: !!staffId && opened,
  });

  const queryClient = useQueryClient();
  const profile = data?.staffProfile ?? staff?.staffProfile;
  const address = profile?.staffAddress;
  const emergency = profile?.emergencyContact;

  const { data: financials, isLoading: financialsLoading } = useQuery({
    queryKey: ["admin-staff-financials", staffId],
    queryFn: async () => {
      if (!staffId) throw new Error("Missing staff id");

      const res = await fetch(`/api/admin/staff/${staffId}/financials`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load financial details");
      return res.json() as Promise<{
        bankDetails?: {
          bankName?: string | null;
          accountHolder?: string | null;
          institutionNo?: string | null;
          transitNo?: string | null;
          accountNo?: string | null;
        } | null;
        td1?: {
          sin?: string | null;
          federalClaimAmount?: number | null;
          additionalFederalTaxPerPay?: number | null;
          quebecClaimAmount?: number | null;
          isExempt?: boolean | null;
        } | null;
      }>;
    },
    enabled: !!staffId && opened,
  });

  const [position, setPosition] = useState("");
  const [rate, setRate] = useState(0);
  const [bank, setBank] = useState({
    bankName: "",
    accountHolder: "",
    institutionNo: "",
    transitNo: "",
    accountNo: "",
  });
  const [tax, setTax] = useState({
    sin: "",
    federalClaimAmount: 0,
    additionalFederalTaxPerPay: 0,
    quebecClaimAmount: 0,
    isExempt: false,
  });

  useEffect(() => {
    setPosition(profile?.position || "");
    setRate(profile?.hourlyRate || 0);
  }, [profile?.position, profile?.hourlyRate, opened]);

  useEffect(() => {
    setBank({
      bankName: financials?.bankDetails?.bankName || "",
      accountHolder: financials?.bankDetails?.accountHolder || "",
      institutionNo: financials?.bankDetails?.institutionNo || "",
      transitNo: financials?.bankDetails?.transitNo || "",
      accountNo: financials?.bankDetails?.accountNo || "",
    });
    setTax({
      sin: financials?.td1?.sin || "",
      federalClaimAmount: financials?.td1?.federalClaimAmount || 0,
      additionalFederalTaxPerPay:
        financials?.td1?.additionalFederalTaxPerPay || 0,
      quebecClaimAmount: financials?.td1?.quebecClaimAmount || 0,
      isExempt: financials?.td1?.isExempt || false,
    });
  }, [financials, opened]);

  const handleSave = async () => {
    try {
      if (!staffId) throw new Error("Missing staff id");

      setIsSaving(true);

      const response = await fetch(`/api/admin/staff/${staffId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          position,
          hourlyRate: rate,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to update staff details");
      }

      await queryClient.invalidateQueries({
        queryKey: ["admin-staff", staffId],
      });

      notifications.show({
        title: "Staff details updated",
        message: "Position and rate were saved successfully.",
        color: "green",
      });
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Save failed",
        message: err instanceof Error ? err.message : "Please try again.",
        color: "red",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFinancial = async () => {
    try {
      if (!staffId) throw new Error("Missing staff id");

      setIsSaving(true);

      const response = await fetch(`/api/admin/staff/${staffId}/financials`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank,
          tax,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to update financial details");
      }

      await queryClient.invalidateQueries({
        queryKey: ["admin-staff-financials", staffId],
      });

      notifications.show({
        title: "Financial details updated",
        message: "Bank and TD1 details were saved successfully.",
        color: "green",
      });
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Save failed",
        message: err instanceof Error ? err.message : "Please try again.",
        color: "red",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Staff Details"
      size="xl"
      centered
      yOffset="2vh"
      scrollAreaComponent={ScrollArea.Autosize}
      styles={{
        content: {
          maxHeight: "calc(100dvh - 4vh)",
        },
        body: {
          maxHeight: "calc(100dvh - 11rem)",
          overflowY: "auto",
        },
      }}
      classNames={{
        content: "app-modal__content",
        header: "app-modal__header",
        title: "app-modal__title",
        body: "app-modal__body",
      }}
    >
      <Stack gap="md">
        <Paper withBorder radius="md" p="lg" className="app-modal__hero">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Group align="flex-start" wrap="nowrap" gap="md">
              <ThemeIcon
                size={48}
                radius="md"
                color="lime"
                variant="light"
                className="app-modal__icon"
              >
                <IoPerson size={22} />
              </ThemeIcon>
              <Stack gap={4}>
                <Title order={4}>{staff?.name || "Staff member"}</Title>
                <Text size="sm" c="dimmed">
                  Review staffing, contact, and payroll-related details in one
                  place.
                </Text>
              </Stack>
            </Group>

            <Group gap="xs">
              <Badge radius="md">{staff?.role || "STAFF"}</Badge>
              {profile?.staffId ? (
                <Badge variant="light" radius="md" color="gray">
                  ID: {profile.staffId}
                </Badge>
              ) : null}
            </Group>
          </Group>
        </Paper>

        <SegmentedControl
          fullWidth
          color="lime"
          radius="md"
          value={activeView}
          onChange={(value) => setActiveView(value as "overview" | "financial")}
          data={[
            { label: "Overview", value: "overview" },
            { label: "Financial", value: "financial" },
          ]}
        />

        {activeView === "overview" ? (
          <>
            <Paper withBorder radius="md" p="lg" className="app-modal__section">
              <Stack gap="md">
                <Group gap="sm">
                  <ThemeIcon
                    radius="md"
                    size="lg"
                    variant="light"
                    color="blue"
                    className="app-modal__icon"
                  >
                    <IoShield size={18} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text fw={700}>Role and pay</Text>
                    <Text size="sm" c="dimmed">
                      This section controls role-adjacent profile values used in
                      staffing and payroll.
                    </Text>
                  </Stack>
                </Group>

                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Position"
                      value={position}
                      onChange={(e) => setPosition(e.currentTarget.value)}
                      rightSection={
                        <ActionIcon variant="subtle" color="gray">
                          <IoPencil size={14} />
                        </ActionIcon>
                      }
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <NumberInput
                      label="Hourly Rate"
                      value={rate}
                      onChange={(val) => setRate(Number(val) || 0)}
                      min={0}
                      decimalScale={2}
                      prefix="$"
                      rightSectionPointerEvents="none"
                    />
                  </Grid.Col>
                </Grid>

                <SimpleStatGrid
                  items={[
                    {
                      label: "Email",
                      value: staff?.email || "—",
                      icon: <IoMail size={16} />,
                    },
                    {
                      label: "Phone",
                      value: profile?.phoneNumber || "No contact number",
                      icon: <IoCall size={16} />,
                    },
                    {
                      label: "Position",
                      value: position || "—",
                      icon: <IoPerson size={16} />,
                    },
                    {
                      label: "Hourly Rate",
                      value: `$${Number(rate || 0).toFixed(2)}`,
                      icon: <IoCash size={16} />,
                    },
                  ]}
                />
              </Stack>
            </Paper>

            <Grid>
              <Grid.Col span={{ base: 12, md: 12 }}>
                <Paper
                  withBorder
                  radius="md"
                  p="lg"
                  className="app-modal__section"
                >
                  <Stack gap="md">
                    <Group gap="sm">
                      <ThemeIcon
                        radius="md"
                        size="lg"
                        variant="light"
                        color="orange"
                        className="app-modal__icon"
                      >
                        <IoHome size={18} />
                      </ThemeIcon>
                      <Stack gap={2}>
                        <Text fw={700}>Address</Text>
                        <Text size="sm" c="dimmed">
                          Current home address on file.
                        </Text>
                      </Stack>
                    </Group>

                    {address ? (
                      <Stack gap={6}>
                        <Text size="sm" fw={600}>
                          {address.street1}
                        </Text>
                        {address.street2 ? (
                          <Text size="sm">{address.street2}</Text>
                        ) : null}
                        <Text size="sm">
                          {address.city}, {address.province}
                        </Text>
                        <Text size="sm">{address.postalCode}</Text>
                        <Text size="sm">{address.country}</Text>
                      </Stack>
                    ) : (
                      <Text size="sm" c="dimmed">
                        No address on file.
                      </Text>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 12 }}>
                <Paper
                  withBorder
                  radius="md"
                  p="lg"
                  className="app-modal__section"
                >
                  <Stack gap="md">
                    <Group gap="sm">
                      <ThemeIcon
                        radius="md"
                        size="lg"
                        variant="light"
                        color="grape"
                        className="app-modal__icon"
                      >
                        <IoCall size={18} />
                      </ThemeIcon>
                      <Stack gap={2}>
                        <Text fw={700}>Emergency Contact</Text>
                        <Text size="sm" c="dimmed">
                          Primary contact in case something goes wrong on shift.
                        </Text>
                      </Stack>
                    </Group>

                    {emergency ? (
                      <SimpleStatGrid
                        items={[
                          {
                            label: "Name",
                            value: emergency.name || "—",
                            icon: <IoPerson size={16} />,
                          },
                          {
                            label: "Phone",
                            value: emergency.phoneNumber || "—",
                            icon: <IoCall size={16} />,
                          },
                          {
                            label: "Relationship",
                            value: emergency.relationship || "—",
                            icon: <IoShield size={16} />,
                          },
                        ]}
                      />
                    ) : (
                      <Text size="sm" c="dimmed">
                        No emergency contact on file.
                      </Text>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </>
        ) : (
          <Paper withBorder radius="md" p="lg" className="app-modal__section">
            <Stack gap="md">
              <Group gap="sm">
                <ThemeIcon
                  radius="md"
                  size="lg"
                  variant="light"
                  color="teal"
                  className="app-modal__icon"
                >
                  <IoCard size={18} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text fw={700}>Financial Details</Text>
                  <Text size="sm" c="dimmed">
                    Update direct deposit and TD1 settings without opening
                    another modal.
                  </Text>
                </Stack>
              </Group>

              {financialsLoading ? (
                <Alert color="gray">
                  <Group gap="xs">
                    <Loader />
                    <Text size="sm">Loading financial details...</Text>
                  </Group>
                </Alert>
              ) : null}

              <Paper
                withBorder
                radius="md"
                p="md"
                className="app-modal__subsection"
              >
                <Stack gap="md">
                  <Text fw={700}>Bank details</Text>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput
                      label="Bank Name"
                      value={bank.bankName}
                      onChange={(e) =>
                        setBank({ ...bank, bankName: e.currentTarget.value })
                      }
                    />
                    <TextInput
                      label="Account Holder"
                      value={bank.accountHolder}
                      onChange={(e) =>
                        setBank({
                          ...bank,
                          accountHolder: e.currentTarget.value,
                        })
                      }
                    />
                    <TextInput
                      label="Institution Number"
                      value={bank.institutionNo}
                      onChange={(e) =>
                        setBank({
                          ...bank,
                          institutionNo: e.currentTarget.value,
                        })
                      }
                    />
                    <TextInput
                      label="Transit Number"
                      value={bank.transitNo}
                      onChange={(e) =>
                        setBank({ ...bank, transitNo: e.currentTarget.value })
                      }
                    />
                    <TextInput
                      label="Account Number"
                      value={bank.accountNo}
                      onChange={(e) =>
                        setBank({ ...bank, accountNo: e.currentTarget.value })
                      }
                    />
                  </SimpleGrid>
                </Stack>
              </Paper>

              <Paper
                withBorder
                radius="md"
                p="md"
                className="app-modal__subsection"
              >
                <Stack gap="md">
                  <Text fw={700}>TD1 tax details</Text>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput
                      label="SIN"
                      value={tax.sin}
                      onChange={(e) =>
                        setTax({ ...tax, sin: e.currentTarget.value })
                      }
                    />
                    <NumberInput
                      label="Federal Claim Amount"
                      value={tax.federalClaimAmount}
                      onChange={(value) =>
                        setTax({
                          ...tax,
                          federalClaimAmount: Number(value) || 0,
                        })
                      }
                    />
                    <NumberInput
                      label="Additional Federal Tax Per Pay"
                      value={tax.additionalFederalTaxPerPay}
                      onChange={(value) =>
                        setTax({
                          ...tax,
                          additionalFederalTaxPerPay: Number(value) || 0,
                        })
                      }
                    />
                    <NumberInput
                      label="Quebec Claim Amount"
                      value={tax.quebecClaimAmount}
                      onChange={(value) =>
                        setTax({
                          ...tax,
                          quebecClaimAmount: Number(value) || 0,
                        })
                      }
                    />
                    <Checkbox
                      mt="xl"
                      label="Exempt from tax"
                      checked={tax.isExempt}
                      onChange={(e) =>
                        setTax({ ...tax, isExempt: e.currentTarget.checked })
                      }
                    />
                  </SimpleGrid>
                </Stack>
              </Paper>
            </Stack>
          </Paper>
        )}

        <Group justify="space-between" wrap="wrap">
          <Text size="sm" c="dimmed"></Text>

          <Group>
            <Button variant="default" onClick={onClose}>
              Close
            </Button>
            <Button
              loading={isSaving}
              onClick={
                activeView === "financial" ? handleSaveFinancial : handleSave
              }
            >
              Save
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

function SimpleStatGrid({
  items,
}: {
  items: { label: string; value: string; icon: React.ReactNode }[];
}) {
  return (
    <Grid>
      {items.map((item) => (
        <Grid.Col key={item.label} span={{ base: 12, sm: 6 }}>
          <Paper withBorder radius="md" p="md" className="app-modal__footer">
            <Group align="flex-start" wrap="nowrap">
              <ThemeIcon
                radius="md"
                size="lg"
                variant="light"
                color="gray"
                className="app-modal__icon"
              >
                {item.icon}
              </ThemeIcon>
              <Stack gap={2}>
                <Text size="xs" fw={700} c="dimmed">
                  {item.label}
                </Text>
                <Text fw={700}>{item.value}</Text>
              </Stack>
            </Group>
          </Paper>
        </Grid.Col>
      ))}
    </Grid>
  );
}
