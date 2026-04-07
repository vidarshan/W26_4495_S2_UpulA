"use client";

import {
  Badge,
  Box,
  Button,
  Group,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  IoCalendarOutline,
  IoCashOutline,
  IoDocumentTextOutline,
  IoDownloadOutline,
  IoPeopleOutline,
} from "react-icons/io5";
import AdminPageFrame from "@/app/components/admin/AdminPageFrame";
import AdminStaffWorkspaceNav from "@/app/components/admin/AdminStaffWorkspaceNav";
import { calculatePayroll } from "@/lib/payroll/calculatePayroll";

type StaffPayRow = {
  userId: string;
  staffId: string;
  staffName: string;
  regularHours: number;
  regularRate: number;
  regularAmount: number;
  otHours: number;
  otRate: number;
  otAmount: number;
  transportAllowance: number;
  federalClaimAmount: number;
  quebecClaimAmount: number;
  additionalFederalTax: number;
  additionalQuebecTax: number;
  isExempt: boolean;
  federalTax: number;
  quebecTax: number;
  ei: number;
  qpp: number;
  qpp2: number;
  qpip: number;
  health: number;
  other: number;
  grossEarnings: number;
  deductions: number;
  netEarnings: number;
  manualFederalTax: boolean;
  manualQuebecTax: boolean;
  manualEi: boolean;
  manualQpp: boolean;
  manualQpp2: boolean;
  manualQpip: boolean;
};

type DeductionField =
  | "federalTax"
  | "quebecTax"
  | "ei"
  | "qpp"
  | "qpp2"
  | "qpip";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value || 0);
}

function formatPeriodLabel(dateValue: string) {
  return new Date(dateValue).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ManagePayPeriodsPage() {
  const [periodOptions, setPeriodOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffPayRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);

  async function handleSubmit() {
    if (!periodId) {
      alert("Please select a pay period first.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/pay-statements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          periodId,
          rows,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Failed:", text);
        alert("Failed to generate pay statements");
        return;
      }

      alert("Pay statements generated successfully!");
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadPeriods() {
      const res = await fetch("/api/admin/timesheets/periods");
      const data = await res.json();

      const options = data.map(
        (period: { id: string; startDate: string; endDate: string }) => ({
          value: period.id,
          label: `${formatPeriodLabel(period.startDate)} - ${formatPeriodLabel(period.endDate)}`,
        }),
      );

      setPeriodOptions(options);

      if (options.length > 0) {
        setPeriodId(options[0].value);
      }
    }

    void loadPeriods();
  }, []);

  useEffect(() => {
    if (!periodId) {
      setRows([]);
      return;
    }

    async function loadPayData() {
      setLoadingRows(true);

      try {
        const res = await fetch(
          `/api/admin/staff-payroll?periodId=${periodId}`,
        );
        const data = await res.json();

        const mapped = data.map(
          (row: {
            userId: string;
            staffId: string;
            staffName: string;
            hourlyRate?: number | null;
            federalClaimAmount?: number | null;
            quebecClaimAmount?: number | null;
            additionalFederalTax?: number | null;
            additionalQuebecTax?: number | null;
            isExempt?: boolean | null;
          }): StaffPayRow => ({
            userId: row.userId,
            staffId: row.staffId,
            staffName: row.staffName,
            regularHours: 0,
            regularRate: row.hourlyRate ?? 0,
            regularAmount: 0,
            otHours: 0,
            otRate: row.hourlyRate ?? 0,
            otAmount: 0,
            transportAllowance: 0,
            federalClaimAmount: row.federalClaimAmount ?? 16452,
            quebecClaimAmount: row.quebecClaimAmount ?? 0,
            additionalFederalTax: row.additionalFederalTax ?? 0,
            additionalQuebecTax: row.additionalQuebecTax ?? 0,
            isExempt: row.isExempt ?? false,
            federalTax: 0,
            quebecTax: 0,
            ei: 0,
            qpp: 0,
            qpp2: 0,
            qpip: 0,
            health: 0,
            other: 0,
            grossEarnings: 0,
            deductions: 0,
            netEarnings: 0,
            manualFederalTax: false,
            manualQuebecTax: false,
            manualEi: false,
            manualQpp: false,
            manualQpp2: false,
            manualQpip: false,
          }),
        );

        setRows(mapped.map(recalculateRow));
      } finally {
        setLoadingRows(false);
      }
    }

    void loadPayData();
  }, [periodId]);

  function updateRow<K extends keyof StaffPayRow>(
    index: number,
    field: K,
    value: StaffPayRow[K],
  ) {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = recalculateRow({
        ...updated[index],
        [field]: value,
      });
      return updated;
    });
  }

  function updateManualDeduction(
    index: number,
    field: DeductionField,
    value: number,
  ) {
    const map = {
      federalTax: "manualFederalTax",
      quebecTax: "manualQuebecTax",
      ei: "manualEi",
      qpp: "manualQpp",
      qpp2: "manualQpp2",
      qpip: "manualQpip",
    } as const;

    setRows((prev) => {
      const updated = [...prev];

      updated[index] = recalculateRow({
        ...updated[index],
        [field]: value,
        [map[field]]: true,
      });

      return updated;
    });
  }

  function resetSuggestedDeductions(index: number) {
    setRows((prev) => {
      const updated = [...prev];

      updated[index] = recalculateRow({
        ...updated[index],
        manualFederalTax: false,
        manualQuebecTax: false,
        manualEi: false,
        manualQpp: false,
        manualQpp2: false,
        manualQpip: false,
      });

      return updated;
    });
  }

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          acc.gross += row.grossEarnings || 0;
          acc.deductions += row.deductions || 0;
          acc.net += row.netEarnings || 0;
          return acc;
        },
        { gross: 0, deductions: 0, net: 0 },
      ),
    [rows],
  );

  function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    XLSX.writeFile(wb, "payroll.xlsx");
  }

  const selectedPeriodLabel =
    periodOptions.find((option) => option.value === periodId)?.label ??
    "No period selected";

  return (
    <AdminPageFrame
      eyebrow="Payroll admin"
      title="Pay Periods"
      description="Review approved timesheet totals, fine-tune deductions, and generate pay statements from the newer admin page system."
      action={
        <Group gap="sm">
          <Button
            leftSection={<IoDocumentTextOutline size={16} />}
            onClick={handleSubmit}
            loading={loading}
            disabled={!rows.length}
          >
            Generate statements
          </Button>
          <Button
            variant="light"
            leftSection={<IoDownloadOutline size={16} />}
            onClick={exportToExcel}
            disabled={!rows.length}
          >
            Export Excel
          </Button>
        </Group>
      }
      stats={[
        {
          label: "Selected period",
          value: periodId ? "1 active" : "None",
          icon: IoCalendarOutline,
        },
        {
          label: "Staff rows",
          value: String(rows.length),
          icon: IoPeopleOutline,
        },
        {
          label: "Net payroll",
          value: formatMoney(totals.net),
          icon: IoCashOutline,
        },
      ]}
    >
      <Stack gap="lg">
        <AdminStaffWorkspaceNav />

        <Stack gap="lg">
          <Paper
            withBorder
            radius="lg"
            p="md"
            className="admin-page-frame__stat"
          >
            <Group justify="space-between" align="flex-end" gap="md">
              <Box maw={520}>
                <Text fw={700} c="#0f172a">
                  Timesheet period
                </Text>
                <Text size="sm" c="dimmed" mt={4}>
                  Use a completed period to pull approved time into payroll
                  calculations.
                </Text>
              </Box>
              <Badge size="lg" variant="light" color="teal">
                {selectedPeriodLabel}
              </Badge>
            </Group>

            <Select
              mt="md"
              value={periodId}
              onChange={setPeriodId}
              data={periodOptions}
              placeholder="Select period"
            />
          </Paper>

          <Paper
            withBorder
            radius="lg"
            p={0}
            className="admin-page-frame__surface"
          >
            <ScrollArea h={560} type="auto">
              <Table.ScrollContainer minWidth={2200}>
                <Table
                  withTableBorder
                  withColumnBorders
                  striped
                  highlightOnHover
                >
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Staff ID</Table.Th>
                      <Table.Th>Staff name</Table.Th>
                      <Table.Th>Regular hours</Table.Th>
                      <Table.Th>Regular rate</Table.Th>
                      <Table.Th>Regular amount</Table.Th>
                      <Table.Th>OT hours</Table.Th>
                      <Table.Th>OT rate</Table.Th>
                      <Table.Th>OT amount</Table.Th>
                      <Table.Th>Transport</Table.Th>
                      <Table.Th>Federal</Table.Th>
                      <Table.Th>Quebec</Table.Th>
                      <Table.Th>EI</Table.Th>
                      <Table.Th>QPP</Table.Th>
                      <Table.Th>QPP2</Table.Th>
                      <Table.Th>QPIP</Table.Th>
                      <Table.Th>Health</Table.Th>
                      <Table.Th>Other</Table.Th>
                      <Table.Th>Reset</Table.Th>
                      <Table.Th>Deductions</Table.Th>
                      <Table.Th>Gross</Table.Th>
                      <Table.Th>Net</Table.Th>
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    {!rows.length ? (
                      <Table.Tr>
                        <Table.Td colSpan={21}>
                          <Text ta="center" c="dimmed" py="xl">
                            {loadingRows
                              ? "Loading approved payroll rows..."
                              : "No approved staff rows available for this period."}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      rows.map((row, index) => (
                        <Table.Tr key={`${row.staffId}-${index}`}>
                          <Table.Td>{row.staffId}</Table.Td>
                          <Table.Td>{row.staffName}</Table.Td>
                          <Table.Td>
                            <NumberInput
                              value={row.regularHours}
                              min={0}
                              onChange={(value) =>
                                updateRow(
                                  index,
                                  "regularHours",
                                  Number(value) || 0,
                                )
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              value={row.regularRate}
                              min={0}
                              onChange={(value) =>
                                updateRow(
                                  index,
                                  "regularRate",
                                  Number(value) || 0,
                                )
                              }
                            />
                          </Table.Td>
                          <Table.Td>{formatMoney(row.regularAmount)}</Table.Td>
                          <Table.Td>
                            <NumberInput
                              value={row.otHours}
                              min={0}
                              onChange={(value) =>
                                updateRow(index, "otHours", Number(value) || 0)
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              value={row.otRate}
                              min={0}
                              onChange={(value) =>
                                updateRow(index, "otRate", Number(value) || 0)
                              }
                            />
                          </Table.Td>
                          <Table.Td>{formatMoney(row.otAmount)}</Table.Td>
                          <Table.Td>
                            <NumberInput
                              value={row.transportAllowance}
                              min={0}
                              onChange={(value) =>
                                updateRow(
                                  index,
                                  "transportAllowance",
                                  Number(value) || 0,
                                )
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              value={row.federalTax}
                              onChange={(value) =>
                                updateManualDeduction(
                                  index,
                                  "federalTax",
                                  Number(value) || 0,
                                )
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              value={row.quebecTax}
                              onChange={(value) =>
                                updateManualDeduction(
                                  index,
                                  "quebecTax",
                                  Number(value) || 0,
                                )
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              value={row.ei}
                              onChange={(value) =>
                                updateManualDeduction(
                                  index,
                                  "ei",
                                  Number(value) || 0,
                                )
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              value={row.qpp}
                              onChange={(value) =>
                                updateManualDeduction(
                                  index,
                                  "qpp",
                                  Number(value) || 0,
                                )
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              value={row.qpp2}
                              onChange={(value) =>
                                updateManualDeduction(
                                  index,
                                  "qpp2",
                                  Number(value) || 0,
                                )
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              value={row.qpip}
                              onChange={(value) =>
                                updateManualDeduction(
                                  index,
                                  "qpip",
                                  Number(value) || 0,
                                )
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              value={row.health}
                              onChange={(value) =>
                                updateRow(index, "health", Number(value) || 0)
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              value={row.other}
                              onChange={(value) =>
                                updateRow(index, "other", Number(value) || 0)
                              }
                            />
                          </Table.Td>
                          <Table.Td>
                            <Button
                              size="xs"
                              variant="light"
                              onClick={() => resetSuggestedDeductions(index)}
                            >
                              Reset
                            </Button>
                          </Table.Td>
                          <Table.Td>{formatMoney(row.deductions)}</Table.Td>
                          <Table.Td>{formatMoney(row.grossEarnings)}</Table.Td>
                          <Table.Td>{formatMoney(row.netEarnings)}</Table.Td>
                        </Table.Tr>
                      ))
                    )}

                    {rows.length ? (
                      <Table.Tr>
                        <Table.Td colSpan={18}>
                          <Text fw={700}>Totals</Text>
                        </Table.Td>
                        <Table.Td>{formatMoney(totals.deductions)}</Table.Td>
                        <Table.Td>{formatMoney(totals.gross)}</Table.Td>
                        <Table.Td>{formatMoney(totals.net)}</Table.Td>
                      </Table.Tr>
                    ) : null}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </ScrollArea>
          </Paper>
        </Stack>
      </Stack>
    </AdminPageFrame>
  );
}

function recalculateRow(row: StaffPayRow): StaffPayRow {
  const regularAmount = row.regularHours * row.regularRate;
  const otAmount = row.otHours * row.otRate;
  const gross = regularAmount + otAmount + (row.transportAllowance ?? 0);

  const result = calculatePayroll({
    grossPayPerPeriod: gross,
    federalClaimAmount: row.federalClaimAmount,
    quebecClaimAmount: row.quebecClaimAmount,
    additionalFederalTax: row.additionalFederalTax,
    additionalQuebecTax: row.additionalQuebecTax,
    isExempt: row.isExempt,
    manual: {
      federalTax: row.manualFederalTax ? row.federalTax : undefined,
      quebecTax: row.manualQuebecTax ? row.quebecTax : undefined,
      qpp: row.manualQpp ? row.qpp : undefined,
      ei: row.manualEi ? row.ei : undefined,
      qpip: row.manualQpip ? row.qpip : undefined,
    },
  });

  const extraDeductions = (row.health ?? 0) + (row.other ?? 0);
  const totalDeductions = result.totalDeductions + extraDeductions;
  const net = gross - totalDeductions;

  return {
    ...row,
    regularAmount,
    otAmount,
    grossEarnings: gross,
    qpp: result.qpp,
    ei: result.ei,
    qpip: result.qpip,
    federalTax: result.federalTax,
    quebecTax: result.quebecTax,
    deductions: totalDeductions,
    netEarnings: net,
  };
}
