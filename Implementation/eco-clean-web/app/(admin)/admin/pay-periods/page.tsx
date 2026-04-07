'use client';

import {
  Box,
  Button,
  Group,
  Card,
  Container,
  NumberInput,
  ScrollArea,
  Select,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useEffect, useMemo, useState } from 'react';
import { calculateQuebecPayrollEstimate } from '@/lib/payroll/deductions';
import * as XLSX from "xlsx";
import { IoDownloadOutline, IoDocumentTextOutline } from "react-icons/io5";



const PAY_PERIODS_PER_YEAR = 26;
const DEFAULT_FEDERAL_CLAIM = 16452;
const DEFAULT_QUEBEC_CLAIM = 0;

type StaffPayRow = {
  staffId: string;
  staffName: string;

  regularHours: number;
  regularRate: number;
  regularAmount: number;

  otHours: number;
  otRate: number;
  otAmount: number;

  transportAllowance: number;

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
  | 'federalTax'
  | 'quebecTax'
  | 'ei'
  | 'qpp'
  | 'qpp2'
  | 'qpip';

export default function ManagePayPeriodsPage() {
  const [periodOptions, setPeriodOptions] = useState<
    { value: string; label: string; disabled?: boolean }[]
  >([]);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffPayRow[]>([]);
  const [loading, setLoading] = useState(false);

  const isMobile = useMediaQuery('(max-width: 768px)');

  // ✅ Load periods
  useEffect(() => {
    async function loadPeriods() {
      try {
        const res = await fetch('/api/admin/timesheets/periods');

        if (!res.ok) {
          const text = await res.text();
          console.error('Failed to load periods:', text);
          throw new Error('Failed to load periods');
        }

        const data = await res.json();

        setPeriodOptions(
          data.map((p: any) => ({
            value: p.id,
            label: `${new Date(p.startDate).toLocaleDateString()} - ${new Date(
              p.endDate
            ).toLocaleDateString()}${p.lockedAt
              ? ' (Locked)'
              : p.status === 'APPROVED'
                ? ' (Approved)'
                : ''
              }`,
            disabled: !!p.lockedAt
          }))
        );
      } catch (err) {
        console.error('Failed to load periods', err);
      }
    }

    loadPeriods();
  }, []);

  // ✅ Load pay data
  useEffect(() => {
    async function loadPayData() {
      if (!periodId) return;

      try {
        const res = await fetch(`/api/admin/pay-statements?periodId=${periodId}`);

        if (!res.ok) {
          const text = await res.text();
          console.error('Failed to load pay data:', text);
          throw new Error('Failed to load pay data');
        }

        const data = await res.json();

        setRows(
          data.map((row: any) =>
            recalculateRow({
              staffId: row.staffId ?? '',
              staffName: row.staffName ?? '',

              regularHours: row.regularHours ?? 0,
              regularRate: row.regularRate ?? 0,
              regularAmount: 0,

              otHours: row.otHours ?? 0,
              otRate: row.otRate ?? 0,
              otAmount: 0,

              transportAllowance: row.transportAllowance ?? 0,

              federalTax: row.federalTax ?? 0,
              quebecTax: row.quebecTax ?? 0,
              ei: row.ei ?? 0,
              qpp: row.qpp ?? 0,
              qpp2: row.qpp2 ?? 0,
              qpip: row.qpip ?? 0,

              health: row.health ?? 0,
              other: row.other ?? 0,

              grossEarnings: 0,
              deductions: 0,
              netEarnings: 0,

              manualFederalTax: row.manualFederalTax ?? false,
              manualQuebecTax: row.manualQuebecTax ?? false,
              manualEi: row.manualEi ?? false,
              manualQpp: row.manualQpp ?? false,
              manualQpp2: row.manualQpp2 ?? false,
              manualQpip: row.manualQpip ?? false,
            })
          )
        );
      } catch (error) {
        console.error('Failed to load pay data', error);
      }
    }

    loadPayData();
  }, [periodId]);

  async function handleSubmit() {
    if (!periodId) {
      alert('Please select a pay period first.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/pay-statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId, rows }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Failed to generate pay statements:', text);
        alert('Failed to generate pay statements.');
        return;
      }

      alert('Pay statements generated successfully!');
    } catch (error) {
      console.error(error);
      alert('Something went wrong while generating pay statements.');
    } finally {
      setLoading(false);
    }
  }

  function updateRow<K extends keyof StaffPayRow>(
    index: number,
    field: K,
    value: StaffPayRow[K]
  ) {
    setRows((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };
      updated[index] = recalculateRow(current);
      return updated;
    });
  }

  function updateManualDeduction(
    index: number,
    field: DeductionField,
    value: number
  ) {
    const map = {
      federalTax: 'manualFederalTax',
      quebecTax: 'manualQuebecTax',
      ei: 'manualEi',
      qpp: 'manualQpp',
      qpp2: 'manualQpp2',
      qpip: 'manualQpip',
    } as const;

    setRows((prev) => {
      const updated = [...prev];
      const current = {
        ...updated[index],
        [field]: value,
        [map[field]]: true,
      } as StaffPayRow;

      updated[index] = recalculateRow(current);
      return updated;
    });
  }

  function resetSuggestedDeductions(index: number) {
    setRows((prev) => {
      const updated = [...prev];
      const current = {
        ...updated[index],
        manualFederalTax: false,
        manualQuebecTax: false,
        manualEi: false,
        manualQpp: false,
        manualQpp2: false,
        manualQpip: false,
      };
      updated[index] = recalculateRow(current);
      return updated;
    });
  }

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.deductions += safe(r.deductions);
        acc.gross += safe(r.grossEarnings);
        acc.net += safe(r.netEarnings);
        return acc;
      },
      { deductions: 0, gross: 0, net: 0 }
    );
  }, [rows]);

  function exportToExcel() {
    const data = rows.map((r) => ({
      "Staff ID": r.staffId,
      "Staff Name": r.staffName,
      "Regular Hours": r.regularHours,
      "Regular Rate": r.regularRate,
      "Regular Amount": r.regularAmount,
      "OT Hours": r.otHours,
      "OT Rate": r.otRate,
      "OT Amount": r.otAmount,
      Transport: r.transportAllowance,
      Federal: r.federalTax,
      Quebec: r.quebecTax,
      EI: r.ei,
      QPP: r.qpp,
      QPP2: r.qpp2,
      QPIP: r.qpip,
      Health: r.health,
      Other: r.other,
      Deductions: r.deductions,
      Gross: r.grossEarnings,
      Net: r.netEarnings,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Payroll");

    XLSX.writeFile(wb, `payroll_${periodStart || "data"}.xlsx`);
  }

  return (
    <Container fluid px="md" py="xl">
      <Title order={2} ta="center" mb="xl">
        Manage Pay Periods
      </Title>

      <Box maw={420} mx="auto" mb="xl">
        <Text fw={700} mb={6}>
          Period Start Date
        </Text>
        <Select
          value={periodId}
          onChange={setPeriodId}
          data={periodOptions}
          placeholder="Select period"
          nothingFoundMessage="No periods found"
        />
      </Box>

      <Card withBorder>
        <ScrollArea>
          <Table.ScrollContainer minWidth={2550}>
            <Table withTableBorder withColumnBorders striped>
              <Table.Thead>
                <Table.Tr>
                  <HeaderCell>Staff ID</HeaderCell>
                  <HeaderCell>Staff Name</HeaderCell>
                  <HeaderCell>Regular Hours</HeaderCell>
                  <HeaderCell>Regular Rate</HeaderCell>
                  <HeaderCell>Regular Amount</HeaderCell>
                  <HeaderCell>OT Hours</HeaderCell>
                  <HeaderCell>OT Rate</HeaderCell>
                  <HeaderCell>OT Amount</HeaderCell>
                  <HeaderCell>Transport</HeaderCell>
                  <HeaderCell>Federal</HeaderCell>
                  <HeaderCell>Quebec</HeaderCell>
                  <HeaderCell>EI</HeaderCell>
                  <HeaderCell>QPP</HeaderCell>
                  <HeaderCell>QPP2</HeaderCell>
                  <HeaderCell>QPIP</HeaderCell>
                  <HeaderCell>Health</HeaderCell>
                  <HeaderCell>Other</HeaderCell>
                  <HeaderCell>Reset</HeaderCell>
                  <HeaderCell>Deductions</HeaderCell>
                  <HeaderCell>Gross</HeaderCell>
                  <HeaderCell>Net</HeaderCell>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {rows.map((row, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>
                      <TextInput
                        value={row.staffId}
                        onChange={(e) =>
                          updateRow(i, 'staffId', e.currentTarget.value)
                        }
                      />
                    </Table.Td>

                    <Table.Td>
                      <TextInput
                        value={row.staffName}
                        onChange={(e) =>
                          updateRow(i, 'staffName', e.currentTarget.value)
                        }
                      />
                    </Table.Td>

                    <InputCell value={row.regularHours} onChange={(v) => updateRow(i, 'regularHours', v)} />
                    <InputCell value={row.regularRate} onChange={(v) => updateRow(i, 'regularRate', v)} />
                    <ReadOnlyCell value={row.regularAmount} />

                    <InputCell value={row.otHours} onChange={(v) => updateRow(i, 'otHours', v)} />
                    <InputCell value={row.otRate} onChange={(v) => updateRow(i, 'otRate', v)} />
                    <ReadOnlyCell value={row.otAmount} />

                    <InputCell value={row.transportAllowance} onChange={(v) => updateRow(i, 'transportAllowance', v)} />

                    <InputCell value={row.federalTax} onChange={(v) => updateManualDeduction(i, 'federalTax', v)} />
                    <InputCell value={row.quebecTax} onChange={(v) => updateManualDeduction(i, 'quebecTax', v)} />
                    <InputCell value={row.ei} onChange={(v) => updateManualDeduction(i, 'ei', v)} />
                    <InputCell value={row.qpp} onChange={(v) => updateManualDeduction(i, 'qpp', v)} />
                    <InputCell value={row.qpp2} onChange={(v) => updateManualDeduction(i, 'qpp2', v)} />
                    <InputCell value={row.qpip} onChange={(v) => updateManualDeduction(i, 'qpip', v)} />

                    <InputCell value={row.health} onChange={(v) => updateRow(i, 'health', v)} />
                    <InputCell value={row.other} onChange={(v) => updateRow(i, 'other', v)} />

                    <Table.Td>
                      <Button size="xs" onClick={() => resetSuggestedDeductions(i)}>
                        Reset
                      </Button>
                    </Table.Td>

                    <ReadOnlyCell value={row.deductions} />
                    <ReadOnlyCell value={row.grossEarnings} />
                    <ReadOnlyCell value={row.netEarnings} />
                  </Table.Tr>
                ))}

                <Table.Tr>
                  <Table.Td colSpan={18}>Totals</Table.Td>
                  <ReadOnlyCell value={totals.deductions} />
                  <ReadOnlyCell value={totals.gross} />
                  <ReadOnlyCell value={totals.net} />
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </ScrollArea>
      </Card>
      <Group mt="xl" gap="md"><Button mt="xl" leftSection={<IoDocumentTextOutline size={16} />} onClick={handleSubmit} loading={loading}>
        Generate Pay Statements
      </Button>
        <Button mt="xl" leftSection={<IoDownloadOutline size={16} />} onClick={exportToExcel} loading={loading}>
          Download Excel
        </Button></Group>

    </Container>
  );
}

// ===== Helpers =====

function recalculateRow(row: StaffPayRow): StaffPayRow {
  const regularAmount = round2(row.regularHours * row.regularRate);
  const otAmount = round2(row.otHours * row.otRate);
  const gross = round2(regularAmount + otAmount + row.transportAllowance);

  const payroll = calculateQuebecPayrollEstimate({
    grossPayPerPeriod: gross,
    payPeriodsPerYear: PAY_PERIODS_PER_YEAR,
    rrspPerPeriod: 0,
    otherPreTaxPerPeriod: 0,
    federalClaimAmountAnnual: DEFAULT_FEDERAL_CLAIM,
    quebecClaimAmountAnnual: DEFAULT_QUEBEC_CLAIM,
  });

  const federal = row.manualFederalTax ? row.federalTax : payroll.federalTaxPerPeriod;
  const quebec = row.manualQuebecTax ? row.quebecTax : payroll.quebecTaxPerPeriod;
  const ei = row.manualEi ? row.ei : payroll.eiCurrent;
  const qpp = row.manualQpp ? row.qpp : payroll.qppBaseFirstCurrent;
  const qpp2 = row.manualQpp2 ? row.qpp2 : payroll.qpp2Current;
  const qpip = row.manualQpip ? row.qpip : payroll.qpipCurrent;

  const deductions = round2(
    federal + quebec + ei + qpp + qpp2 + qpip + row.health + row.other
  );

  return {
    ...row,
    regularAmount,
    otAmount,
    grossEarnings: gross,
    federalTax: round2(federal),
    quebecTax: round2(quebec),
    ei: round2(ei),
    qpp: round2(qpp),
    qpp2: round2(qpp2),
    qpip: round2(qpip),
    deductions,
    netEarnings: round2(gross - deductions),
  };
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

function safe(v: number) {
  return Number.isFinite(v) ? v : 0;
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <Table.Th style={{ background: '#4ea72e', color: 'white', textAlign: 'center' }}>
      {children}
    </Table.Th>
  );
}

function InputCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Table.Td style={{ minWidth: 130 }}>
      <NumberInput
        value={value}
        onChange={(val) => onChange(toNumber(val))}
        hideControls
        decimalScale={2}
        styles={{
          input: {
            textAlign: 'right',
            minWidth: 100,
          },
        }}
      />
    </Table.Td>
  );
}

function ReadOnlyCell({ value, bg }: { value: number; bg?: string }) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return (
    <Table.Td
      style={{
        textAlign: 'right',
        fontWeight: 700,
        background: bg || 'transparent',
        minWidth: 130,
        whiteSpace: 'nowrap',
      }}
    >
      {safeValue.toFixed(2)}
    </Table.Td>
  );
}

