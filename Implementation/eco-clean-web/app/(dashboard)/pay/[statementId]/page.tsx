'use client';

import { Box, Button, Container, Group, Text, Title, Loader, Center, Alert } from '@mantine/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRef, useEffect, useState } from 'react';
import { useParams } from "next/navigation";
import { IoDownloadOutline } from 'react-icons/io5';
import Image from 'next/image';

export default function PayStubPage() {
  const params = useParams();
  const statementId = params.statementId as string;
  const pdfRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch data from your route.ts
  useEffect(() => {
    async function fetchPayData() {
      try {
        // Using hardcoded ID for now or session.user.id
        const staffId = "3b32d468-9f20-4808-9f25-bffabed6a9cb";
        const response = await fetch(`/api/staff/${staffId}/pay-statements/${statementId}`);
        if (!response.ok) throw new Error("Statement not found.");
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (statementId) fetchPayData();
  }, [statementId]);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    pdf.save(`pay-stub-${data?.period?.payDate}.pdf`);
  };

  if (loading) return <Center h="80vh"><Loader size="xl" color="#125f82" /></Center>;
  if (error) return <Container py="xl"><Alert color="red">{error}</Alert></Container>;

  // 2. Map Database JSON to your UI structure
  const earnings = [
    { label: 'Regular', rate: data.details?.regularRate, units: data.details?.regularHours, amount: data.details?.regularAmount, yearToDate: data.details?.regularAmount },
    { label: 'Overtime', rate: data.details?.otRate, units: data.details?.otHours, amount: data.details?.otAmount, yearToDate: data.details?.otAmount },
    { label: 'Transport Allowance', rate: null, units: null, amount: data.details?.transportAllowance || 0, yearToDate: null },
  ];

  const deductions = [
    { label: 'Federal Tax', amount: -(data.details?.federalTax || 0) },
    { label: 'EI', amount: -(data.details?.ei || 0) },
    { label: 'CPP', amount: -(data.details?.cpp || 0) },
    { label: 'Health', amount: -(data.details?.health || 0) },
    { label: 'Other', amount: -(data.details?.other || 0) },
  ];

  return (
    <Container size="lg" py="xl">
      <Group justify="flex-end" mb="md">
        <Button leftSection={<IoDownloadOutline size={18} />} onClick={handleDownloadPdf}>
          Download PDF
        </Button>
      </Group>

      <Box ref={pdfRef} bg="white" p="xl" style={{ border: '1px solid #ddd', maxWidth: 900, margin: '0 auto' }}>
        <Group justify="space-between" align="flex-start" mb="lg">
          <Box>
            <Box style={{ width: 90, height: 90, border: '2px solid #7cb342', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Image src="/logo.png" alt="Company Logo" width={80} height={80} />
            </Box>
          </Box>

          <Box ta="center">
            <Title order={3}>Eco-Clean Services</Title>
            <Text size="sm">Surrey, British Columbia, CA</Text>
            <Text fw={800} mt="md" size="lg" c="#2e7d32">STATEMENT OF EARNINGS AND DEDUCTIONS</Text>

            <Group justify="center" mt="md" gap="xs">
              <Text fw={700} size="sm">Pay Period :</Text>
              <Box px="md" py={4} style={{ border: '2px solid #355c7d', borderRadius: 8, fontSize: '14px' }}>
                {new Date(data.period.start).toLocaleDateString()}
              </Box>
              <Text fw={700} size="sm">to</Text>
              <Box px="md" py={4} style={{ border: '2px solid #355c7d', borderRadius: 8, fontSize: '14px' }}>
                {new Date(data.period.end).toLocaleDateString()}
              </Box>
            </Group>
          </Box>
          <Box w={90} />
        </Group>

        <SectionHeader title="Earnings" />
        <GridHeader />
        {earnings.map((row) => (
          <Row key={row.label} label={row.label} rate={row.rate} units={row.units} amount={row.amount} yearToDate={row.yearToDate} />
        ))}
        <TotalRow label="Gross Earnings" value={data.summary.gross} />

        <SectionHeader title="Deductions" mt="lg" />
        {deductions.map((row) => (
          <DeductionRow key={row.label} label={row.label} amount={row.amount} />
        ))}

        <Box mt="md" px="md" py="sm" style={{ backgroundColor: '#8bcf6c', borderTop: '2px solid black', borderBottom: '2px solid black' }}>
          <Group justify="space-between">
            <Text fw={800} size="xl">Net Earnings</Text>
            <Text fw={800} size="xl">${data.summary.net.toFixed(2)}</Text>
          </Group>
        </Box>
      </Box>
    </Container>
  );
}

// --- Helper Components (SectionHeader, GridHeader, Row, etc. remain the same as your code) ---
function SectionHeader({ title, mt }: { title: string; mt?: string | number }) {
  return (
    <Box mt={mt} px="md" py="xs" style={{ backgroundColor: '#d9ead3', borderTop: '2px solid black', borderBottom: '2px solid black' }}>
      <Text fw={800} size="lg">{title}</Text>
    </Box>
  );
}

function GridHeader() {
  return (
    <Group px="md" py="xs" justify="space-between" style={{ borderBottom: '2px solid #999' }}>
      <Text fw={700} w="30%">Description</Text>
      <Text fw={700} w="10%" ta="right">Rate</Text>
      <Text fw={700} w="10%" ta="right">Units</Text>
      <Text fw={700} w="20%" ta="right">Amount</Text>
      <Text fw={700} w="20%" ta="right">YTD</Text>
    </Group>
  );
}

function Row({ label, rate, units, amount, yearToDate }: any) {
  return (
    <Group px="md" py={6} justify="space-between" style={{ background: '#f9f9f9' }}>
      <Text w="30%">{label}</Text>
      <Text w="10%" ta="right">{rate ?? '-'}</Text>
      <Text w="10%" ta="right">{units ?? '-'}</Text>
      <Text w="20%" ta="right">${amount?.toFixed(2)}</Text>
      <Text w="20%" ta="right">${yearToDate?.toFixed(2) ?? '-'}</Text>
    </Group>
  );
}

function DeductionRow({ label, amount }: any) {
  return (
    <Group px="md" py={6} justify="space-between" style={{ background: '#f9f9f9', marginTop: 2 }}>
      <Text w="30%">{label}</Text>
      <Text w="40%" ta="right" c="red">{amount?.toFixed(2)}</Text>
      <Text w="20%" />
    </Group>
  );
}

function TotalRow({ label, value }: any) {
  return (
    <Box px="md" py="xs" style={{ borderTop: '2px solid black', borderBottom: '2px solid black', marginTop: 4 }}>
      <Group justify="space-between">
        <Text w="30%" fw={700}>{label}</Text>
        <Text w="40%" ta="right" fw={700}>${value?.toFixed(2)}</Text>
        <Text w="20%" />
      </Group>
    </Box>
  );
}
