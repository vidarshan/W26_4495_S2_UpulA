"use client";

import {
  Alert,
  Badge,
  Modal,
  Stack,
  Text,
  Group,
  TextInput,
  NumberInput,
  Checkbox,
  Button,
  Paper,
  SimpleGrid,
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState, useEffect } from "react";
import {
  IoCardOutline,
  IoLockClosedOutline,
  IoShieldCheckmarkOutline,
} from "react-icons/io5";
type Props = {
  opened: boolean;
  onClose: () => void;
  staffId: string;
  data?: {
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
  };
};

export default function FinancialDetailsModal({
  opened,
  onClose,
  staffId,
  data,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ------------------------
  // STATE
  // ------------------------
  const [bank, setBank] = useState({
    bankName: "",
    accountHolder: "",
    institutionNo: "",
    transitNo: "",
    accountNo: "",
  });

  const [tax, setTax] = useState({
    sin: "",
    totalClaimAmount: 0,
    additionalTaxPerPay: 0,
    deductionsTotal: 0,
    isExempt: false,
  });

  // ------------------------
  // LOAD DATA
  // ------------------------
  useEffect(() => {
    if (data) {
      setBank({
        bankName: data.bankDetails?.bankName || "",
        accountHolder: data.bankDetails?.accountHolder || "",
        institutionNo: data.bankDetails?.institutionNo || "",
        transitNo: data.bankDetails?.transitNo || "",
        accountNo: data.bankDetails?.accountNo || "",
      });

      setTax({
        sin: data.td1?.sin || "",
        totalClaimAmount: data.td1?.totalClaimAmount || 0,
        additionalTaxPerPay: data.td1?.additionalTaxPerPay || 0,
        deductionsTotal: data.td1?.deductionsTotal || 0,
        isExempt: data.td1?.isExempt || false,
      });
    }
  }, [data]);

  useEffect(() => {
    if (!opened || data || !staffId) return;

    let active = true;

    async function loadFinancials() {
      try {
        setIsLoading(true);

        const res = await fetch(`/api/admin/staff/${staffId}/financials`, {
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to load financial details");

        const payload = await res.json();

        if (!active) return;

        setBank({
          bankName: payload.bankDetails?.bankName || "",
          accountHolder: payload.bankDetails?.accountHolder || "",
          institutionNo: payload.bankDetails?.institutionNo || "",
          transitNo: payload.bankDetails?.transitNo || "",
          accountNo: payload.bankDetails?.accountNo || "",
        });

        setTax({
          sin: payload.td1?.sin || "",
          totalClaimAmount: payload.td1?.federalClaimAmount || 0,
          additionalTaxPerPay: payload.td1?.additionalFederalTaxPerPay || 0,
          deductionsTotal: payload.td1?.quebecClaimAmount || 0,
          isExempt: payload.td1?.isExempt || false,
        });
      } catch (err) {
        console.error(err);
        notifications.show({
          title: "Unable to load financial details",
          message: "Please try opening this panel again.",
          color: "red",
        });
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadFinancials();

    return () => {
      active = false;
    };
  }, [opened, data, staffId]);

  // ------------------------
  // SAVE
  // ------------------------
  const handleSave = async () => {
    try {
      setIsSaving(true);

      const response = await fetch(`/api/admin/staff/${staffId}/financials`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank,
          tax: {
            sin: tax.sin,
            federalClaimAmount: tax.totalClaimAmount,
            quebecClaimAmount: tax.deductionsTotal,
            additionalFederalTaxPerPay: tax.additionalTaxPerPay,
            additionalQuebecTaxPerPay: 0,
            isExempt: tax.isExempt,
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to save financial details");
      }

      setEditing(false);
      notifications.show({
        title: "Financial details updated",
        message: "Bank and tax details were saved successfully.",
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

  // ------------------------
  // MASK SIN
  // ------------------------
  const maskedSIN =
    tax.sin && tax.sin.length === 9
      ? `*** *** ${tax.sin.slice(-3)}`
      : "—";

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Financial Details"
      size="lg"
      centered
      classNames={{
        content: "app-modal__content",
        header: "app-modal__header",
        title: "app-modal__title",
        body: "app-modal__body",
      }}
    >
      <Stack gap="md">
        <Paper withBorder radius="xl" p="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Group align="flex-start" wrap="nowrap" gap="md">
              <ThemeIcon size={48} radius="xl" color="teal" variant="light">
                <IoCardOutline size={22} />
              </ThemeIcon>
              <Stack gap={4}>
                <Text size="xs" fw={800} c="dimmed" tt="uppercase">
                  Payroll Setup
                </Text>
                <Text fw={800} size="lg">
                  Bank and tax profile
                </Text>
                <Text size="sm" c="dimmed">
                  Review direct deposit details and TD1 settings before payroll is generated.
                </Text>
              </Stack>
            </Group>
            <Badge variant="light" color={editing ? "lime" : "gray"} radius="xl">
              {editing ? "Editing" : "Read only"}
            </Badge>
          </Group>
        </Paper>

        {isLoading ? (
          <Alert color="gray">Loading financial details...</Alert>
        ) : null}

        <Paper withBorder radius="xl" p="lg">
          <Stack gap="md">
            <Group justify="space-between" align="center" wrap="wrap">
              <Group gap="sm">
                <ThemeIcon radius="xl" size="lg" variant="light" color="blue">
                  <IoCardOutline size={18} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text fw={700}>Bank details</Text>
                  <Text size="sm" c="dimmed">
                    Deposit routing and account ownership.
                  </Text>
                </Stack>
              </Group>
              {!editing ? (
                <Button variant="light" size="sm" onClick={() => setEditing(true)}>
                  Edit financials
                </Button>
              ) : null}
            </Group>

            {editing ? (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label="Bank Name"
                  value={bank.bankName}
                  onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                />
                <TextInput
                  label="Account Holder"
                  value={bank.accountHolder}
                  onChange={(e) =>
                    setBank({ ...bank, accountHolder: e.target.value })
                  }
                />
                <TextInput
                  label="Institution Number"
                  value={bank.institutionNo}
                  onChange={(e) =>
                    setBank({ ...bank, institutionNo: e.target.value })
                  }
                />
                <TextInput
                  label="Transit Number"
                  value={bank.transitNo}
                  onChange={(e) => setBank({ ...bank, transitNo: e.target.value })}
                />
                <TextInput
                  label="Account Number"
                  value={bank.accountNo}
                  onChange={(e) => setBank({ ...bank, accountNo: e.target.value })}
                />
              </SimpleGrid>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <InfoStat label="Bank" value={bank.bankName || "—"} />
                <InfoStat label="Account Holder" value={bank.accountHolder || "—"} />
                <InfoStat label="Institution" value={bank.institutionNo || "—"} />
                <InfoStat label="Transit" value={bank.transitNo || "—"} />
                <InfoStat
                  label="Account"
                  value={bank.accountNo ? `•••• ${bank.accountNo.slice(-4)}` : "—"}
                />
              </SimpleGrid>
            )}
          </Stack>
        </Paper>

        <Paper withBorder radius="xl" p="lg">
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon radius="xl" size="lg" variant="light" color="grape">
                <IoShieldCheckmarkOutline size={18} />
              </ThemeIcon>
              <Stack gap={2}>
                <Text fw={700}>Tax details</Text>
                <Text size="sm" c="dimmed">
                  Federal claim amount, tax adjustments, and exemption status.
                </Text>
              </Stack>
            </Group>

            {editing ? (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label="SIN"
                  value={tax.sin}
                  onChange={(e) => setTax({ ...tax, sin: e.target.value })}
                />
                <NumberInput
                  label="Federal Claim Amount"
                  value={tax.totalClaimAmount}
                  onChange={(val) =>
                    setTax({ ...tax, totalClaimAmount: Number(val) || 0 })
                  }
                />
                <NumberInput
                  label="Additional Federal Tax Per Pay"
                  value={tax.additionalTaxPerPay}
                  onChange={(val) =>
                    setTax({ ...tax, additionalTaxPerPay: Number(val) || 0 })
                  }
                />
                <NumberInput
                  label="Quebec Claim Amount"
                  value={tax.deductionsTotal}
                  onChange={(val) =>
                    setTax({ ...tax, deductionsTotal: Number(val) || 0 })
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
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <InfoStat label="SIN" value={maskedSIN} />
                <InfoStat
                  label="Federal Claim Amount"
                  value={`$${tax.totalClaimAmount.toFixed(2)}`}
                />
                <InfoStat
                  label="Additional Federal Tax"
                  value={`$${tax.additionalTaxPerPay.toFixed(2)}`}
                />
                <InfoStat
                  label="Quebec Claim Amount"
                  value={`$${tax.deductionsTotal.toFixed(2)}`}
                />
                <InfoStat
                  label="Exempt"
                  value={tax.isExempt ? "Yes" : "No"}
                />
              </SimpleGrid>
            )}
          </Stack>
        </Paper>

        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" wrap="wrap">
            <Group gap="xs">
              <ThemeIcon radius="xl" size="md" variant="light" color="gray">
                <IoLockClosedOutline size={14} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">
                Sensitive values are masked outside edit mode.
              </Text>
            </Group>

            <Group>
              {editing ? (
                <Button variant="default" onClick={() => setEditing(false)}>
                  Stop Editing
                </Button>
              ) : null}
              <Button variant="default" onClick={onClose}>
                Close
              </Button>
              <Button onClick={handleSave} loading={isSaving} disabled={!editing}>
                Save
              </Button>
            </Group>
          </Group>
        </Paper>
      </Stack>
    </Modal>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder radius="lg" p="md">
      <Text size="xs" fw={700} c="dimmed">
        {label}
      </Text>
      <Text fw={700} mt={6}>
        {value}
      </Text>
    </Paper>
  );
}
