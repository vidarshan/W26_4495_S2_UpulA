"use client";

import {
  Modal,
  Stack,
  Text,
  Group,
  TextInput,
  NumberInput,
  Checkbox,
  Button,
  Divider,
} from "@mantine/core";
import { useState, useEffect } from "react";
import { IoCreateOutline } from "react-icons/io5";
type Props = {
  opened: boolean;
  onClose: () => void;
  staffId: string;
  data?: any; // from API
};

export default function FinancialDetailsModal({
  opened,
  onClose,
  staffId,
  data,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  // ------------------------
  // SAVE
  // ------------------------
  const handleSave = async () => {
    try {
      setIsSaving(true);

      await fetch(`/api/admin/staff/${staffId}/financial`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank,
          tax,
        }),
      });

      setEditing(false);
    } catch (err) {
      console.error(err);
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
    <Modal opened={opened} onClose={onClose} title="Financial Details" size="lg">
      <Stack>

        {/* ================= BANK DETAILS ================= */}
        <Group justify="space-between">
          <Text fw={600}>Bank Details</Text>
          <IoCreateOutline
            size={16}
            style={{ cursor: "pointer" }}
            onClick={() => setEditing(true)}
          />
        </Group>

        {editing ? (
          <>
            <TextInput
              label="Bank Name"
              value={bank.bankName}
              onChange={(e) =>
                setBank({ ...bank, bankName: e.target.value })
              }
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
              onChange={(e) =>
                setBank({ ...bank, transitNo: e.target.value })
              }
            />
            <TextInput
              label="Account Number"
              value={bank.accountNo}
              onChange={(e) =>
                setBank({ ...bank, accountNo: e.target.value })
              }
            />
          </>
        ) : (
          <>
            <Text size="sm">Bank: {bank.bankName || "—"}</Text>
            <Text size="sm">Account Holder: {bank.accountHolder || "—"}</Text>
            <Text size="sm">Institution: {bank.institutionNo || "—"}</Text>
            <Text size="sm">Transit: {bank.transitNo || "—"}</Text>
            <Text size="sm">Account: ****{bank.accountNo.slice(-4)}</Text>
          </>
        )}

        <Divider />

        {/* ================= TAX DETAILS ================= */}
        <Group justify="space-between">
          <Text fw={600}>Tax Details (TD1)</Text>
        </Group>

        {editing ? (
          <>
            <TextInput
              label="SIN"
              value={tax.sin}
              onChange={(e) =>
                setTax({ ...tax, sin: e.target.value })
              }
            />

            <NumberInput
              label="Total Claim Amount"
              value={tax.totalClaimAmount}
              onChange={(val) =>
                setTax({ ...tax, totalClaimAmount: Number(val) || 0 })
              }
            />

            <NumberInput
              label="Additional Tax per Pay"
              value={tax.additionalTaxPerPay}
              onChange={(val) =>
                setTax({ ...tax, additionalTaxPerPay: Number(val) || 0 })
              }
            />

            <NumberInput
              label="Deductions"
              value={tax.deductionsTotal}
              onChange={(val) =>
                setTax({ ...tax, deductionsTotal: Number(val) || 0 })
              }
            />

            <Checkbox
              label="Exempt from tax"
              checked={tax.isExempt}
              onChange={(e) =>
                setTax({ ...tax, isExempt: e.currentTarget.checked })
              }
            />
          </>
        ) : (
          <>
            <Text size="sm">SIN: {maskedSIN}</Text>
            <Text size="sm">
              Claim Amount: ${tax.totalClaimAmount.toFixed(2)}
            </Text>
            <Text size="sm">
              Additional Tax: ${tax.additionalTaxPerPay.toFixed(2)}
            </Text>
            <Text size="sm">
              Deductions: ${tax.deductionsTotal.toFixed(2)}
            </Text>
            <Text size="sm">
              Exempt: {tax.isExempt ? "Yes" : "No"}
            </Text>
          </>
        )}

        {/* ================= ACTIONS ================= */}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            loading={isSaving}
            disabled={!editing}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}