"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  Center,
  Container,
  Grid,
  Group,
  Loader,
  Paper,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";

type ChartDatum = {
  name: string;
  value: number;
  color?: string;
};

type PaySummary = {
  gross: number;
  totalDeductions: number;
  net: number;
};

type PayDetails = {
  regularAmount?: number | null;
  otAmount?: number | null;
  transportAllowance?: number | null;
  federalTax?: number | null;
  ei?: number | null;
  cpp?: number | null;
  health?: number | null;
  other?: number | null;
};

type PayData = {
  chartData: ChartDatum[];
  summary: PaySummary;
  details?: PayDetails | null;
};

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function YourPayPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchPayData() {
      try {
        const userId =
          session?.user?.id || "3b32d468-9f20-4808-9f25-bffabed6a9cb";

        const res = await fetch(
          `/api/staff/pay-statements/latest`
        );

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

  const earningsBreakdown = useMemo(
    () => [
      { label: "Regular Amount", value: data?.details?.regularAmount || 0 },
      { label: "OT Amount", value: data?.details?.otAmount || 0 },
      {
        label: "Transport Allowance",
        value: data?.details?.transportAllowance || 0,
      },
    ],
    [data],
  );

  const deductionBreakdown = useMemo(
    () => [
      { label: "Federal Tax", value: data?.details?.federalTax || 0 },
      { label: "EI", value: data?.details?.ei || 0 },
      { label: "CPP", value: data?.details?.cpp || 0 },
      { label: "Health", value: data?.details?.health || 0 },
      { label: "Other", value: data?.details?.other || 0 },
    ],
    [data],
  );

  const chartTotal = useMemo(
    () => data?.chartData.reduce((sum, item) => sum + item.value, 0) ?? 0,
    [data],
  );

  if (loading) {
    return (
      <Container p={0} className="staff-app-page">
        <Center mih="70vh">
          <Stack align="center" gap="sm">
            <Loader size="lg" color="lime" />
            <Text c="dimmed">Loading your latest statement...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container p={0} className="staff-app-page">
        <Center mih="70vh">
          <Paper withBorder radius="lg" p="xl" className="staff-app-surface">
            <Stack align="center" gap="xs">
              <Title order={3}>No pay statement found</Title>
              <Text c="dimmed" ta="center">
                Your latest pay details will appear here when a statement is available.
              </Text>
            </Stack>
          </Paper>
        </Center>
      </Container>
    );
  }

  return (
    <Container p={0} className="staff-app-page">
      <Stack gap="md" p="md">
        <Card
          radius="lg"
          withBorder
          p="lg"
          className="staff-app-surface staff-app-surface--hero"
        >
          <Stack gap="xs">
            <Title order={3}>Your Pay</Title>
            <Text c="dimmed" size="sm">
              Review your latest earnings, deductions, and available statements.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mt="md">
            <PayStatCard label="Gross Earnings" value={formatMoney(data.summary.gross)} />
            <PayStatCard
              label="Total Deductions"
              value={formatMoney(data.summary.totalDeductions)}
            />
            <PayStatCard label="Net Earnings" value={formatMoney(data.summary.net)} accent />
          </SimpleGrid>
        </Card>

        <Grid gutter="md">
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Card radius="lg" withBorder p="lg" className="staff-app-surface">
              <Stack gap="xs" mb="sm">
                <Text fw={700}>Gross pay breakdown</Text>
                <Text size="sm" c="dimmed">
                  A quick view of how your current gross pay is composed.
                </Text>
              </Stack>

              <Stack align="center" gap="md" py="sm">
                <RingProgress
                  size={220}
                  thickness={24}
                  roundCaps
                  sections={data.chartData.map((item) => ({
                    value: chartTotal ? (item.value / chartTotal) * 100 : 0,
                    color: item.color ?? "lime",
                  }))}
                  label={
                    <Stack gap={0} align="center">
                      <Text size="xs" c="dimmed" fw={700}>
                        Net Pay
                      </Text>
                      <Text fw={800}>{formatMoney(data.summary.net)}</Text>
                    </Stack>
                  }
                />

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" w="100%">
                  {data.chartData.map((item) => (
                    <Paper key={item.name} withBorder radius="lg" p="sm">
                      <Group justify="space-between" gap="xs" wrap="nowrap">
                        <Group gap="xs" wrap="nowrap">
                          <Box
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              background: `var(--mantine-color-${item.color ?? "lime"}-6)`,
                              flexShrink: 0,
                            }}
                          />
                          <Text size="sm" c="dimmed">
                            {item.name}
                          </Text>
                        </Group>
                        <Text fw={700}>{formatMoney(item.value)}</Text>
                      </Group>
                    </Paper>
                  ))}
                </SimpleGrid>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Stack gap="md">
              <BreakdownCard
                title="Earnings"
                total={data.summary.gross}
                items={earningsBreakdown}
              />
              <BreakdownCard
                title="Deductions"
                total={data.summary.totalDeductions}
                items={deductionBreakdown}
              />
            </Stack>
          </Grid.Col>
        </Grid>

        <Card radius="lg" withBorder p="lg" className="staff-app-surface">
          <Group grow>
            <Button
              component={Link}
              href="/staff/pay-history"
              radius="md"
              color="lime"
            >
              View Past Statements
            </Button>
            <Button
              component={Link}
              href="/staff/pay-periods"
              radius="md"
              variant="light"
              color="lime"
            >
              View Pay Periods
            </Button>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
}

function PayStatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Paper
      withBorder
      radius="lg"
      p="md"
      style={{
        background: accent
          ? "rgba(130, 201, 30, 0.08)"
          : "rgba(255, 255, 255, 0.72)",
        borderColor: accent
          ? "rgba(130, 201, 30, 0.28)"
          : "rgba(203, 213, 225, 0.85)",
      }}
    >
      <Text size="xs" fw={600} c="dimmed">
        {label}
      </Text>
      <Text size="xl" fw={800} mt={6}>
        {value}
      </Text>
    </Paper>
  );
}

function BreakdownCard({
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
    <Card radius="lg" withBorder p="lg" className="staff-app-surface">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text fw={700}>{title}</Text>
          <Text fw={800}>{formatMoney(total)}</Text>
        </Group>

        <Stack gap="xs">
          {items.map((item) => (
            <Group key={item.label} justify="space-between">
              <Text size="sm" c="dimmed">
                {item.label}
              </Text>
              <Text fw={600}>{formatMoney(item.value)}</Text>
            </Group>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}