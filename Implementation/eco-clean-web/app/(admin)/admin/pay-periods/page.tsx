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
import * as XLSX from "xlsx";
import { IoDownloadOutline, IoDocumentTextOutline } from "react-icons/io5";

import {
  calculatePayroll
} from "@/lib/payroll/calculatePayroll";

const PAY_PERIODS_PER_YEAR = 26;

// ================= TYPES =================

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
  | 'federalTax'
  | 'quebecTax'
  | 'ei'
  | 'qpp'
  | 'qpp2'
  | 'qpip';

// ================= PAGE =================

export default function ManagePayPeriodsPage() {
  const [periodOptions, setPeriodOptions] = useState<any[]>([]);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffPayRow[]>([]);
  const [loading, setLoading] = useState(false);

  const isMobile = useMediaQuery('(max-width: 768px)');

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

  // ===== Load periods =====
  useEffect(() => {
    async function loadPeriods() {
      const res = await fetch('/api/admin/timesheets/periods');
      const data = await res.json();

      const today = new Date();

      const pastPeriods = data
        .filter((p: any) => new Date(p.endDate) < today) // ✅ only past
        .sort(
          (a: any, b: any) =>
            new Date(b.endDate).getTime() - new Date(a.endDate).getTime() // ✅ latest first
        ).slice(0, 5);

      const options = pastPeriods.map((p: any) => ({
        value: p.id,
        label: `${new Date(p.startDate).toLocaleDateString()} - ${new Date(p.endDate).toLocaleDateString()}`
      }));

      setPeriodOptions(options);

      // ✅ AUTO SELECT LATEST
      if (options.length > 0) {
        setPeriodId(options[0].value);
      }
    }

    loadPeriods();
  }, []);

  // ===== Load staff payroll =====
  useEffect(() => {
    async function loadPayData() {
      const res = await fetch(`/api/admin/staff-payroll?periodId=${periodId}`);
      const data = await res.json();

      const mapped = data.map((row: any): StaffPayRow => ({
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
      }));

      setRows(mapped.map(recalculateRow));
    }

    loadPayData();
  }, [periodId]);

  // ===== UPDATE =====
  function updateRow<K extends keyof StaffPayRow>(
    index: number,
    field: K,
    value: StaffPayRow[K]
  ) {
    setRows(prev => {
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

    setRows(prev => {
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
    setRows(prev => {
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

  // ===== TOTALS =====
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.gross += r.grossEarnings || 0;
        acc.deductions += r.deductions || 0;
        acc.net += r.netEarnings || 0;
        return acc;
      },
      { gross: 0, deductions: 0, net: 0 }
    );
  }, [rows]);

  // ===== EXPORT =====
  function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    XLSX.writeFile(wb, "payroll.xlsx");
  }

  // ===== UI =====
  return (
    <Container fluid px="md" py="xl">
      <Title ta="center" mb="xl">Manage Pay Periods</Title>

      <Select
        value={periodId}
        onChange={setPeriodId}
        data={periodOptions}
        placeholder="Select period"
      />

      <Card mt="xl">
        <ScrollArea
          h={500} // 👈 vertical scroll height
          type="auto"
        >
          <Table.ScrollContainer minWidth={2200}> {/* 👈 horizontal scroll */}
            <Table withTableBorder withColumnBorders striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Staff ID</Table.Th>
                  <Table.Th>Staff Name</Table.Th>

                  <Table.Th>Regular Hours</Table.Th>
                  <Table.Th>Regular Rate</Table.Th>
                  <Table.Th>Regular Amount</Table.Th>

                  <Table.Th>OT Hours</Table.Th>
                  <Table.Th>OT Rate</Table.Th>
                  <Table.Th>OT Amount</Table.Th>

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
                {rows.map((row, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>{row.staffId}</Table.Td>
                    <Table.Td>{row.staffName}</Table.Td>

                    <Table.Td>
                      <NumberInput value={row.regularHours} min={0}
                        onChange={(v) => updateRow(i, 'regularHours', Number(v))} />
                    </Table.Td>

                    <Table.Td>
                      <NumberInput value={row.regularRate} min={0}
                        onChange={(v) => updateRow(i, 'regularRate', Number(v))} />
                    </Table.Td>

                    <Table.Td>{row.regularAmount.toFixed(2)}</Table.Td>

                    <Table.Td>
                      <NumberInput value={row.otHours} min={0}
                        onChange={(v) => updateRow(i, 'otHours', Number(v))} />
                    </Table.Td>

                    <Table.Td>
                      <NumberInput value={row.otRate} min={0}
                        onChange={(v) => updateRow(i, 'otRate', Number(v))} />
                    </Table.Td>

                    <Table.Td>{row.otAmount.toFixed(2)}</Table.Td>
                    <Table.Td>
                      <NumberInput value={row.transportAllowance} min={0}
                        onChange={(v) => updateRow(i, 'transportAllowance', Number(v))} />
                    </Table.Td>

                    <Table.Td>
                      <NumberInput value={row.federalTax}
                        onChange={(v) => updateManualDeduction(i, 'federalTax', Number(v))} />
                    </Table.Td>

                    <Table.Td>
                      <NumberInput value={row.quebecTax}
                        onChange={(v) => updateManualDeduction(i, 'quebecTax', Number(v))} />
                    </Table.Td>

                    <Table.Td>
                      <NumberInput value={row.ei}
                        onChange={(v) => updateManualDeduction(i, 'ei', Number(v))} />
                    </Table.Td>

                    <Table.Td>
                      <NumberInput value={row.qpp}
                        onChange={(v) => updateManualDeduction(i, 'qpp', Number(v))} />
                    </Table.Td>

                    <Table.Td>
                      <NumberInput value={row.qpp2}
                        onChange={(v) => updateManualDeduction(i, 'qpp2', Number(v))} />
                    </Table.Td>

                    <Table.Td>
                      <NumberInput value={row.qpip}
                        onChange={(v) => updateManualDeduction(i, 'qpip', Number(v))} />
                    </Table.Td>

                    <Table.Td>
                      <NumberInput value={row.health}
                        onChange={(v) => updateRow(i, 'health', Number(v))} />
                    </Table.Td>

                    <Table.Td>
                      <NumberInput value={row.other}
                        onChange={(v) => updateRow(i, 'other', Number(v))} />
                    </Table.Td>

                    <Table.Td>
                      <Button size="xs" onClick={() => resetSuggestedDeductions(i)}>
                        Reset
                      </Button>
                    </Table.Td>

                    <Table.Td>{row.deductions.toFixed(2)}</Table.Td>
                    <Table.Td>{row.grossEarnings.toFixed(2)}</Table.Td>
                    <Table.Td>{row.netEarnings.toFixed(2)}</Table.Td>
                  </Table.Tr>





                ))}
                <Table.Tr>
                  <Table.Td colSpan={18}>Totals</Table.Td>

                  <Table.Td>{totals.deductions.toFixed(2)}</Table.Td>
                  <Table.Td>{totals.gross.toFixed(2)}</Table.Td>
                  <Table.Td>{totals.net.toFixed(2)}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

        </ScrollArea>
      </Card>

      <Group mt="xl" gap="md" justify="flex-end">
        <Button
          leftSection={<IoDocumentTextOutline />}
          onClick={handleSubmit}
          loading={loading}
        >
          Generate Pay Statements
        </Button>

        <Button
          leftSection={<IoDownloadOutline />}
          onClick={exportToExcel}
        >
          Download Excel
        </Button>
      </Group>
    </Container>
  );
}

// ================= CALC =================

function recalculateRow(row: StaffPayRow): StaffPayRow {
  const regularAmount = row.regularHours * row.regularRate;
  const otAmount = row.otHours * row.otRate;

  const gross =
    regularAmount +
    otAmount +
    (row.transportAllowance ?? 0);

  // 🔥 Call central payroll engine
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

  // 🔥 Add extra deductions (not part of payroll engine)
  const extraDeductions = (row.health ?? 0) + (row.other ?? 0);

  const totalDeductions = result.totalDeductions + extraDeductions;
  const net = gross - totalDeductions;

  // 🔍 DEBUG (this will now ALWAYS run)
  console.log("PAYROLL DEBUG", {
    gross,
    result,
    extraDeductions,
    totalDeductions,
    net,
  });

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