'use client';

import {
  Box,
  Button,
  Container,
  NumberInput,
  Select,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useMemo, useState, useEffect } from 'react'; // Fixed imports

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
  ei: number;
  cpp: number;
  health: number;
  other: number;
  grossEarnings: number;
  deductions: number;
  netEarnings: number;
};

const initialRows: StaffPayRow[] = [
  {
    staffId: 'STF001',
    staffName: 'Upul Atapattu',
    regularHours: 80,
    regularRate: 18,
    regularAmount: 1440,
    otHours: 10,
    otRate: 24,
    otAmount: 240,
    transportAllowance: 200,
    federalTax: 100,
    ei: 50,
    cpp: 50,
    health: 50,
    other: 0,
    grossEarnings: 1880,
    deductions: 250,
    netEarnings: 1630,
  },
  {
    staffId: 'STF002',
    staffName: 'Vidarshan',
    regularHours: 75,
    regularRate: 20,
    regularAmount: 1500,
    otHours: 5,
    otRate: 30,
    otAmount: 150,
    transportAllowance: 100,
    federalTax: 120,
    ei: 55,
    cpp: 60,
    health: 40,
    other: 0,
    grossEarnings: 1750,
    deductions: 275,
    netEarnings: 1475,
  },
];

export default function ManagePayPeriodsPage() {
  const [periodOptions, setPeriodOptions] = useState<{ value: string; label: string }[]>([]);
  const [periodStart, setPeriodStart] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffPayRow[]>(initialRows);
  const [loading, setLoading] = useState(false);

  // Dynamic Period Calculation
  useEffect(() => {
    async function loadPeriods() {
      try {
        const res = await fetch('/api/timesheet-periods');
        const allPeriods = await res.json();
        const now = new Date();

        // Find current period
        const currentIndex = allPeriods.findIndex((p: any) => {
          const start = new Date(p.startDate);
          const end = new Date(p.endDate);
          return now >= start && now <= end;
        });

        if (currentIndex !== -1) {
          // Window: -1 (prev), current, +1, +2
          const startIdx = Math.max(0, currentIndex - 1);
          const endIdx = Math.min(allPeriods.length, currentIndex + 3);
          const relevant = allPeriods.slice(startIdx, endIdx);

          const options = relevant.map((p: any) => ({
            value: p.id,
            label: new Date(p.startDate).toLocaleDateString('en-GB').replace(/\//g, '-')
          }));

          setPeriodOptions(options);
          // Default to the current period (usually index 1 in our sliced array)
          setPeriodStart(options[1]?.value || options[0].value);
        }
      } catch (error) {
        console.error("Failed to load dynamic periods", error);
      }
    }
    loadPeriods();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/pay-statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodStart, rows }),
      });

      if (response.ok) {
        alert('Pay statements generated successfully!');
      } else {
        alert('Failed to generate pay statements.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  function recalculateRow(row: StaffPayRow): StaffPayRow {
    const regularAmount = row.regularHours * row.regularRate;
    const otAmount = row.otHours * row.otRate;
    const grossEarnings = regularAmount + otAmount + row.transportAllowance;
    const deductions = row.federalTax + row.ei + row.cpp + row.health + row.other;
    const netEarnings = grossEarnings - deductions;

    return { ...row, regularAmount, otAmount, grossEarnings, deductions, netEarnings };
  }

  function updateRow<K extends keyof StaffPayRow>(index: number, field: K, value: StaffPayRow[K]) {
    setRows((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };
      updated[index] = recalculateRow(current);
      return updated;
    });
  }

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.gross += row.grossEarnings;
        acc.deductions += row.deductions;
        acc.net += row.netEarnings;
        return acc;
      },
      { gross: 0, deductions: 0, net: 0 }
    );
  }, [rows]);

  return (
    <Container size="xl" py="xl">
      <Title order={2} ta="center" mb="xl">Manage Pay Periods</Title>

      <Box maw={420} mx="auto" mb="xl">
        <Text fw={700} mb={6}>Period Start Date</Text>
        <Select
          value={periodStart}
          onChange={setPeriodStart}
          data={periodOptions}
          placeholder="Select period"
          nothingFoundMessage="No periods found"
        />
      </Box>

      <Box style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
        <Table withTableBorder withColumnBorders striped highlightOnHover style={{ width: 'auto' }}>
          <Table.Thead>
            <Table.Tr bg="green.7">
              <HeaderCell>Staff ID</HeaderCell>
              <HeaderCell>Staff Name</HeaderCell>
              <HeaderCell>Regular Hours</HeaderCell>
              <HeaderCell>Regular Rate</HeaderCell>
              <HeaderCell>Regular Amount</HeaderCell>
              <HeaderCell>OT Hours</HeaderCell>
              <HeaderCell>OT Rate</HeaderCell>
              <HeaderCell>OT Amount</HeaderCell>
              <HeaderCell>Transport Allowance</HeaderCell>
              <HeaderCell>Federal Tax</HeaderCell>
              <HeaderCell>EI</HeaderCell>
              <HeaderCell>CPP</HeaderCell>
              <HeaderCell>Health</HeaderCell>
              <HeaderCell>Other</HeaderCell>
              <HeaderCell>Total Deductions</HeaderCell>
              <HeaderCell>Gross Earnings</HeaderCell>
              <HeaderCell>Net Earnings</HeaderCell>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {rows.map((row, index) => (
              <Table.Tr key={row.staffId}>
                <InputCell type="text" value={row.staffId} onChange={(val) => updateRow(index, 'staffId', String(val))} />
                <CellText>{row.staffName}</CellText>
                <InputCell value={row.regularHours} onChange={(val) => updateRow(index, 'regularHours', Number(val || 0))} />
                <InputCell value={row.regularRate} onChange={(val) => updateRow(index, 'regularRate', Number(val || 0))} />
                <ReadOnlyCell value={row.regularAmount} />
                <InputCell value={row.otHours} onChange={(val) => updateRow(index, 'otHours', Number(val || 0))} />
                <InputCell value={row.otRate} onChange={(val) => updateRow(index, 'otRate', Number(val || 0))} />
                <ReadOnlyCell value={row.otAmount} />
                <InputCell value={row.transportAllowance} onChange={(val) => updateRow(index, 'transportAllowance', Number(val || 0))} />
                <InputCell value={row.federalTax} onChange={(val) => updateRow(index, 'federalTax', Number(val || 0))} />
                <InputCell value={row.ei} onChange={(val) => updateRow(index, 'ei', Number(val || 0))} />
                <InputCell value={row.cpp} onChange={(val) => updateRow(index, 'cpp', Number(val || 0))} />
                <InputCell value={row.health} onChange={(val) => updateRow(index, 'health', Number(val || 0))} />
                <InputCell value={row.other} onChange={(val) => updateRow(index, 'other', Number(val || 0))} />
                <ReadOnlyCell value={row.deductions} bg="#d9f0c7" />
                <ReadOnlyCell value={row.grossEarnings} bg="#d9f0c7" />
                <ReadOnlyCell value={row.netEarnings} bg="#d9f0c7" />
              </Table.Tr>
            ))}

            <Table.Tr fw={700}>
              <Table.Td colSpan={14}><Text fw={800}>Totals</Text></Table.Td>
              <ReadOnlyCell value={totals.deductions} bg="#b7e1a1" />
              <ReadOnlyCell value={totals.gross} bg="#b7e1a1" />
              <ReadOnlyCell value={totals.net} bg="#8fd16b" />
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Box>

      <Box display="flex" style={{ justifyContent: 'flex-end' }} mt="xl">
        <Button color="green.7" size="lg" loading={loading} onClick={handleSubmit}>
          Generate Pay Statements
        </Button>
      </Box>
    </Container>
  );
}

// --- Helper Components ---

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <Table.Th style={{ color: 'white', textAlign: 'center', minWidth: 110, background: '#4ea72e' }}>
      {children}
    </Table.Th>
  );
}

function CellText({ children }: { children: React.ReactNode }) {
  return <Table.Td style={{ textAlign: 'center', minWidth: 110 }}>{children}</Table.Td>;
}

function InputCell({ value, onChange, type = 'number' }: { value: string | number; onChange: (value: string | number) => void; type?: 'text' | 'number'; }) {
  return (
    <Table.Td style={{ minWidth: 110 }}>
      {type === 'number' ? (
        <NumberInput value={value as number} onChange={onChange} hideControls decimalScale={2} styles={{ input: { textAlign: 'right' } }} />
      ) : (
        <TextInput value={value as string} onChange={(e) => onChange(e.currentTarget.value)} />
      )}
    </Table.Td>
  );
}

function ReadOnlyCell({ value, bg }: { value: number; bg?: string }) {
  return (
    <Table.Td style={{ textAlign: 'right', fontWeight: 700, background: bg || 'transparent', minWidth: 110 }}>
      {value.toFixed(2)}
    </Table.Td>
  );
}
