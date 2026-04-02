'use client';

import {
  Box,
  Button,
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

const PAY_PERIODS_PER_YEAR = 26;
const DEFAULT_FEDERAL_CLAIM = 16_452;
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

const initialRows: StaffPayRow[] = [
  {
    staffId: 'STF001',
    staffName: 'Upul Atapattu',
    regularHours: 80,
    regularRate: 18,
    regularAmount: 0,
    otHours: 10,
    otRate: 24,
    otAmount: 0,
    transportAllowance: 200,
    federalTax: 0,
    quebecTax: 0,
    ei: 0,
    qpp: 0,
    qpp2: 0,
    qpip: 0,
    health: 50,
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
  },
  {
    staffId: 'STF002',
    staffName: 'Vidarshan',
    regularHours: 75,
    regularRate: 20,
    regularAmount: 0,
    otHours: 5,
    otRate: 30,
    otAmount: 0,
    transportAllowance: 100,
    federalTax: 0,
    quebecTax: 0,
    ei: 0,
    qpp: 0,
    qpp2: 0,
    qpip: 0,
    health: 40,
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
  },
];

type DeductionField =
  | 'federalTax'
  | 'quebecTax'
  | 'ei'
  | 'qpp'
  | 'qpp2'
  | 'qpip';

export default function ManagePayPeriodsPage() {
  const [periodOptions, setPeriodOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [periodStart, setPeriodStart] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffPayRow[]>(
    initialRows.map((row) => recalculateRow(row))
  );
  const [loading, setLoading] = useState(false);

  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    async function loadPeriods() {
      try {
        const res = await fetch('/api/timesheet-periods');
        const allPeriods = await res.json();
        const now = new Date();

        const currentIndex = allPeriods.findIndex((p: any) => {
          const start = new Date(p.startDate);
          const end = new Date(p.endDate);
          return now >= start && now <= end;
        });

        if (currentIndex !== -1) {
          const startIdx = Math.max(0, currentIndex - 1);
          const endIdx = Math.min(allPeriods.length, currentIndex + 3);
          const relevant = allPeriods.slice(startIdx, endIdx);

          const options = relevant.map((p: any) => ({
            value: p.id,
            label: new Date(p.startDate)
              .toLocaleDateString('en-GB')
              .replace(/\//g, '-'),
          }));

          setPeriodOptions(options);
          setPeriodStart(options[1]?.value || options[0]?.value || null);
        }
      } catch (error) {
        console.error('Failed to load dynamic periods', error);
      }
    }

    loadPeriods();
  }, []);

  async function handleSubmit() {
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
      const current = {
        ...updated[index],
        [field]: value,
      };
      updated[index] = recalculateRow(current);
      return updated;
    });
  }

  function updateManualDeduction(
    index: number,
    field: DeductionField,
    value: number
  ) {
    const manualFlagMap: Record<DeductionField, keyof StaffPayRow> = {
      federalTax: 'manualFederalTax',
      quebecTax: 'manualQuebecTax',
      ei: 'manualEi',
      qpp: 'manualQpp',
      qpp2: 'manualQpp2',
      qpip: 'manualQpip',
    };

    const manualFlag = manualFlagMap[field];

    setRows((prev) => {
      const updated = [...prev];
      const current = {
        ...updated[index],
        [field]: value,
        [manualFlag]: true,
      } as StaffPayRow;

      updated[index] = recalculateRow(current);
      return updated;
    });
  }

  function resetSuggestedDeductions(index: number) {
    setRows((prev) => {
      const updated = [...prev];
      const current: StaffPayRow = {
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
      (acc, row) => {
        acc.federalTax += row.federalTax;
        acc.quebecTax += row.quebecTax;
        acc.ei += row.ei;
        acc.qpp += row.qpp;
        acc.qpp2 += row.qpp2;
        acc.qpip += row.qpip;
        acc.health += row.health;
        acc.other += row.other;
        acc.gross += row.grossEarnings;
        acc.deductions += row.deductions;
        acc.net += row.netEarnings;
        return acc;
      },
      {
        federalTax: 0,
        quebecTax: 0,
        ei: 0,
        qpp: 0,
        qpp2: 0,
        qpip: 0,
        health: 0,
        other: 0,
        gross: 0,
        deductions: 0,
        net: 0,
      }
    );
  }, [rows]);

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
          value={periodStart}
          onChange={setPeriodStart}
          data={periodOptions}
          placeholder="Select period"
          nothingFoundMessage="No periods found"
        />
      </Box>

      <Box mb="md" ta="center">
        <Text size="sm" c="dimmed">
          Quebec payroll fields are prefilled as suggested values and remain editable.
        </Text>
      </Box>

      <Card withBorder radius="md" p={isMobile ? 'sm' : 'md'}>
        <ScrollArea offsetScrollbars>
          <Table.ScrollContainer minWidth={2550}>
            <Table
              withTableBorder
              withColumnBorders
              striped
              highlightOnHover
              verticalSpacing="sm"
              horizontalSpacing="sm"
            >
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
                  <HeaderCell>Transport Allowance</HeaderCell>
                  <HeaderCell>Federal Tax</HeaderCell>
                  <HeaderCell>Quebec Tax</HeaderCell>
                  <HeaderCell>EI</HeaderCell>
                  <HeaderCell>QPP</HeaderCell>
                  <HeaderCell>QPP2</HeaderCell>
                  <HeaderCell>QPIP</HeaderCell>
                  <HeaderCell>Health</HeaderCell>
                  <HeaderCell>Other</HeaderCell>
                  <HeaderCell>Reset Suggested</HeaderCell>
                  <HeaderCell>Total Deductions</HeaderCell>
                  <HeaderCell>Gross Earnings</HeaderCell>
                  <HeaderCell>Net Earnings</HeaderCell>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {rows.map((row, index) => (
                  <Table.Tr key={`${row.staffId}-${index}`}>
                    <Table.Td style={{ minWidth: 140 }}>
                      <TextInput
                        value={row.staffId}
                        onChange={(e) =>
                          updateRow(index, 'staffId', e.currentTarget.value)
                        }
                      />
                    </Table.Td>

                    <Table.Td style={{ minWidth: 180 }}>
                      <TextInput
                        value={row.staffName}
                        onChange={(e) =>
                          updateRow(index, 'staffName', e.currentTarget.value)
                        }
                      />
                    </Table.Td>

                    <InputCell
                      value={row.regularHours}
                      onChange={(value) =>
                        updateRow(index, 'regularHours', toNumber(value))
                      }
                    />

                    <InputCell
                      value={row.regularRate}
                      onChange={(value) =>
                        updateRow(index, 'regularRate', toNumber(value))
                      }
                    />

                    <ReadOnlyCell value={row.regularAmount} />

                    <InputCell
                      value={row.otHours}
                      onChange={(value) =>
                        updateRow(index, 'otHours', toNumber(value))
                      }
                    />

                    <InputCell
                      value={row.otRate}
                      onChange={(value) =>
                        updateRow(index, 'otRate', toNumber(value))
                      }
                    />

                    <ReadOnlyCell value={row.otAmount} />

                    <InputCell
                      value={row.transportAllowance}
                      onChange={(value) =>
                        updateRow(index, 'transportAllowance', toNumber(value))
                      }
                    />

                    <InputCell
                      value={row.federalTax}
                      onChange={(value) =>
                        updateManualDeduction(
                          index,
                          'federalTax',
                          toNumber(value)
                        )
                      }
                    />

                    <InputCell
                      value={row.quebecTax}
                      onChange={(value) =>
                        updateManualDeduction(
                          index,
                          'quebecTax',
                          toNumber(value)
                        )
                      }
                    />

                    <InputCell
                      value={row.ei}
                      onChange={(value) =>
                        updateManualDeduction(index, 'ei', toNumber(value))
                      }
                    />

                    <InputCell
                      value={row.qpp}
                      onChange={(value) =>
                        updateManualDeduction(index, 'qpp', toNumber(value))
                      }
                    />

                    <InputCell
                      value={row.qpp2}
                      onChange={(value) =>
                        updateManualDeduction(index, 'qpp2', toNumber(value))
                      }
                    />

                    <InputCell
                      value={row.qpip}
                      onChange={(value) =>
                        updateManualDeduction(index, 'qpip', toNumber(value))
                      }
                    />

                    <InputCell
                      value={row.health}
                      onChange={(value) =>
                        updateRow(index, 'health', toNumber(value))
                      }
                    />

                    <InputCell
                      value={row.other}
                      onChange={(value) =>
                        updateRow(index, 'other', toNumber(value))
                      }
                    />

                    <Table.Td style={{ minWidth: 140, textAlign: 'center' }}>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => resetSuggestedDeductions(index)}
                      >
                        Reset
                      </Button>
                    </Table.Td>

                    <ReadOnlyCell value={row.deductions} bg="#f5c2c7" />
                    <ReadOnlyCell value={row.grossEarnings} bg="#b7d7f7" />
                    <ReadOnlyCell value={row.netEarnings} bg="#b7e1a1" />
                  </Table.Tr>
                ))}

                <Table.Tr>
                  <Table.Td
                    colSpan={18}
                    style={{
                      textAlign: 'right',
                      fontWeight: 800,
                      background: '#4ea72e',
                      color: 'white',
                    }}
                  >
                    Totals
                  </Table.Td>

                  <ReadOnlyCell value={totals.deductions} bg="#f5c2c7" />
                  <ReadOnlyCell value={totals.gross} bg="#b7d7f7" />
                  <ReadOnlyCell value={totals.net} bg="#8fd16b" />
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </ScrollArea>
      </Card>

      <Box
        mt="xl"
        style={{
          display: 'flex',
          justifyContent: isMobile ? 'stretch' : 'flex-end',
        }}
      >
        <Button
          color="green.7"
          size="lg"
          fullWidth={isMobile}
          loading={loading}
          onClick={handleSubmit}
        >
          Generate Pay Statements
        </Button>
      </Box>
    </Container>
  );
}

function recalculateRow(row: StaffPayRow): StaffPayRow {
  const regularAmount = round2(row.regularHours * row.regularRate);
  const otAmount = round2(row.otHours * row.otRate);
  const grossEarnings = round2(
    regularAmount + otAmount + row.transportAllowance
  );

  const payroll = calculateQuebecPayrollEstimate({
    grossPayPerPeriod: grossEarnings,
    payPeriodsPerYear: PAY_PERIODS_PER_YEAR,
    rrspPerPeriod: 0,
    otherPreTaxPerPeriod: 0,
    federalClaimAmountAnnual: DEFAULT_FEDERAL_CLAIM,
    quebecClaimAmountAnnual: DEFAULT_QUEBEC_CLAIM,
    ytdPensionableEarnings: 0,
    ytdEiInsurableEarnings: 0,
    ytdQpipInsurableEarnings: 0,
    ytdQppBaseFirstEmployee: 0,
    ytdQpp2Employee: 0,
    ytdEiEmployee: 0,
    ytdQpipEmployee: 0,
    additionalFederalTaxPerPeriod: 0,
    additionalQuebecTaxPerPeriod: 0,
  });

  const suggestedFederalTax = round2(payroll.federalTaxPerPeriod);
  const suggestedQuebecTax = round2(payroll.quebecTaxPerPeriod);
  const suggestedEi = round2(payroll.eiCurrent);
  const suggestedQpp = round2(payroll.qppBaseFirstCurrent);
  const suggestedQpp2 = round2(payroll.qpp2Current);
  const suggestedQpip = round2(payroll.qpipCurrent);

  const federalTax = row.manualFederalTax
    ? row.federalTax
    : suggestedFederalTax;
  const quebecTax = row.manualQuebecTax
    ? row.quebecTax
    : suggestedQuebecTax;
  const ei = row.manualEi ? row.ei : suggestedEi;
  const qpp = row.manualQpp ? row.qpp : suggestedQpp;
  const qpp2 = row.manualQpp2 ? row.qpp2 : suggestedQpp2;
  const qpip = row.manualQpip ? row.qpip : suggestedQpip;

  const deductions = round2(
    federalTax +
      quebecTax +
      ei +
      qpp +
      qpp2 +
      qpip +
      row.health +
      row.other
  );

  const netEarnings = round2(grossEarnings - deductions);

  return {
    ...row,
    regularAmount,
    otAmount,
    grossEarnings,
    federalTax,
    quebecTax,
    ei,
    qpp,
    qpp2,
    qpip,
    deductions,
    netEarnings,
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <Table.Th
      style={{
        color: 'white',
        textAlign: 'center',
        minWidth: 120,
        background: '#4ea72e',
        whiteSpace: 'nowrap',
      }}
    >
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
      {value.toFixed(2)}
    </Table.Td>
  );
}
