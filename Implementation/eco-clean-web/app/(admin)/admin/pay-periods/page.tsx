"use client";

import {
  Badge,
  Box,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  IoCalendar,
  IoCash,
  IoDocumentText,
  IoDownload,
  IoPeople,
} from "@/lib/icons";
import AdminPageFrame from "@/app/components/admin/AdminPageFrame";
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
  totalRegularHours?: number;
  totalOtHours?: number;
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
      notifications.show({
        title: "Select a pay period",
        message: "Choose a pay period before generating pay statements.",
        color: "yellow",
      });
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
        notifications.show({
          title: "Generation failed",
          message: "Failed to generate pay statements.",
          color: "red",
        });
        return;
      }

      notifications.show({
        title: "Pay statements generated",
        message: "Pay statements were generated successfully.",
        color: "green",
      });
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Something went wrong",
        message: "Unable to generate pay statements right now.",
        color: "red",
      });
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

            totalRegularHours?: number;
            totalOtHours?: number;

            federalClaimAmount?: number | null;
            quebecClaimAmount?: number | null;
            additionalFederalTax?: number | null;
            additionalQuebecTax?: number | null;
            isExempt?: boolean | null;
          }): StaffPayRow => {
            // ✅ Step 1: get values from API
            let regular = row.totalRegularHours ?? 0;
            let ot = row.totalOtHours ?? 0;

            // ✅ Step 2: enforce 40-hour rule
            if (regular > 40) {
              ot += regular - 40;
              regular = 40;
            }

            // ✅ Step 3: return row
            return {
              userId: row.userId,
              staffId: row.staffId,
              staffName: row.staffName,

              regularHours: regular,
              otHours: ot,

              regularAmount: 0,
              otAmount: 0,

              regularRate: round2(row.hourlyRate ?? 0),
              otRate: round2((row.hourlyRate ?? 0) * 1.5),
              transportAllowance: 0,

              federalClaimAmount: row.federalClaimAmount ?? 16452,
              quebecClaimAmount: row.quebecClaimAmount ?? 0,

              additionalFederalTax: row.additionalFederalTax ?? 0,
              additionalQuebecTax: row.additionalQuebecTax ?? 0,

              isExempt: row.isExempt ?? false,

              // deductions (initial)
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

              // manual flags
              manualFederalTax: false,
              manualQuebecTax: false,
              manualEi: false,
              manualQpp: false,
              manualQpp2: false,
              manualQpip: false,
            };
          }
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
      return prev.map((row, i) => {
        if (i !== index) return row;

        const cleanRow: StaffPayRow = {
          ...row,

          manualFederalTax: false,
          manualQuebecTax: false,
          manualEi: false,
          manualQpp: false,
          manualQpp2: false,
          manualQpip: false,

          federalTax: 0,
          quebecTax: 0,
          ei: 0,
          qpp: 0,
          qpp2: 0,
          qpip: 0,
        };

        // 👇 VERY IMPORTANT: return NEW object
        return {
          ...recalculateRow(cleanRow),
        };
      });
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
            onClick={handleSubmit}
            loading={loading}
            disabled={!rows.length}
            color="lime"
          >
            Generate statements
          </Button>
          <Button
            variant="light"
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
          icon: IoCalendar,
        },
        {
          label: "Staff rows",
          value: String(rows.length),
          icon: IoPeople,
        },
        {
          label: "Net payroll",
          value: formatMoney(totals.net),
          icon: IoCash,
        },
      ]}
    >
      <Stack gap="lg">
        <Stack gap="lg">
          <Paper
            withBorder
            radius="lg"
            p="md"
            className="admin-page-frame__stat"
            style={{
              background:
                "linear-gradient(180deg, rgba(247, 254, 231, 0.78), rgba(255, 255, 255, 0.96))",
            }}
          >
            <Group justify="space-between" align="flex-end" gap="md">
              <Box maw={520}>
                <Text fw={700} c="#0f172a">
                  Payroll run setup
                </Text>
                <Text size="sm" c="dimmed" mt={4}>
                  Choose one approved period, review the imported staff rows, then generate statements from this same screen.
                </Text>
              </Box>
              <Badge size="lg" variant="light" color="lime">
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
            p="md"
            className="admin-page-frame__surface"
          >
            <Stack gap="md">
              <Box>
                <Text fw={700} c="#0f172a">
                  Payroll rows
                </Text>
                <Text size="sm" c="#475569" mt={4}>
                  Each employee row is grouped into smaller edit sections so you can work without a wide spreadsheet view.
                </Text>
              </Box>

              {!rows.length ? (
                <Text ta="center" c="dimmed" py="xl">
                  {loadingRows
                    ? "Loading approved payroll rows..."
                    : "No approved staff rows available for this period."}
                </Text>
              ) : (
                <Stack gap="md">
                  {rows.map((row, index) => (
                    <Paper key={`${row.staffId}-${index}`} withBorder p="md" className="admin-page-frame__stat">
                      <Stack gap="md">
                        <Group justify="space-between" align="flex-start" gap="md">
                          <div>
                            <Text fw={700} c="#0f172a">
                              {row.staffName}
                            </Text>
                            <Text size="sm" c="dimmed">
                              {row.staffId}
                            </Text>
                          </div>
                          <Button
                            size="xs"
                            variant="light"
                            color="lime"
                            onClick={() => resetSuggestedDeductions(index)}
                          >
                            Reset deductions
                          </Button>
                        </Group>

                        <SimpleGrid cols={{ base: 1, xl: 3 }} spacing="md">
                          <Paper withBorder p="md" radius="lg">
                            <Stack gap="sm">
                              <Text fw={700} c="#0f172a">
                                Earnings
                              </Text>
                              <NumberInput
                                label="Regular hours"
                                value={row.regularHours}
                                min={0}
                                onChange={(value) =>
                                  updateRow(index, "regularHours", Number(value) || 0)
                                }
                              />
                              <NumberInput
                                label="Regular rate"
                                value={row.regularRate}
                                min={0}
                                decimalScale={2}
                                fixedDecimalScale
                                onChange={(value) =>
                                  updateRow(index, "regularRate", Number(value) || 0)
                                }
                              />
                              <NumberInput
                                label="OT hours"
                                value={row.otHours}
                                min={0}
                                onChange={(value) =>
                                  updateRow(index, "otHours", Number(value) || 0)
                                }
                              />
                              <NumberInput
                                label="OT rate"
                                value={row.otRate}
                                decimalScale={2}
                                fixedDecimalScale
                                min={0}
                                onChange={(value) =>
                                  updateRow(index, "otRate", Number(value) || 0)
                                }
                              />
                              <NumberInput
                                label="Transport"
                                value={row.transportAllowance}
                                min={0}
                                onChange={(value) =>
                                  updateRow(index, "transportAllowance", Number(value) || 0)
                                }
                              />
                            </Stack>
                          </Paper>

                          <Paper withBorder p="md" radius="lg">
                            <Stack gap="sm">
                              <Text fw={700} c="#0f172a">
                                Payroll deductions
                              </Text>
                              <NumberInput
                                label="Federal"
                                value={row.federalTax}
                                onChange={(value) =>
                                  updateManualDeduction(index, "federalTax", Number(value) || 0)
                                }
                              />
                              <NumberInput
                                label="Quebec"
                                value={row.quebecTax}
                                onChange={(value) =>
                                  updateManualDeduction(index, "quebecTax", Number(value) || 0)
                                }
                              />
                              <NumberInput
                                label="EI"
                                value={row.ei}
                                onChange={(value) =>
                                  updateManualDeduction(index, "ei", Number(value) || 0)
                                }
                              />
                              <NumberInput
                                label="QPP"
                                value={row.qpp}
                                onChange={(value) =>
                                  updateManualDeduction(index, "qpp", Number(value) || 0)
                                }
                              />
                              <NumberInput
                                label="QPP2"
                                value={row.qpp2}
                                onChange={(value) =>
                                  updateManualDeduction(index, "qpp2", Number(value) || 0)
                                }
                              />
                              <NumberInput
                                label="QPIP"
                                value={row.qpip}
                                onChange={(value) =>
                                  updateManualDeduction(index, "qpip", Number(value) || 0)
                                }
                              />
                            </Stack>
                          </Paper>

                          <Paper withBorder p="md" radius="lg">
                            <Stack gap="sm">
                              <Text fw={700} c="#0f172a">
                                Other Deductions and totals
                              </Text>
                              <NumberInput
                                label="Health"
                                value={row.health}
                                onChange={(value) =>
                                  updateRow(index, "health", Number(value) || 0)
                                }
                              />
                              <NumberInput
                                label="Other"
                                value={row.other}
                                onChange={(value) =>
                                  updateRow(index, "other", Number(value) || 0)
                                }
                              />
                              <SimpleGrid cols={1} spacing="xs" mt="xs">
                                <Paper withBorder p="sm" radius="lg">
                                  <Text size="xs" c="dimmed">Regular amount</Text>
                                  <Text fw={700} mt={4}>{formatMoney(row.regularAmount)}</Text>
                                </Paper>
                                <Paper withBorder p="sm" radius="lg">
                                  <Text size="xs" c="dimmed">OT amount</Text>
                                  <Text fw={700} mt={4}>{formatMoney(row.otAmount)}</Text>
                                </Paper>
                                <Paper withBorder p="sm" radius="lg">
                                  <Text size="xs" c="dimmed">Deductions</Text>
                                  <Text fw={700} mt={4}>{formatMoney(row.deductions)}</Text>
                                </Paper>
                                <Paper withBorder p="sm" radius="lg">
                                  <Text size="xs" c="dimmed">Gross</Text>
                                  <Text fw={700} mt={4}>{formatMoney(row.grossEarnings)}</Text>
                                </Paper>
                                <Paper
                                  withBorder
                                  p="sm"
                                  radius="lg"
                                  style={{
                                    borderColor: "rgba(132, 204, 22, 0.24)",
                                    background:
                                      "linear-gradient(180deg, rgba(247, 254, 231, 0.9), rgba(255, 255, 255, 0.98))",
                                  }}
                                >
                                  <Text size="xs" c="dimmed">Net</Text>
                                  <Text fw={800} mt={4}>{formatMoney(row.netEarnings)}</Text>
                                </Paper>
                              </SimpleGrid>
                            </Stack>
                          </Paper>
                        </SimpleGrid>
                      </Stack>
                    </Paper>
                  ))}

                  <Paper withBorder p="md" className="admin-page-frame__stat">
                    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                      <div>
                        <Text size="xs" c="dimmed">Total deductions</Text>
                        <Text fw={700} mt={4}>{formatMoney(totals.deductions)}</Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">Gross payroll</Text>
                        <Text fw={700} mt={4}>{formatMoney(totals.gross)}</Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">Net payroll</Text>
                        <Text fw={800} mt={4}>{formatMoney(totals.net)}</Text>
                      </div>
                    </SimpleGrid>
                  </Paper>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Stack>
    </AdminPageFrame>
  );
}

function recalculateRow(row: StaffPayRow): StaffPayRow {
  const regularRate = round2(row.regularRate);
  const otRate = round2(row.otRate);

  const regularAmount = row.regularHours * regularRate;
  const otAmount = row.otHours * otRate;
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
    regularAmount: round2(regularAmount),
    otAmount: round2(otAmount),
    grossEarnings: round2(gross),

    federalTax: row.manualFederalTax
      ? row.federalTax
      : round2(result.federalTax),

    quebecTax: row.manualQuebecTax
      ? row.quebecTax
      : round2(result.quebecTax),

    qpp: row.manualQpp
      ? row.qpp
      : round2(result.qpp),

    ei: row.manualEi
      ? row.ei
      : round2(result.ei),

    qpip: row.manualQpip
      ? row.qpip
      : round2(result.qpip),

    deductions: round2(totalDeductions),
    netEarnings: round2(net),
  };


};
function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

