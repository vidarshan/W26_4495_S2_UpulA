"use client";

import {
  Alert,
  Box,
  Button,
  Center,
  Divider,
  Grid,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  IoArrowBack,
  IoCalendar,
  IoCash,
  IoDownload,
  IoDocumentText,
  IoPerson,
} from "react-icons/io5";
import AdminPageFrame from "@/app/components/admin/AdminPageFrame";

type PayBreakdown = {
  regularRate?: number | null;
  regularHours?: number | null;
  regularAmount?: number | null;
  otRate?: number | null;
  otHours?: number | null;
  otAmount?: number | null;
  transportAllowance?: number | null;
  federalTax?: number | null;
  quebecTax?: number | null;
  ei?: number | null;
  qpp?: number | null;
  qpp2?: number | null;
  qpip?: number | null;
  health?: number | null;
  other?: number | null;
};

type PayStatementDetails = {
  id: string;
  employeeName: string;
  employeeId: string;
  payDate: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  grossEarnings: number;
  totalDeductions: number;
  netEarnings: number;
  breakdown?: PayBreakdown | null;
  ytd?: {
    gross: number;
    deductions: number;
    net: number;
  };
};

type PageProps = {
  params: Promise<{ statementId: string }>;
};

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value || 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load statement.";
}

export default function AdminPayStubPage({ params }: PageProps) {
  const pdfRef = useRef<HTMLDivElement>(null);

  const [statementId, setStatementId] = useState<string | null>(null);
  const [data, setData] = useState<PayStatementDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function resolveParams() {
      const resolved = await params;
      if (mounted) {
        setStatementId(resolved.statementId);
      }
    }

    void resolveParams();

    return () => {
      mounted = false;
    };
  }, [params]);

  useEffect(() => {
    if (!statementId) return;

    async function fetchPayData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/pay-statements/${statementId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Statement not found.");
        }

        const result = (await response.json()) as PayStatementDetails;
        setData(result);
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    void fetchPayData();
  }, [statementId]);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current || !data) return;

    try {
      setDownloading(true);
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
      pdf.save(`pay-statement-${data.employeeId}-${data.id}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Center mih="70vh">
        <Loader size="lg" color="lime" />
      </Center>
    );
  }

  if (error) {
    return (
      <Box py="xl">
        <Alert color="red">{error}</Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box py="xl">
        <Alert color="yellow">No pay statement found.</Alert>
      </Box>
    );
  }

  const earnings = [
    {
      label: "Regular",
      rate: data.breakdown?.regularRate,
      units: data.breakdown?.regularHours,
      amount: data.breakdown?.regularAmount,
    },
    {
      label: "Overtime",
      rate: data.breakdown?.otRate,
      units: data.breakdown?.otHours,
      amount: data.breakdown?.otAmount,
    },
    {
      label: "Transport allowance",
      rate: null,
      units: null,
      amount: data.breakdown?.transportAllowance,
    },
  ];

  const deductions = [
    { label: "Federal tax", amount: data.breakdown?.federalTax || 0 },
    { label: "Quebec tax", amount: data.breakdown?.quebecTax || 0 },
    { label: "EI", amount: data.breakdown?.ei || 0 },
    { label: "QPP", amount: data.breakdown?.qpp || 0 },
    { label: "QPP2", amount: data.breakdown?.qpp2 || 0 },
    { label: "QPIP", amount: data.breakdown?.qpip || 0 },
    { label: "Health", amount: data.breakdown?.health || 0 },
    { label: "Other", amount: data.breakdown?.other || 0 },
  ].filter((item) => item.amount > 0);

  return (
    <AdminPageFrame
      eyebrow="Payroll statement"
      title="Pay Statement"
      description="Review a generated statement in the newer admin layout and export a PDF when needed."
      action={
        <Group gap="sm">
          <Button
            component={Link}
            href="/admin/pay-periods"
            variant="default"
            leftSection={<IoArrowBack size={16} />}
          >
            Back to pay periods
          </Button>
          <Button
            leftSection={<IoDownload size={16} />}
            onClick={handleDownloadPdf}
            loading={downloading}
            color="lime"
          >
            Download PDF
          </Button>
        </Group>
      }
      stats={[
        { label: "Employee", value: data.employeeId || "N/A", icon: IoPerson },
        { label: "Pay date", value: formatDate(data.payDate), icon: IoCalendar },
        { label: "Net earnings", value: formatMoney(data.netEarnings), icon: IoCash },
      ]}
    >
      <Stack gap="lg">
        <Stack gap="lg">
          <Paper withBorder radius="lg" p="lg" className="admin-page-frame__stat">
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Text size="sm" c="dimmed">
                  Employee
                </Text>
                <Text fw={700} mt={6}>
                  {data.employeeName}
                </Text>
                <Text size="sm" c="dimmed">
                  Staff ID: {data.employeeId}
                </Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Text size="sm" c="dimmed">
                  Period
                </Text>
                <Text fw={700} mt={6}>
                  {formatDate(data.payPeriodStart)} → {formatDate(data.payPeriodEnd)}
                </Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Text size="sm" c="dimmed">
                  Year to date net
                </Text>
                <Text fw={700} mt={6}>
                  {formatMoney(data.ytd?.net)}
                </Text>
              </Grid.Col>
            </Grid>
          </Paper>

          <Paper
            ref={pdfRef}
            withBorder
            radius="lg"
            p={{ base: "md", md: "xl" }}
            className="admin-page-frame__surface"
          >
            <Stack gap="xl">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Group gap="md" wrap="nowrap">
                  <Box
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 20,
                      background:
                        "linear-gradient(180deg, rgba(247, 254, 231, 0.98), rgba(255, 255, 255, 0.98))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(132, 204, 22, 0.24)",
                    }}
                  >
                    <Image src="/logo.png" alt="Eco Clean" width={44} height={44} />
                  </Box>

                  <div>
                    <Text fw={800} size="xl" c="#0f172a">
                      Eco-Clean Services
                    </Text>
                    <Text size="sm" c="dimmed">
                      Statement of earnings and deductions
                    </Text>
                  </div>
                </Group>

                <Paper withBorder radius="lg" p="sm" className="admin-page-frame__stat">
                  <Text size="xs" tt="uppercase" fw={700} c="#64748b">
                    Pay Date
                  </Text>
                  <Text fw={700} mt={4}>
                    {formatDate(data.payDate)}
                  </Text>
                </Paper>
              </Group>

              <Grid gutter="md">
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Paper withBorder radius="lg" p="md" className="admin-page-frame__stat">
                    <Text size="xs" tt="uppercase" fw={700} c="#64748b">
                      Employee
                    </Text>
                    <Text fw={700} mt={6}>
                      {data.employeeName}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Staff ID: {data.employeeId}
                    </Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Paper withBorder radius="lg" p="md" className="admin-page-frame__stat">
                    <Text size="xs" tt="uppercase" fw={700} c="#64748b">
                      Pay Period
                    </Text>
                    <Text fw={700} mt={6}>
                      {formatDate(data.payPeriodStart)} → {formatDate(data.payPeriodEnd)}
                    </Text>
                  </Paper>
                </Grid.Col>
              </Grid>

              <Stack gap="sm">
                <Group gap="xs">
                  <IoDocumentText size={18} color="#0f172a" />
                  <Text fw={700} c="#0f172a">
                    Earnings
                  </Text>
                </Group>

                <Table withTableBorder highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Description</Table.Th>
                      <Table.Th ta="right">Rate</Table.Th>
                      <Table.Th ta="right">Units</Table.Th>
                      <Table.Th ta="right">Amount</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {earnings.map((row) => (
                      <Table.Tr key={row.label}>
                        <Table.Td>{row.label}</Table.Td>
                        <Table.Td ta="right">
                          {row.rate != null ? formatMoney(row.rate) : "—"}
                        </Table.Td>
                        <Table.Td ta="right">{row.units != null ? row.units : "—"}</Table.Td>
                        <Table.Td ta="right">{formatMoney(row.amount)}</Table.Td>
                      </Table.Tr>
                    ))}
                    <Table.Tr>
                      <Table.Td colSpan={3}>
                        <Text fw={700}>Gross earnings</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text fw={700}>{formatMoney(data.grossEarnings)}</Text>
                      </Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
              </Stack>

              <Stack gap="sm">
                <Group gap="xs">
                  <IoCash size={18} color="#0f172a" />
                  <Text fw={700} c="#0f172a">
                    Deductions
                  </Text>
                </Group>

                <Table withTableBorder highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Description</Table.Th>
                      <Table.Th ta="right">Amount</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {deductions.length ? (
                      deductions.map((row) => (
                        <Table.Tr key={row.label}>
                          <Table.Td>{row.label}</Table.Td>
                          <Table.Td ta="right">{formatMoney(row.amount)}</Table.Td>
                        </Table.Tr>
                      ))
                    ) : (
                      <Table.Tr>
                        <Table.Td colSpan={2}>
                          <Text c="dimmed">No deductions recorded for this statement.</Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                    <Table.Tr>
                      <Table.Td>
                        <Text fw={700}>Total deductions</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text fw={700}>{formatMoney(data.totalDeductions)}</Text>
                      </Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
              </Stack>

              <Divider />

              <Group justify="space-between" align="center">
                <Text fw={800} size="lg" c="#0f172a">
                  Net earnings
                </Text>
                <Text fw={800} size="1.6rem" c="#4d7c0f">
                  {formatMoney(data.netEarnings)}
                </Text>
              </Group>
            </Stack>
          </Paper>
        </Stack>
      </Stack>
    </AdminPageFrame>
  );
}
