"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

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

type YtdBreakdown = {
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

type PayStatementResponse = {
  latest?: {
    payPeriodStart?: string;
    payPeriodEnd?: string;
    payDate?: string;
    grossEarnings?: number;
    totalDeductions?: number;
    netEarnings?: number;
    breakdown?: PayBreakdown;
  };
  employeeName?: string;
  employeeId?: string;
  ytd?: YtdBreakdown;
};

type StatementRowProps = {
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
  const pdfRef = useRef<HTMLDivElement>(null);
  const [statement, setStatement] = useState<PayStatementResponse | null>(null);
  const latest = statement?.latest || {};
  const employeeName = statement?.employeeName || "N/A";
  const employeeId = statement?.employeeId || "N/A";

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/staff/pay-statements/latest");
      const data = await res.json();
      setStatement(data);
    }
    load();
  }, []);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;

    const canvas = await html2canvas(pdfRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth() - 20;
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(imgData, "PNG", 10, 10, width, height);
    pdf.save(`pay-stub-${latest.payDate ?? "statement"}.pdf`);
  };

  if (!statement) return <Text>Loading...</Text>;

  const b = latest.breakdown || {};
  const ytd = statement.ytd || {};

  const rows = [
    {
      label: "Regular",
      amount: b.regularAmount,
      ytd: ytd.regular,
    },
    {
      label: "Overtime",
      amount: b.otAmount,
      ytd: ytd.overtime,
    },
    {
      label: "Transport",
      rate: "",
      units: "",
      amount: b.transportAllowance,
      ytd: ytd.allowance,
    },
  ];

  const deductions = [
    { label: "Federal Tax", amount: b.federalTax, ytd: ytd.federalTax },
    { label: "Quebec Tax", amount: b.quebecTax, ytd: ytd.quebecTax },
    { label: "EI", amount: b.ei, ytd: ytd.ei },
    { label: "QPP", amount: b.qpp, ytd: ytd.qpp },
    { label: "QPP2", amount: b.qpp2, ytd: ytd.qpp2 },
    { label: "QPIP", amount: b.qpip, ytd: ytd.qpip },
  ];

  return (
    <Container p="md" className="staff-app-page">
      <Stack gap="lg">
        <Card
          withBorder
          radius="lg"
          p="lg"
          className="staff-app-surface staff-app-surface--hero"
        >
          <Stack gap="md">
            <Group justify="space-between" align="end" gap="md">
              <Box>
                <Title order={3}>Latest Pay Statement</Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Review your latest earnings summary or download a printable
                  statement.
                </Text>
              </Box>

              <Button
                variant="default"
                radius="lg"
                size="md"
                onClick={handleDownloadPdf}
              >
                Download PDF
              </Button>
            </Group>

            <Group gap="sm" wrap="wrap">
              <Badge variant="light" color="lime">
                Net ${formatAmount(latest.netEarnings)}
              </Badge>
              <Badge variant="light" color="blue">
                Gross ${formatAmount(latest.grossEarnings)}
              </Badge>
              <Badge variant="light" color="gray">
                Pay Date {formatDate(latest.payDate)}
              </Badge>
            </Group>
          </Stack>
        </Card>

        <Card
          withBorder
          radius="lg"
          p={{ base: "sm", sm: "md" }}
          className="staff-app-surface"
        >
          <Stack gap="md">
            <Box
              p="md"
              style={{
                border: "1px solid var(--mantine-color-gray-3)",
                borderRadius: 16,
                background:
                  "linear-gradient(180deg, rgba(248,249,250,0.95) 0%, rgba(255,255,255,1) 100%)",
              }}
            >
              <Group justify="space-between" align="end" gap="md">
                <Box>
                  <Text fw={700}>Printable Statement</Text>
                  <Text size="sm" c="dimmed" mt={4}>
                    This section mirrors the exported PDF layout and keeps the
                    official earnings and deductions breakdown together.
                  </Text>
                </Box>

                <Badge variant="light" color="gray">
                  Official Copy
                </Badge>
              </Group>
            </Box>

            <Box
              ref={pdfRef}
              p="lg"
              bg="white"
              style={{ border: "1px solid black", borderRadius: 16 }}
            >
              {/* HEADER */}
              <Grid mb="md" align="center">
                <Grid.Col span={3}>
                  <Image src="/logo.png" alt="logo" width={80} height={80} />
                </Grid.Col>

                <Grid.Col span={9}>
                  <Stack gap={4}>
                    <Title order={3}>STATEMENT OF EARNINGS</Title>
                    <Text size="sm">
                      Pay Period: {formatDate(latest.payPeriodStart)} -{" "}
                      {formatDate(latest.payPeriodEnd)}
                    </Text>
                  </Stack>
                </Grid.Col>
              </Grid>

              {/* EMPLOYEE INFO */}
              <Box
                mb="md"
                p="sm"
                style={{ border: "1px solid black", borderRadius: 16 }}
              >
                <Grid>
                  <Grid.Col span={6}>
                    <Text>
                      <b>Employee:</b> {employeeName}
                    </Text>
                    <Text>
                      <b>Employee ID:</b> {employeeId}
                    </Text>
                  </Grid.Col>

                  <Grid.Col span={6}>
                    <Text>
                      <b>Pay Date:</b> {formatDate(latest.payDate)}
                    </Text>
                    <Text>
                      <b>Department:</b> Cleaning Services
                    </Text>
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
                <TableRow
                  key={d.label}
                  label={d.label}
                  amount={d.amount}
                  ytd={d.ytd}
                />
              ))}

              <TableTotal
                label="Total Deductions"
                amount={latest.totalDeductions}
                ytd={ytd.deductions}
              />

              {/* NET */}
              <Box
                mt="md"
                p="sm"
                style={{
                  border: "2px solid black",
                  background: "#d4edda",
                  borderRadius: 16,
                }}
              >
                <Grid>
                  <Grid.Col span={6}>
                    <Text fw={700}>Net Earnings</Text>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Text ta="right">{formatAmount(latest.netEarnings)}</Text>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Text ta="right">{formatAmount(ytd.net)}</Text>
                  </Grid.Col>
                </Grid>
              </Box>
            </Box>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}

/* ---------- COMPONENTS ---------- */

function TableHeader({ title }: { title: string }) {
  return (
    <Box mt="md" style={{ borderBottom: "2px solid black" }}>
      <Grid>
        <Grid.Col span={6}>
          <Text fw={700}>{title}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text ta="right">Amount</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text ta="right">YTD</Text>
        </Grid.Col>
      </Grid>
    </Box>
  );
}

function TableRow({ label, amount, ytd }: StatementRowProps) {
  return (
    <Box style={{ borderBottom: "1px solid #ccc" }} py={4}>
      <Grid>
        <Grid.Col span={6}>
          <Text>{label}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text ta="right">{formatAmount(amount)}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text ta="right">{ytd !== undefined ? formatAmount(ytd) : ""}</Text>
        </Grid.Col>
      </Grid>
    </Box>
  );
}

function TableTotal({
  label,
  amount,
  ytd,
}: {
  label: string;
  amount?: number;
  ytd?: number;
}) {
  return (
    <Box
      mt="xs"
      style={{ borderTop: "2px solid black", borderBottom: "2px solid black" }}
    >
      <Grid>
        <Grid.Col span={6}>
          <Text fw={700}>{label}</Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text fw={700} ta="right">
            {formatAmount(amount)}
          </Text>
        </Grid.Col>
        <Grid.Col span={2}>
          <Text fw={700} ta="right">
            {ytd !== undefined ? formatAmount(ytd) : ""}
          </Text>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
