'use client';

import {
  Box,
  Container,
  NumberInput,
  Select,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useMemo, useState } from 'react';

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

const periodOptions = [
  { value: '2026-02-15', label: '15-02-2026' },
  { value: '2026-03-01', label: '01-03-2026' },
];

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
  const [periodStart, setPeriodStart] = useState<string | null>('2026-02-15');
  const [rows, setRows] = useState<StaffPayRow[]>(initialRows);

  function recalculateRow(row: StaffPayRow): StaffPayRow {
    const regularAmount = row.regularHours * row.regularRate;
    const otAmount = row.otHours * row.otRate;

    const grossEarnings = regularAmount + otAmount + row.transportAllowance;

    const deductions =
      row.federalTax + row.ei + row.cpp + row.health + row.other;

    const netEarnings = grossEarnings - deductions;

    return {
      ...row,
      regularAmount,
      otAmount,
      grossEarnings,
      deductions,
      netEarnings,
    };
  }

  function updateRow<K extends keyof StaffPayRow>(
    index: number,
    field: K,
    value: StaffPayRow[K],
  ) {
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
      { gross: 0, deductions: 0, net: 0 },
    );
  }, [rows]);

  return (
    <Container size="xl" py="xl">
      <Title order={2} ta="center" mb="xl">
        Manage Pay Periods
      </Title>

      <Box maw={420} mx="auto" mb="xl">
        <Text fw={700} mb={6}>
          Period Start Date
        </Text>
        <Select
          value={periodStart}
          onChange={setPeriodStart}
          data={periodOptions}
          placeholder="Select period"
        />
      </Box>

      <Box style={{ width: '100%', maxWidth: 1400, margin: '0 auto' }}>
        <Table
          withTableBorder
          withColumnBorders
          striped
          highlightOnHover
          style={{ minWidth: 1600 }}
        >
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
                <CellText>{row.staffId}</CellText>
                <CellText>{row.staffName}</CellText>

                <InputCell
                  value={row.regularHours}
                  onChange={(value) =>
                    updateRow(index, 'regularHours', Number(value || 0))
                  }
                />
                <InputCell
                  value={row.regularRate}
                  onChange={(value) =>
                    updateRow(index, 'regularRate', Number(value || 0))
                  }
                />
                <ReadOnlyCell value={row.regularAmount} />

                <InputCell
                  value={row.otHours}
                  onChange={(value) =>
                    updateRow(index, 'otHours', Number(value || 0))
                  }
                />
                <InputCell
                  value={row.otRate}
                  onChange={(value) =>
                    updateRow(index, 'otRate', Number(value || 0))
                  }
                />
                <ReadOnlyCell value={row.otAmount} />

                <InputCell
                  value={row.transportAllowance}
                  onChange={(value) =>
                    updateRow(index, 'transportAllowance', Number(value || 0))
                  }
                />

                <InputCell
                  value={row.federalTax}
                  onChange={(value) =>
                    updateRow(index, 'federalTax', Number(value || 0))
                  }
                />
                <InputCell
                  value={row.ei}
                  onChange={(value) =>
                    updateRow(index, 'ei', Number(value || 0))
                  }
                />
                <InputCell
                  value={row.cpp}
                  onChange={(value) =>
                    updateRow(index, 'cpp', Number(value || 0))
                  }
                />
                <InputCell
                  value={row.health}
                  onChange={(value) =>
                    updateRow(index, 'health', Number(value || 0))
                  }
                />
                <InputCell
                  value={row.other}
                  onChange={(value) =>
                    updateRow(index, 'other', Number(value || 0))
                  }
                />

                <ReadOnlyCell value={row.deductions} bg="#d9f0c7" />
                <ReadOnlyCell value={row.grossEarnings} bg="#d9f0c7" />
                <ReadOnlyCell value={row.netEarnings} bg="#d9f0c7" />
              </Table.Tr>
            ))}

            <Table.Tr fw={700}>
              <Table.Td colSpan={14}>
                <Text fw={800}>Totals</Text>
              </Table.Td>
              <ReadOnlyCell value={totals.gross} bg="#b7e1a1" />
              <ReadOnlyCell value={totals.deductions} bg="#b7e1a1" />
              <ReadOnlyCell value={totals.net} bg="#8fd16b" />
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Box>
    </Container>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <Table.Th
      style={{
        color: 'white',
        textAlign: 'center',
        minWidth: 110,
        background: '#4ea72e',
      }}
    >
      {children}
    </Table.Th>
  );
}

function CellText({ children }: { children: React.ReactNode }) {
  return (
    <Table.Td style={{ textAlign: 'center', minWidth: 110 }}>
      {children}
    </Table.Td>
  );
}

function InputCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: string | number) => void;
}) {
  return (
    <Table.Td style={{ minWidth: 110 }}>
      <NumberInput
        value={value}
        onChange={onChange}
        hideControls
        decimalScale={2}
      />
    </Table.Td>
  );
}

function ReadOnlyCell({ value, bg }: { value: number; bg?: string }) {
  return (
    <Table.Td
      style={{
        textAlign: 'right',
        fontWeight: 700,
        background: bg || 'transparent',
        minWidth: 110,
      }}
    >
      {value.toFixed(2)}
    </Table.Td>
  );
}
