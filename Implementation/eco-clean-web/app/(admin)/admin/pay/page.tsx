"use client";

import { Box, Button, Container, Group, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useRef } from "react";
import { IoDownloadOutline } from "react-icons/io5";
import Image from "next/image";

const earnings = [
  { label: 'Regular', rate: 18, units: 80, amount: 1540, yearToDate: 1540 },
  { label: 'Overtime', rate: 24, units: 10, amount: 240, yearToDate: 240 },
  {
    label: 'Transport Allowance',
    rate: null,
    units: null,
    amount: 200,
    yearToDate: null,
  },
];

const deductions = [
  { label: 'Federal Tax', amount: -100 },
  { label: 'EI', amount: -50 },
  { label: 'CPP', amount: -50 },
  { label: 'Health', amount: -50 },
];

export default function PayStubPage() {
  const isNarrow = useMediaQuery("(max-width: 62em)");
  const pdfRef = useRef<HTMLDivElement>(null);

  const grossEarnings = earnings.reduce((sum, row) => sum + row.amount, 0);
  const totalDeductions = deductions.reduce((sum, row) => sum + row.amount, 0);
  const netEarnings = grossEarnings + totalDeductions;

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

  return (
    <Container size="lg" py="xl">
      <Group justify={isNarrow ? "stretch" : "flex-end"} mb="md">
        <Button
          leftSection={<IoDownloadOutline size={18} />}
          onClick={handleDownloadPdf}
          fullWidth={isNarrow}
        >
          Download PDF
        </Button>
      </Group>

      <Box style={{ overflowX: "auto" }}>
        <Box
          ref={pdfRef}
          bg="white"
          p={isNarrow ? "md" : "xl"}
          style={{
            border: "1px solid #ddd",
            maxWidth: 900,
            minWidth: isNarrow ? 680 : undefined,
            margin: "0 auto",
          }}
        >
        <Group justify="space-between" align="flex-start" mb="lg" wrap="nowrap">
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
                fontWeight: 700,
                color: '#2e7d32',
              }}
            >
              <Image
                src="/logo.png"
                alt="Company Logo"
                width={120}
                height={120}
              />
            </Box>
          </Box>

          <Box ta="center">
            <Title order={2}>69 2e Ave N, Roxboro,</Title>
            <Title order={2}>Quebec H8Y 2L1, CA</Title>
            <Text fw={800} mt="md" size="xl">
              STATEMENT OF EARNINGS AND DEDUCTIONS
            </Text>

            <Group justify="center" mt="md" gap="xs">
              <Text fw={700}>Pay Period :</Text>
              <Box
                px="md"
                py={6}
                style={{ border: '2px solid #355c7d', borderRadius: 8 }}
              >
                2025-Mar-08
              </Box>
              <Text fw={700}>to</Text>
              <Box
                px="md"
                py={6}
                style={{ border: '2px solid #355c7d', borderRadius: 8 }}
              >
                2025-Mar-21
              </Box>
            </Group>
          </Box>

          <Box></Box>
        </Group>

        {/* Earnings */}
        <SectionHeader title="Earnings" />
        <GridHeader />

        {earnings.map((row) => (
          <Row
            key={row.label}
            label={row.label}
            rate={row.rate}
            units={row.units}
            amount={row.amount}
            yearToDate={row.yearToDate}
          />
        ))}

        <TotalRow label="Gross Earnings" value={grossEarnings} />

        {/* Deductions */}
        <SectionHeader title="Deductions" mt="lg" />

        {deductions.map((row) => (
          <DeductionRow key={row.label} label={row.label} amount={row.amount} />
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
              {netEarnings}
            </Text>
          </Group>
        </Box>
        </Box>
      </Box>
    </Container>
  );
}

function SectionHeader({ title, mt }: { title: string; mt?: string | number }) {
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
      <Text fw={800} size="xl">
        {title}
      </Text>
    </Box>
  );
}

function GridHeader() {
  return (
    <Group
      px="md"
      py="xs"
      justify="space-between"
      style={{ borderBottom: '2px solid #999' }}
    >
      <Text fw={700} w="30%">
        {' '}
      </Text>
      <Text fw={700} w="10%" ta="right">
        Rate
      </Text>
      <Text fw={700} w="10%" ta="right">
        Units
      </Text>
      <Text fw={700} w="20%" ta="right">
        Amount
      </Text>
      <Text fw={700} w="20%" ta="right">
        Year To Date
      </Text>
    </Group>
  );
}

function Row({
  label,
  rate,
  units,
  amount,
  yearToDate,
}: {
  label: string;
  rate: number | null;
  units: number | null;
  amount: number;
  yearToDate: number | null;
}) {
  return (
    <Group
      px="md"
      py="xs"
      justify="space-between"
      style={{ background: '#efefef' }}
    >
      <Text w="30%">{label}</Text>
      <Text w="10%" ta="right">
        {rate ?? ''}
      </Text>
      <Text w="10%" ta="right">
        {units ?? ''}
      </Text>
      <Text w="20%" ta="right">
        {amount}
      </Text>
      <Text w="20%" ta="right">
        {yearToDate ?? ''}
      </Text>
    </Group>
  );
}

function DeductionRow({ label, amount }: { label: string; amount: number }) {
  return (
    <Group
      px="md"
      py="xs"
      justify="space-between"
      style={{ background: '#efefef', marginTop: 4 }}
    >
      <Text w="30%">{label}</Text>
      <Text w="40%" ta="right">
        {amount}
      </Text>
      <Text w="20%" />
    </Group>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
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
        <Text w="40%" ta="right">
          {value}
        </Text>
        <Text w="20%" />
      </Group>
    </Box>
  );
}
