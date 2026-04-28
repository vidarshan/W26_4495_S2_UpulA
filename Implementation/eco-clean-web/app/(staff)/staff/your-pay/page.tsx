"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  Container,
  Divider,
  Grid,
  Group,
  Center,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Loader from "@/app/components/UI/Loader";

const COLORS = ["#82c91e", "#607b3a", "#1ec99b"];

type PayHistoryPeriod = {
  id: string;
  payPeriodStart: string;
  payPeriodEnd: string;
};

type PayComparisonResult = {
  summary: string;
  keyDrivers: string[];
  increases: string[];
  decreases: string[];
  recommendation?: string;
};

type LatestPayBreakdown = {
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

type LatestPayStatement = {
  payDate?: string;
  grossEarnings?: number;
  totalDeductions?: number;
  netEarnings?: number;
  breakdown?: LatestPayBreakdown;
};

type PayPageData = {
  latest?: LatestPayStatement;
  employeeName?: string;
  employeeId?: string;
  ytd?: {
    gross?: number;
    deductions?: number;
    net?: number;
  };
  all?: PayHistoryPeriod[];
};

export default function YourPayPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<PayPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [result, setResult] = useState<PayComparisonResult | null>(null);
  const router = useRouter();

  const [periodA, setPeriodA] = useState<PayHistoryPeriod | null>(null);
  const [periodB, setPeriodB] = useState<PayHistoryPeriod | null>(null);

  const [history, setHistory] = useState<PayHistoryPeriod[]>([]);

  useEffect(() => {
    async function fetchPayData() {
      try {
        const res = await fetch(`/api/staff/pay-statements/latest`);

        const res2 = await fetch("/api/staff/pay-statements/latest");
        const historyData: PayPageData = await res2.json();

        setHistory(historyData.all || []);

        // ✅ Auto-select defaults
        if (historyData.all && historyData.all.length >= 2) {
          setPeriodB(historyData.all[0]); // latest
          setPeriodA(historyData.all[1]); // previous
        }

        if (!res.ok) throw new Error("Failed to fetch");

        const responseData: PayPageData = await res.json();
        setData(responseData);
      } catch (err) {
        console.error("Error fetching pay data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPayData();
  }, [session]);

  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
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

  // ✅ CORRECT SOURCE
  const latest = data.latest || {};
  const b = latest.breakdown || {};
  const ytd = data.ytd || {};

  const earningsBreakdown = [
    { label: "Regular", value: b.regularAmount || 0 },
    { label: "Overtime", value: b.otAmount || 0 },
    { label: "Allowance", value: b.transportAllowance || 0 },
  ];

  const deductionBreakdown = [
    { label: "Federal Tax", value: b.federalTax || 0 },
    { label: "Quebec Tax", value: b.quebecTax || 0 },
    { label: "EI", value: b.ei || 0 },
    { label: "QPP", value: b.qpp || 0 },
    { label: "QPIP", value: b.qpip || 0 },
    { label: "Other", value: b.other || 0 },
  ];

  const gross = latest.grossEarnings || 0;
  const deductions = latest.totalDeductions || 0;
  const net = latest.netEarnings || 0;

  const historyOptionsB = history
    .filter((p) => {
      if (!periodA) return true; // before A is selected, show all

      const selectedA = new Date(periodA.payPeriodStart);
      const current = new Date(p.payPeriodStart);

      return current > selectedA; // only newer periods
    })
    .map((p) => ({
      value: p.id,
      label: `${new Date(p.payPeriodStart).toLocaleDateString()} - ${new Date(p.payPeriodEnd).toLocaleDateString()}`,
      raw: p,
    }));

  const historyOptionsA = history.slice(1).map((p) => ({
    value: p.id,
    label: `${new Date(p.payPeriodStart).toLocaleDateString()} - ${new Date(p.payPeriodEnd).toLocaleDateString()}`,
    raw: p,
  }));

  return (
    <Container
      size="lg"
      py="xl"
      px={{ base: "sm", sm: "md" }}
      className="staff-app-page"
    >
      <Stack gap="xl">
        <Card
          withBorder
          radius="lg"
          p={{ base: "md", sm: "lg" }}
          className="staff-app-surface staff-app-surface--hero"
        >
          <Stack gap="lg">
            <Group justify="space-between" align="end" gap="md">
              <Box>
                <Title order={3}>Your Pay</Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Review the latest payroll breakdown, compare periods, and jump
                  into detailed statements.
                </Text>
              </Box>

              <Group gap="xs" wrap="wrap">
                <Badge variant="light" color="lime">
                  Net ${net.toFixed(2)}
                </Badge>
                <Badge variant="light" color="blue">
                  Gross ${gross.toFixed(2)}
                </Badge>
                <Badge variant="light" color="gray">
                  Deductions ${deductions.toFixed(2)}
                </Badge>
              </Group>
            </Group>

            <SimpleMetricGroup>
              <Box maw={220}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Employee
                </Text>
                <Text fw={600}>{data.employeeName}</Text>
              </Box>

              <Box maw={180}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Employee ID
                </Text>
                <Text fw={600}>{data.employeeId}</Text>
              </Box>

              <Box maw={180}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Pay Date
                </Text>
                <Text fw={600}>
                  {latest.payDate
                    ? new Date(latest.payDate).toLocaleDateString()
                    : "N/A"}
                </Text>
              </Box>
            </SimpleMetricGroup>
          </Stack>
        </Card>

        <Grid gutter={{ base: "md", md: "xl" }}>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card
              p={{ base: "md", sm: "lg" }}
              withBorder
              radius="lg"
              className="staff-app-surface"
            >
              <Title order={4} mb="xs">
                Earnings Distribution
              </Title>
              <Text size="sm" c="dimmed" mb="md">
                Visual breakdown of regular earnings, overtime, and allowances
                for the latest statement.
              </Text>

              <Box
                h={320}
                px="sm"
                py="md"
                style={{
                  borderRadius: 16,
                  border: "1px solid var(--mantine-color-gray-2)",
                  background:
                    "linear-gradient(180deg, rgba(248,249,250,0.9) 0%, rgba(255,255,255,1) 100%)",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Regular", value: b.regularAmount || 0 },
                        { name: "OT", value: b.otAmount || 0 },
                        { name: "Allowance", value: b.transportAllowance || 0 },
                      ]}
                      dataKey="value"
                      innerRadius={58}
                      outerRadius={98}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {earningsBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        `$${Number(value ?? 0).toFixed(2)}`,
                        "Amount",
                      ]}
                      contentStyle={{
                        borderRadius: 16,
                        border: "1px solid var(--mantine-color-gray-3)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>

              <Group gap="xs" wrap="wrap" mt="lg">
                {earningsBreakdown.map((item, index) => (
                  <Badge
                    key={item.label}
                    variant="light"
                    style={{
                      backgroundColor: `${COLORS[index]}1A`,
                      color: COLORS[index],
                      border: `1px solid ${COLORS[index]}33`,
                    }}
                  >
                    {item.label}: ${item.value.toFixed(2)}
                  </Badge>
                ))}
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="lg">
              <SummaryBlock
                title="Gross Earnings"
                total={gross}
                items={earningsBreakdown}
                ytd={ytd.gross}
              />

              <SummaryBlock
                title="Total Deductions"
                total={deductions}
                items={deductionBreakdown}
                ytd={ytd.deductions}
              />

              <Card
                withBorder
                p={{ base: "md", sm: "lg" }}
                radius="lg"
                bg="#e6f4ea"
              >
                <Group justify="space-between">
                  <Text fw={700} size="lg">
                    Net Earnings
                  </Text>
                  <Text fw={700} size="lg">
                    ${net.toFixed(2)}
                  </Text>
                </Group>

                <Divider my="sm" />

                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    YTD Net
                  </Text>
                  <Text fw={600}>${ytd.net?.toFixed(2) || "0.00"}</Text>
                </Group>
              </Card>
            </Stack>
          </Grid.Col>
        </Grid>

        <Card
          withBorder
          radius="lg"
          p={{ base: "md", sm: "lg" }}
          className="staff-app-surface"
        >
          <Stack gap="md">
            <Group justify="space-between" align="end" gap="md">
              <Box>
                <Text fw={700}>AI Pay Insights</Text>
                <Text size="sm" c="dimmed" mt={4}>
                  Compare two pay periods to understand changes in earnings and
                  deductions.
                </Text>
              </Box>

              <Button variant="light" onClick={() => setOpened((o) => !o)}>
                {opened ? "Hide Comparison" : "Compare Pay Periods"}
              </Button>
            </Group>

            <Collapse in={opened}>
              <Stack mt="xs" gap="md">
                <Group grow>
                  <Select
                    placeholder="Select Period A"
                    data={historyOptionsA}
                    value={periodA?.id}
                    onChange={(value) => {
                      const selected = historyOptionsA.find(
                        (p) => p.value === value,
                      );
                      setPeriodA(selected?.raw ?? null);
                      setPeriodB(null);
                    }}
                  />

                  <Select
                    placeholder="Select Period B"
                    data={historyOptionsB}
                    value={periodB?.id}
                    onChange={(value) => {
                      const selected = historyOptionsB.find(
                        (p) => p.value === value,
                      );
                      setPeriodB(selected?.raw ?? null);
                    }}
                  />
                </Group>

                <Group justify="flex-end">
                  <Button
                    onClick={async () => {
                      const res = await fetch("/api/ai/payroll/compare", {
                        method: "POST",
                        body: JSON.stringify({
                          periodA,
                          periodB,
                        }),
                      });

                      const json: PayComparisonResult = await res.json();
                      setResult(json);
                    }}
                  >
                    Compare
                  </Button>
                </Group>

                {result && (
                  <Card withBorder radius="lg" className="staff-app-surface">
                    <Text fw={700}>Summary</Text>
                    <Text mb="sm">{result.summary}</Text>

                    <Text fw={700}>Key Drivers</Text>
                    {result.keyDrivers.map((d, i) => (
                      <Text key={i}>• {d}</Text>
                    ))}

                    <Text fw={700} mt="sm">
                      Increases
                    </Text>
                    {result.increases.map((d, i) => (
                      <Text key={i} c="green">
                        + {d}
                      </Text>
                    ))}

                    <Text fw={700} mt="sm">
                      Decreases
                    </Text>
                    {result.decreases.map((d, i) => (
                      <Text key={i} c="red">
                        - {d}
                      </Text>
                    ))}

                    {result.recommendation && (
                      <>
                        <Text fw={700} mt="sm">
                          Recommendation
                        </Text>
                        <Text>{result.recommendation}</Text>
                      </>
                    )}
                  </Card>
                )}
              </Stack>
            </Collapse>
          </Stack>
        </Card>

        <Card
          withBorder
          radius="lg"
          p={{ base: "md", sm: "lg" }}
          className="staff-app-surface"
        >
          <Group justify="center" gap="md" wrap="wrap">
            <Button
              size="md"
              radius="lg"
              variant="default"
              onClick={() => router.push("/staff/pay-stub/latest")}
              fullWidth
            >
              Current Statement
            </Button>

            <Button
              size="md"
              radius="lg"
              variant="default"
              onClick={() => router.push("/staff/pay-history")}
              fullWidth
            >
              View History
            </Button>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
}

/* 🔥 CLEAN SUMMARY BLOCK */
function SummaryBlock({
  title,
  total,
  items,
  ytd,
}: {
  title: string;
  total: number;
  items: { label: string; value: number }[];
  ytd?: number;
}) {
  return (
    <Card
      withBorder
      p={{ base: "md", sm: "lg" }}
      radius="lg"
      className="staff-app-surface"
    >
      <Group justify="space-between">
        <Text fw={700}>{title}</Text>
        <Text fw={700}>${total.toFixed(2)}</Text>
      </Group>

      <Divider my="sm" />

      <Stack gap={6}>
        {items.map((item) => (
          <Group key={item.label} justify="space-between">
            <Text size="sm">{item.label}</Text>
            <Text size="sm">${item.value.toFixed(2)}</Text>
          </Group>
        ))}
      </Stack>

      {ytd !== undefined && (
        <>
          <Divider my="sm" />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              YTD
            </Text>
            <Text fw={600}>${ytd.toFixed(2)}</Text>
          </Group>
        </>
      )}
    </Card>
  );
}

function SimpleMetricGroup({ children }: { children: React.ReactNode }) {
  return (
    <Group
      gap="lg"
      wrap="wrap"
      align="start"
      style={{ rowGap: 12, columnGap: 24 }}
    >
      {children}
    </Group>
  );
}
