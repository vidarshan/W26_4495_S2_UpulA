'use client';

import {
  Box,
  Button,
  Container,
  Group,
  Text,
  Title,
} from '@mantine/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useEffect, useRef, useState } from 'react';
import { IoDownloadOutline } from 'react-icons/io5';
import Image from 'next/image';

export default function PayStubPage() {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [statement, setStatement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch latest pay statement
  useEffect(() => {
    async function loadPayStub() {
      try {
        const res = await fetch('/api/staff/me/pay-statements/latest');

        if (!res.ok) {
          const text = await res.text();
          console.error('Failed:', text);
          return;
        }

        const data = await res.json();
        setStatement(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadPayStub();
  }, []);

  // ✅ PDF download
  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;

    const canvas = await html2canvas(pdfRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    pdf.save('pay-stub.pdf');
  };

  // ✅ Loading state
  if (loading) {
    return (
      <Container py="xl">
        <Text>Loading pay stub...</Text>
      </Container>
    );
  }

  if (!statement) {
    return (
      <Container py="xl">
        <Text>No pay statement found.</Text>
      </Container>
    );
  }

  // ✅ Extract breakdown
  const b = statement.breakdown || {};

  // ✅ Earnings
  const earnings = [
    {
      label: 'Regular',
      rate: b.regularRate,
      units: b.regularHours,
      amount: b.regularAmount,
      yearToDate: null,
    },
    {
      label: 'Overtime',
      rate: b.otRate,
      units: b.otHours,
      amount: b.otAmount,
      yearToDate: null,
    },
    {
      label: 'Transport Allowance',
      rate: null,
      units: null,
      amount: b.transportAllowance,
      yearToDate: null,
    },
  ];

  // ✅ Deductions
  const deductions = [
    { label: 'Federal Tax', amount: -b.federalTax },
    { label: 'Quebec Tax', amount: -b.quebecTax },
    { label: 'EI', amount: -b.ei },
    { label: 'QPP', amount: -b.qpp },
    { label: 'QPP2', amount: -b.qpp2 },
    { label: 'QPIP', amount: -b.qpip },
    { label: 'Health', amount: -b.health },
    { label: 'Other', amount: -b.other },
  ];

  const grossEarnings = statement.grossEarnings ?? 0;
  const totalDeductions = statement.totalDeductions ?? 0;
  const netEarnings = statement.netEarnings ?? 0;

  return (
    <Container size="lg" py="xl">
      <Group justify="flex-end" mb="md">
        <Button
          leftSection={<IoDownloadOutline size={18} />}
          onClick={handleDownloadPdf}
        >
          Download PDF
        </Button>
      </Group>

      <Box
        ref={pdfRef}
        bg="white"
        p="xl"
        style={{
          border: '1px solid #ddd',
          maxWidth: 900,
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <Group justify="space-between" align="flex-start" mb="lg">
          <Box>
            <Box
              style={{
                width: 90,
                height: 90,
                border: '2px solid #7cb342',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image src="/logo.png" alt="Company Logo" width={80} height={80} />
            </Box>
          </Box>

          <Box ta="center">
            <Title order={2}>Company Address</Title>

            <Text fw={800} mt="md" size="xl">
              STATEMENT OF EARNINGS AND DEDUCTIONS
            </Text>

            <Group justify="center" mt="md" gap="xs">
              <Text fw={700}>Pay Period :</Text>

              <Box px="md" py={6} style={{ border: '2px solid #355c7d', borderRadius: 8 }}>
                {new Date(statement.payPeriodStart).toLocaleDateString()}
              </Box>

              <Text fw={700}>to</Text>

              <Box px="md" py={6} style={{ border: '2px solid #355c7d', borderRadius: 8 }}>
                {new Date(statement.payPeriodEnd).toLocaleDateString()}
              </Box>
            </Group>
          </Box>

          <Box />
        </Group>

        {/* Earnings */}
        <SectionHeader title="Earnings" />
        <GridHeader />

        {earnings.map((row) => (
          <Row key={row.label} {...row} />
        ))}

        <TotalRow label="Gross Earnings" value={grossEarnings} />

        {/* Deductions */}
        <SectionHeader title="Deductions" mt="lg" />

        {deductions.map((row) => (
          <DeductionRow key={row.label} {...row} />
        ))}

        <Box
          mt="md"
          px="md"
          py="sm"
          style={{
            backgroundColor: '#8bcf6c',
            borderTop: '2px solid black',
            borderBottom: '2px solid black',
          }}
        >
          <Group justify="space-between">
            <Text fw={800} size="xl">
              Net Earnings
            </Text>
            <Text fw={800} size="xl">
              {netEarnings.toFixed(2)}
            </Text>
          </Group>
        </Box>
      </Box>
    </Container>
  );
}

// ===== Components =====

function SectionHeader({ title, mt }: { title: string; mt?: any }) {
  return (
    <Box
      mt={mt}
      px="md"
      py="xs"
      style={{
        backgroundColor: '#d9ead3',
        borderTop: '2px solid black',
        borderBottom: '2px solid black',
      }}
    >
      <Text fw={800} size="xl">{title}</Text>
    </Box>
  );
}

function GridHeader() {
  return (
    <Group px="md" py="xs" justify="space-between" style={{ borderBottom: '2px solid #999' }}>
      <Text w="30%" />
      <Text w="10%" ta="right">Rate</Text>
      <Text w="10%" ta="right">Units</Text>
      <Text w="20%" ta="right">Amount</Text>
      <Text w="20%" ta="right">Year To Date</Text>
    </Group>
  );
}

function Row({ label, rate, units, amount, yearToDate }: any) {
  return (
    <Group px="md" py="xs" justify="space-between" style={{ background: '#efefef' }}>
      <Text w="30%">{label}</Text>
      <Text w="10%" ta="right">{rate ?? ''}</Text>
      <Text w="10%" ta="right">{units ?? ''}</Text>
      <Text w="20%" ta="right">{amount?.toFixed?.(2) ?? '0.00'}</Text>
      <Text w="20%" ta="right">{yearToDate ?? ''}</Text>
    </Group>
  );
}

function DeductionRow({ label, amount }: any) {
  return (
    <Group px="md" py="xs" justify="space-between" style={{ background: '#efefef', marginTop: 4 }}>
      <Text w="30%">{label}</Text>
      <Text w="40%" ta="right">{amount?.toFixed?.(2) ?? '0.00'}</Text>
      <Text w="20%" />
    </Group>
  );
}

function TotalRow({ label, value }: any) {
  return (
    <Box
      px="md"
      py="xs"
      style={{
        borderTop: '2px solid black',
        borderBottom: '2px solid black',
        marginTop: 4,
      }}
    >
      <Group justify="space-between">
        <Text w="30%">{label}</Text>
        <Text w="40%" ta="right">{value?.toFixed?.(2) ?? '0.00'}</Text>
        <Text w="20%" />
      </Group>
    </Box>
  );
}