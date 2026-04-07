"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Stack,
  Text,
  Title,
  Loader,
  Center,
  Divider,
} from "@mantine/core";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Collapse, Select } from "@mantine/core";


const COLORS = ["#1f6b8f", "#eb7a2f", "#2e7d32"];

export default function YourPayPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  const [periodA, setPeriodA] = useState<any>(null);
  const [periodB, setPeriodB] = useState<any>(null);

  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    async function fetchPayData() {
      try {
        const userId =
          session?.user?.id;

        const res = await fetch(
          `/api/staff/pay-statements/latest`
        );

        const res2 = await fetch("/api/staff/pay-statements/latest");
        const historyData = await res2.json();

        setHistory(historyData.all || []);

        // ✅ Auto-select defaults
        if (historyData.all && historyData.all.length >= 2) {
          setPeriodB(historyData.all[0]); // latest
          setPeriodA(historyData.all[1]); // previous
        }

        if (!res.ok) throw new Error("Failed to fetch");

        const result = await res.json();
        console.log("📦 PAY DATA:", result);

        setData(result);
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
        <Loader size="xl" color="#125f82" />
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
    <Container size="lg" py="xl">
      <Title ta="center" mb="lg">
        Pay Statement
      </Title>

      {/* 🔥 EMPLOYEE BLOCK */}
      <Card withBorder radius="md" p="md" mb="lg">
        <Group justify="space-between">
          <Box>
            <Text fw={700}>Employee</Text>
            <Text>{data.employeeName}</Text>
          </Box>

          <Box>
            <Text fw={700}>Employee ID</Text>
            <Text>{data.employeeId}</Text>
          </Box>

          <Box>
            <Text fw={700}>Pay Date</Text>
            <Text>
              {new Date(latest.payDate).toLocaleDateString()}
            </Text>
          </Box>
        </Group>
      </Card>

      <Grid gutter="xl">
        {/* 🔥 CHART */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card p="lg" withBorder radius="md">
            <Title order={4} ta="center" mb="md">
              Earnings Distribution
            </Title>

            <Box h={320}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Regular", value: b.regularAmount || 0 },
                      { name: "OT", value: b.otAmount || 0 },
                      { name: "Allowance", value: b.transportAllowance || 0 },
                    ]}
                    dataKey="value"
                    outerRadius={110}
                    label
                  >
                    {earningsBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid.Col>

        {/* 🔥 SUMMARY */}
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

            <Card withBorder p="md" radius="md" bg="#e6f4ea">
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
                <Text fw={600}>
                  ${ytd.net?.toFixed(2) || "0.00"}
                </Text>
              </Group>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>

      <Card withBorder radius="md" mt="xl">
        <Group justify="space-between">
          <Text fw={700}>AI Pay Insights</Text>

          <Button
            variant="subtle"
            onClick={() => setOpened((o) => !o)}
          >
            {opened ? "Hide" : "Compare Pay Periods"}
          </Button>
        </Group>

        <Collapse in={opened}>
          <Stack mt="md">

            {/* Selectors */}
            <Group grow>
              <Select
                placeholder="Select Period A"
                data={historyOptionsA}
                value={periodA?.id}
                onChange={(value) => {
                  const selected = historyOptionsA.find((p) => p.value === value);
                  setPeriodA(selected?.raw);
                  setPeriodB(null);
                }}
              />

              <Select
                placeholder="Select Period B"
                data={historyOptionsB}
                value={periodB?.id}
                onChange={(value) => {
                  const selected = historyOptionsB.find((p) => p.value === value);
                  setPeriodB(selected?.raw);
                }}

              />
            </Group>

            <Button
              onClick={async () => {
                const res = await fetch("/api/ai/payroll/compare", {
                  method: "POST",
                  body: JSON.stringify({
                    periodA,
                    periodB,
                  }),
                });

                const json = await res.json();
                setResult(json);
              }}
            >
              Compare
            </Button>

            {/* Result */}
            {result && (
              <Card withBorder mt="md">
                <Text fw={700}>Summary</Text>
                <Text mb="sm">{result.summary}</Text>

                <Text fw={700}>Key Drivers</Text>
                {result.keyDrivers.map((d: string, i: number) => (
                  <Text key={i}>• {d}</Text>
                ))}

                <Text fw={700} mt="sm">Increases</Text>
                {result.increases.map((d: string, i: number) => (
                  <Text key={i} c="green">+ {d}</Text>
                ))}

                <Text fw={700} mt="sm">Decreases</Text>
                {result.decreases.map((d: string, i: number) => (
                  <Text key={i} c="red">- {d}</Text>
                ))}

                {result.recommendation && (
                  <>
                    <Text fw={700} mt="sm">Recommendation</Text>
                    <Text>{result.recommendation}</Text>
                  </>
                )}
              </Card>
            )}
          </Stack>
        </Collapse>
      </Card>

      {/* 🔥 BUTTONS (CENTERED CLEAN) */}
      <Group justify="center" mt={50}>
        <Stack align="center" gap="md">
          <Button
            size="lg"
            radius="md"
            w={320}
            styles={{
              root: {
                height: 58,
                backgroundColor: "#125f82",
                fontSize: "1.1rem",
              },
            }}
            onClick={() => router.push("/staff/pay-stub")}
          >
            Current Statement
          </Button>

          <Button
            size="lg"
            radius="md"
            w={320}
            variant="outline"
            onClick={() => router.push("/staff/pay-history")}
          >
            View History
          </Button>
        </Stack>
      </Group>
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
    <Card withBorder p="md" radius="md">
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