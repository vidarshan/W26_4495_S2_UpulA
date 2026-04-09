"use client";

import { AI_FEATURES_ENABLED } from "@/lib/config/ai";
import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Collapse,
  Container,
  Divider,
  Grid,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
  RingProgress,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const EARNINGS_COLORS = ["#1f6b8f", "#eb7a2f", "#2e7d32"];

type PayBreakdown = {
  regularAmount?: number;
  otAmount?: number;
  transportAllowance?: number;
  federalTax?: number;
  quebecTax?: number;
  ei?: number;
  qpp?: number;
  qpip?: number;
  other?: number;
};

type PayPeriodRecord = {
  id: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate?: string;
  grossEarnings?: number;
  totalDeductions?: number;
  netEarnings?: number;
  breakdown?: PayBreakdown;
};

type PayOverviewResponse = {
  employeeName: string;
  employeeId: string;
  latest?: PayPeriodRecord;
  ytd?: {
    gross?: number;
    deductions?: number;
    net?: number;
  };
  all?: PayPeriodRecord[];
};

type PayCompareResponse = {
  summary: string;
  keyDrivers: string[];
  increases: string[];
  decreases: string[];
  recommendation?: string;
};

function formatCurrency(value?: number) {
  return `$${(value ?? 0).toFixed(2)}`;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString() : "Not scheduled";
}

function formatPeriodLabel(period?: Partial<PayPeriodRecord> | null) {
  if (!period) return "Not available";
  return `${formatDate(period.payPeriodStart)} - ${formatDate(period.payPeriodEnd)}`;
}

function BreakdownCard({
  title,
  items,
  total,
  tone,
}: {
  title: string;
  items: Array<{ label: string; value?: number }>;
  total: number;
  tone: "lime" | "slate";
}) {
  const toneStyles =
    tone === "lime"
      ? {
          background:
            "linear-gradient(180deg, rgba(247, 254, 231, 0.96), rgba(255, 255, 255, 0.98))",
          borderColor: "rgba(132, 204, 22, 0.28)",
        }
      : {
          background:
            "linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98))",
          borderColor: "rgba(148, 163, 184, 0.24)",
        };

  return (
    <Card withBorder radius="lg" p="lg" className="staff-app-surface" style={toneStyles}>
      <Group justify="space-between" align="flex-start" gap="md">
        <Box>
          <Text fw={700}>{title}</Text>
          <Text size="sm" c="dimmed" mt={4}>
            A quick look at your latest pay
          </Text>
        </Box>
        <Badge variant="light" color={tone === "lime" ? "lime" : "gray"}>
          {formatCurrency(total)}
        </Badge>
      </Group>

      <Divider my="md" />

      <Stack gap="xs">
        {items.map((item) => (
          <Group key={item.label} justify="space-between" wrap="nowrap">
            <Text size="sm" c="dimmed">
              {item.label}
            </Text>
            <Text fw={600}>{formatCurrency(item.value)}</Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

function EarningsChartCard({
  items,
}: {
  items: Array<{ label: string; value?: number }>;
}) {
  const chartData = items.map((item, index) => ({
    label: item.label,
    value: item.value ?? 0,
    color: EARNINGS_COLORS[index % EARNINGS_COLORS.length],
  }));
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const sections =
    total > 0
      ? chartData.map((item) => ({
          value: (item.value / total) * 100,
          color: item.color,
          tooltip: `${item.label}: ${formatCurrency(item.value)}`,
        }))
      : [{ value: 100, color: "#e2e8f0", tooltip: "No earnings data" }];

  return (
    <Card withBorder radius="lg" p="lg" className="staff-app-surface">
      <Stack gap="md">
        <Box>
          <Text fw={700}>Earnings Distribution</Text>
          <Text size="sm" c="dimmed" mt={4}>
            See how your latest pay was split across regular time, overtime, and allowance.
          </Text>
        </Box>

        <Group justify="center" py="sm">
          <RingProgress
            size={220}
            thickness={26}
            roundCaps
            sections={sections}
            label={
              <Stack gap={0} align="center">
                <Text fw={800} size="xl">
                  {formatCurrency(total)}
                </Text>
                <Text size="xs" c="dimmed">
                  Total earnings
                </Text>
              </Stack>
            }
          />
        </Group>

        <Stack gap="xs">
          {chartData.map((item) => (
            <Group key={item.label} justify="space-between" wrap="nowrap">
              <Group gap="xs" wrap="nowrap">
                <Box
                  w={10}
                  h={10}
                  style={{
                    borderRadius: "999px",
                    background: item.color,
                    flexShrink: 0,
                  }}
                />
                <Text size="sm" c="dimmed">
                  {item.label}
                </Text>
              </Group>
              <Text fw={600}>{formatCurrency(item.value)}</Text>
            </Group>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

export default function YourPayPage() {
  const aiFeaturesEnabled = AI_FEATURES_ENABLED;
  const router = useRouter();
  const [data, setData] = useState<PayOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<PayCompareResponse | null>(null);
  const [periodA, setPeriodA] = useState<PayPeriodRecord | null>(null);
  const [periodB, setPeriodB] = useState<PayPeriodRecord | null>(null);

  useEffect(() => {
    async function fetchPayData() {
      try {
        const res = await fetch("/api/staff/pay-statements/latest");
        if (!res.ok) throw new Error("Failed to fetch pay details");

        const payload = (await res.json()) as PayOverviewResponse;
        setData(payload);

        if (payload.all && payload.all.length >= 2) {
          setPeriodB(payload.all[0]);
          setPeriodA(payload.all[1]);
        }
      } catch (error) {
        console.error("Error fetching pay data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPayData();
  }, []);

  const history = useMemo(() => data?.all ?? [], [data?.all]);
  const latest: Partial<PayPeriodRecord> = data?.latest ?? {};
  const ytd = data?.ytd ?? {};
  const breakdown = latest.breakdown ?? {};

  const earningsItems = [
    { label: "Regular hours", value: breakdown.regularAmount },
    { label: "Overtime", value: breakdown.otAmount },
    { label: "Allowance", value: breakdown.transportAllowance },
  ];

  const deductionItems = [
    { label: "Federal tax", value: breakdown.federalTax },
    { label: "Quebec tax", value: breakdown.quebecTax },
    { label: "EI", value: breakdown.ei },
    { label: "QPP", value: breakdown.qpp },
    { label: "QPIP", value: breakdown.qpip },
    { label: "Other", value: breakdown.other },
  ];

  const comparisonOptions = useMemo(
    () =>
      history.map((period) => ({
        value: period.id,
        label: formatPeriodLabel(period),
        raw: period,
      })),
    [history],
  );

  if (loading) {
    return (
      <Center h="100vh">
        <Loader size="xl" color="lime" />
      </Center>
    );
  }

  if (!data) {
    return (
      <Center h="100vh">
        <Text>No pay statement found.</Text>
      </Center>
    );
  }

  return (
    <Container p={0} className="staff-app-page">
      <Stack className="staff-page-stack">
        <Card
          withBorder
          radius="lg"
          p="lg"
          className="staff-app-surface staff-app-surface--hero"
        >
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start" gap="md">
              <Box>
                <Text
                  size="xs"
                  fw={700}
                  c="#64748b"
                  tt="uppercase"
                  style={{ letterSpacing: "0.08em" }}
                >
                  Pay workspace
                </Text>
                <Title order={2} mt={6}>
                  Your Pay
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Check your latest pay, see what was taken off, and open older pay slips when you need them.
                </Text>
              </Box>

              <Stack gap="xs" align="flex-end">
                <Badge variant="light" color="lime">
                  {history.length} statements
                </Badge>
                <Badge variant="light" color="gray">
                  Pay date {formatDate(latest.payDate)}
                </Badge>
              </Stack>
            </Group>

            <SimpleGrid cols={{ base: 2, sm: 3 }} className="staff-summary-grid">
              <Card withBorder radius="lg" p="md" className="staff-app-surface">
                <Text size="sm" c="dimmed">
                  Net Earnings
                </Text>
                <Title order={3} mt={8}>
                  {formatCurrency(latest.netEarnings)}
                </Title>
                <Text size="sm" c="dimmed" mt={6}>
                  Latest statement
                </Text>
              </Card>

              <Card withBorder radius="lg" p="md" className="staff-app-surface">
                <Text size="sm" c="dimmed">
                  Gross YTD
                </Text>
                <Title order={3} mt={8}>
                  {formatCurrency(ytd.gross)}
                </Title>
                <Text size="sm" c="dimmed" mt={6}>
                  Total earned so far this year
                </Text>
              </Card>

              <Card withBorder radius="lg" p="md" className="staff-app-surface">
                <Text size="sm" c="dimmed">
                  Deductions YTD
                </Text>
                <Title order={3} mt={8}>
                  {formatCurrency(ytd.deductions)}
                </Title>
                <Text size="sm" c="dimmed" mt={6}>
                  Total taken off so far this year
                </Text>
              </Card>
            </SimpleGrid>
          </Stack>
        </Card>

        <Card withBorder radius="lg" p="lg" className="staff-app-surface">
          <SimpleGrid cols={{ base: 2, sm: 2, lg: 4 }} className="staff-summary-grid">
            <Box>
              <Text size="sm" c="dimmed">
                Employee
              </Text>
              <Text fw={700} mt={4}>
                {data.employeeName}
              </Text>
            </Box>
            <Box>
              <Text size="sm" c="dimmed">
                Employee ID
              </Text>
              <Text fw={700} mt={4}>
                {data.employeeId}
              </Text>
            </Box>
            <Box>
              <Text size="sm" c="dimmed">
                Pay Period
              </Text>
              <Text fw={700} mt={4}>
                {formatPeriodLabel(latest)}
              </Text>
            </Box>
            <Box>
              <Text size="sm" c="dimmed">
                YTD Net
              </Text>
              <Text fw={700} mt={4}>
                {formatCurrency(ytd.net)}
              </Text>
            </Box>
          </SimpleGrid>
        </Card>

        <Grid gutter="md">
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <EarningsChartCard items={earningsItems} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
            <BreakdownCard
              title="Earnings"
              items={earningsItems}
              total={latest.grossEarnings ?? 0}
              tone="lime"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
            <BreakdownCard
              title="Deductions"
              items={deductionItems}
              total={latest.totalDeductions ?? 0}
              tone="slate"
            />
          </Grid.Col>
        </Grid>

        {aiFeaturesEnabled ? (
          <Card withBorder radius="lg" p="lg" className="staff-app-surface">
            <Group justify="space-between" align="flex-start" gap="md">
              <Box>
                <Text fw={700}>AI Pay Insights</Text>
                <Text size="sm" c="dimmed" mt={4}>
                  Pick two pay slips and get a quick explanation of the difference.
                </Text>
              </Box>

              <Button
                variant="light"
                color="lime"
                onClick={() => setOpened((current) => !current)}
              >
                {opened ? "Hide" : "Compare Periods"}
              </Button>
            </Group>

            <Collapse in={opened}>
              <Stack mt="md" gap="md">
                <SimpleGrid cols={{ base: 1, md: 2 }} className="staff-form-grid">
                  <Select
                    label="Earlier statement"
                    placeholder="Choose statement A"
                    data={comparisonOptions}
                    value={periodA?.id ?? null}
                    onChange={(value) => {
                      const selected = comparisonOptions.find((item) => item.value === value);
                      setPeriodA(selected?.raw ?? null);
                    }}
                  />
                  <Select
                    label="Later statement"
                    placeholder="Choose statement B"
                    data={comparisonOptions}
                    value={periodB?.id ?? null}
                    onChange={(value) => {
                      const selected = comparisonOptions.find((item) => item.value === value);
                      setPeriodB(selected?.raw ?? null);
                    }}
                  />
                </SimpleGrid>

                <Button
                  color="lime"
                  loading={comparing}
                  disabled={!periodA || !periodB}
                  onClick={async () => {
                    try {
                      setComparing(true);
                      const res = await fetch("/api/ai/payroll/compare", {
                        method: "POST",
                        body: JSON.stringify({ periodA, periodB }),
                      });

                      if (!res.ok) {
                        throw new Error("Unable to compare pay periods");
                      }

                      const json = (await res.json()) as PayCompareResponse;
                      setResult(json);
                    } catch (error) {
                      notifications.show({
                        title: "Comparison failed",
                        message:
                          error instanceof Error
                            ? error.message
                            : "Please try again.",
                        color: "red",
                      });
                    } finally {
                      setComparing(false);
                    }
                  }}
                >
                  Compare Statements
                </Button>

                {result ? (
                  <Card withBorder radius="lg" p="md" className="staff-app-surface">
                    <Stack gap="sm">
                      <Box>
                        <Text fw={700}>Summary</Text>
                        <Text size="sm" c="dimmed" mt={4}>
                          {result.summary}
                        </Text>
                      </Box>

                      <Divider />

                      <Box>
                        <Text fw={700}>Key drivers</Text>
                        <Stack gap={4} mt="xs">
                          {result.keyDrivers.map((item) => (
                            <Text key={item} size="sm">
                              {item}
                            </Text>
                          ))}
                        </Stack>
                      </Box>

                      {result.increases.length ? (
                        <Box>
                          <Text fw={700}>Increases</Text>
                          <Stack gap={4} mt="xs">
                            {result.increases.map((item) => (
                              <Text key={item} size="sm" c="lime.8">
                                + {item}
                              </Text>
                            ))}
                          </Stack>
                        </Box>
                      ) : null}

                      {result.decreases.length ? (
                        <Box>
                          <Text fw={700}>Decreases</Text>
                          <Stack gap={4} mt="xs">
                            {result.decreases.map((item) => (
                              <Text key={item} size="sm" c="red.7">
                                - {item}
                              </Text>
                            ))}
                          </Stack>
                        </Box>
                      ) : null}

                      {result.recommendation ? (
                        <Box>
                          <Text fw={700}>Recommendation</Text>
                          <Text size="sm" mt={4}>
                            {result.recommendation}
                          </Text>
                        </Box>
                      ) : null}
                    </Stack>
                  </Card>
                ) : null}
              </Stack>
            </Collapse>
          </Card>
        ) : null}

        <SimpleGrid cols={{ base: 1, sm: 2 }} className="staff-form-grid">
          <Button
            radius="lg"
            color="lime"
            onClick={() => router.push("/staff/pay-stub/latest")}
          >
            Open Current Statement
          </Button>
          <Button
            radius="lg"
            variant="default"
            onClick={() => router.push("/staff/pay-history")}
          >
            View Pay History
          </Button>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
