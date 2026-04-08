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
import { IoDownload } from 'react-icons/io5';
import Image from 'next/image';

export default function PayStubPage() {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [statement, setStatement] = useState<any>(null);
  const latest = statement?.latest || {};
const employeeName = statement?.employeeName || "N/A";
const employeeId = statement?.employeeId || "N/A";


  useEffect(() => {
    async function load() {
      const res = await fetch('/api/staff/pay-statements/latest');
      const data = await res.json();
      setStatement(data);
    }
    load();
  }, []);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;

    const canvas = await html2canvas(pdfRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth() - 20;
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(imgData, 'PNG', 10, 10, width, height);
pdf.save(`pay-stub-${latest.payDate}.pdf`);  };

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
          leftSection={<IoDownload />}
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
              Pay Period: {new Date(latest.payPeriodStart).toLocaleDateString()} -{' '}
              {new Date(latest.payPeriodEnd).toLocaleDateString()}
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
              <Text><b>Pay Date:</b> {new Date(latest.payDate).toLocaleDateString()}</Text>
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
              <Text ta="right">{latest.netEarnings.toFixed(2)}</Text>
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

function TableRow({ label, rate, units, amount, ytd }: any) {
  return (
    <Box style={{ borderBottom: '1px solid #ccc' }} py={4}>
      <Grid>
        <Grid.Col span={6}>
          <Text>{label}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text ta="right">{amount?.toFixed?.(2) || '0.00'}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text ta="right">{ytd?.toFixed?.(2) || ''}</Text>
        </Grid.Col>
      </Grid>
    </Box>
  );
}

function TableTotal({ label, amount, ytd }: any) {
  return (
    <Box mt="xs" style={{ borderTop: '2px solid black', borderBottom: '2px solid black' }}>
      <Grid>
        <Grid.Col span={6}>
          <Text fw={700}>{label}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text fw={700} ta="right">{amount?.toFixed?.(2)}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text fw={700} ta="right">{ytd?.toFixed?.(2)}</Text>
        </Grid.Col>
      </Grid>
    </Box>
  );
}