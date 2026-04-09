'use client';

import {
  Box,
  Button,
  Container,
  Text,
  Title,
  Grid,
  Group
} from '@mantine/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useParams } from "next/navigation";

type PayBreakdown = {
  regularRate?: number;
  regularHours?: number;
  regularAmount?: number;
  otRate?: number;
  otHours?: number;
  otAmount?: number;
  transportAllowance?: number;
  federalTax?: number;
  quebecTax?: number;
  ei?: number;
  qpp?: number;
  qpp2?: number;
  qpip?: number;
};

type PayStatementDetail = {
  employeeName?: string;
  employeeId?: string;
  payPeriodStart?: string;
  payPeriodEnd?: string;
  payDate?: string;
  grossEarnings?: number;
  totalDeductions?: number;
  netEarnings?: number;
  breakdown?: PayBreakdown;
  ytd?: {
    regular?: number;
    overtime?: number;
    allowance?: number;
    federalTax?: number;
    quebecTax?: number;
    ei?: number;
    qpp?: number;
    qpp2?: number;
    qpip?: number;
    gross?: number;
    deductions?: number;
    net?: number;
  };
};

type StatementRow = {
  label: string;
  amount?: number;
  ytd?: number;
};

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

function formatAmount(value?: number) {
  return (value ?? 0).toFixed(2);
}

export default function PayStubPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const pdfRef = useRef<HTMLDivElement>(null);
  const [statement, setStatement] = useState<PayStatementDetail | null>(null);
  const latest = statement || {};
  const employeeName = statement?.employeeName || "N/A";
  const employeeId = statement?.employeeId || "N/A";


  useEffect(() => {
    if (!id) return;

    async function load() {
      const res = await fetch(`/api/staff/pay-statements/${id}`);
      const data = await res.json();
      setStatement(data);
    }
    load();
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;

    const canvas = await html2canvas(pdfRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth() - 20;
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(imgData, 'PNG', 10, 10, width, height);
    pdf.save(`pay-stub-${latest.payDate ?? 'statement'}.pdf`);
  };

  if (!statement) return <Text>Loading...</Text>;

  const b = latest.breakdown || {};
  const ytd = statement.ytd || {};

  const rows = [
    {
      label: 'Regular',
      rate: b.regularRate,
      units: b.regularHours,
      amount: b.regularAmount,
      ytd: ytd.regular,
    },
    {
      label: 'Overtime',
      rate: b.otRate,
      units: b.otHours,
      amount: b.otAmount,
      ytd: ytd.overtime,
    },
    {
      label: 'Transport',
      rate: '',
      units: '',
      amount: b.transportAllowance,
      ytd: ytd.allowance,
    },
  ];

  const deductions = [
    { label: 'Federal Tax', amount: b.federalTax, ytd: ytd.federalTax },
    { label: 'Quebec Tax', amount: b.quebecTax, ytd: ytd.quebecTax },
    { label: 'EI', amount: b.ei, ytd: ytd.ei },
    { label: 'QPP', amount: b.qpp, ytd: ytd.qpp },
    { label: 'QPP2', amount: b.qpp2, ytd: ytd.qpp2 },
    { label: 'QPIP', amount: b.qpip, ytd: ytd.qpip },
  ];

  return (
    <Container py="xl">
      <Group justify="center" mb="md">
        <Button
          onClick={handleDownloadPdf}
        >
          Download PDF
        </Button>
      </Group>

      <Box ref={pdfRef} p="lg" bg="white" mt="md" style={{ border: '1px solid black' }}>

        {/* HEADER */}
        <Grid mb="md">
          <Grid.Col span={3}>
            <Image src="/logo.png" alt="logo" width={80} height={80} />
          </Grid.Col>

          <Grid.Col span={9}>
            <Title order={3}>STATEMENT OF EARNINGS</Title>
            <Text size="sm">
              Pay Period: {formatDate(latest.payPeriodStart)} -{' '}
              {formatDate(latest.payPeriodEnd)}
            </Text>
          </Grid.Col>
        </Grid>

        {/* EMPLOYEE INFO */}
        <Box mb="md" p="sm" style={{ border: '1px solid black' }}>
          <Grid>
            <Grid.Col span={6}>
              <Text><b>Employee:</b> {employeeName}</Text>
              <Text><b>Employee ID:</b> {employeeId}</Text>
            </Grid.Col>

            <Grid.Col span={6}>
              <Text><b>Pay Date:</b> {formatDate(latest.payDate)}</Text>
              <Text><b>Department:</b> Cleaning Services</Text>
            </Grid.Col>
          </Grid>
        </Box>

        {/* EARNINGS TABLE */}
        <TableHeader title="Earnings" />

        {rows.map((r) => (
          <TableRow key={r.label} {...r} />
        ))}

        <TableTotal
          label="Gross Earnings"
          amount={latest.grossEarnings}
          ytd={ytd.gross}
        />

        {/* DEDUCTIONS */}
        <TableHeader title="Deductions" />

        {deductions.map((d) => (
          <TableRow key={d.label} label={d.label} amount={d.amount} ytd={d.ytd} />
        ))}

        <TableTotal
          label="Total Deductions"
          amount={latest.totalDeductions}
          ytd={ytd.deductions}
        />

        {/* NET */}
        <Box mt="md" p="sm" style={{ border: '2px solid black', background: '#d4edda' }}>
          <Grid>
            <Grid.Col span={6}>
              <Text fw={700}>Net Earnings</Text>
            </Grid.Col>
            <Grid.Col span={3}>
              <Text ta="right">{formatAmount(latest.netEarnings)}</Text>
            </Grid.Col>
            <Grid.Col span={3}>
              <Text ta="right">{ytd.net?.toFixed(2)}</Text>
            </Grid.Col>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
}

/* ---------- COMPONENTS ---------- */

function TableHeader({ title }: { title: string }) {
  return (
    <Box mt="md" style={{ borderBottom: '2px solid black' }}>
      <Grid>
        <Grid.Col span={6}><Text fw={700}>{title}</Text></Grid.Col>
        <Grid.Col span={2}><Text ta="right">Amount</Text></Grid.Col>
        <Grid.Col span={2}><Text ta="right">YTD</Text></Grid.Col>
      </Grid>
    </Box>
  );
}

function TableRow({ label, amount, ytd }: StatementRow) {
  return (
    <Box style={{ borderBottom: '1px solid #ccc' }} py={4}>
      <Grid>
        <Grid.Col span={6}>
          <Text>{label}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text ta="right">{formatAmount(amount)}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text ta="right">{ytd !== undefined ? formatAmount(ytd) : ''}</Text>
        </Grid.Col>
      </Grid>
    </Box>
  );
}

function TableTotal({ label, amount, ytd }: StatementRow) {
  return (
    <Box mt="xs" style={{ borderTop: '2px solid black', borderBottom: '2px solid black' }}>
      <Grid>
        <Grid.Col span={6}>
          <Text fw={700}>{label}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text fw={700} ta="right">{formatAmount(amount)}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text fw={700} ta="right">{ytd !== undefined ? formatAmount(ytd) : ''}</Text>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
