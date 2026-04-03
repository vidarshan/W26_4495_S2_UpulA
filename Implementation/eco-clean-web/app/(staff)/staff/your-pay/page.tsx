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

const COLORS = ["#1f6b8f", "#eb7a2f", "#2e7d32"];

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
  const b = data.breakdown || {};
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

  const gross = data.grossEarnings || 0;
  const deductions = data.totalDeductions || 0;
  const net = data.netEarnings || 0;

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
              {new Date(data.payDate).toLocaleDateString()}
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