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

const COLORS = ["#1f6b8f", "#eb7a2f", "#2e7d32"];

export default function YourPayPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetching logic to link to your route.ts
  useEffect(() => {
    async function fetchPayData() {
      try {
        // Use session ID or the hardcoded dev ID
        const userId =
          session?.user?.id || "3b32d468-9f20-4808-9f25-bffabed6a9cb";
        const response = await fetch(
          `/api/staff/${userId}/pay-statements/latest`,
        );

        if (!response.ok) throw new Error("Failed to fetch");

        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching pay data:", error);
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

  // 2. Mapping dynamic data from the API response
  const earningsBreakdown = [
    { label: "Regular Amount", value: data.details?.regularAmount || 0 },
    { label: "OT Amount", value: data.details?.otAmount || 0 },
    {
      label: "Transport Allowance",
      value: data.details?.transportAllowance || 0,
    },
  ];

  const deductionBreakdown = [
    { label: "Federal Tax", value: data.details?.federalTax || 0 },
    { label: "EI", value: data.details?.ei || 0 },
    { label: "CPP", value: data.details?.cpp || 0 },
    { label: "Health", value: data.details?.health || 0 },
    { label: "Other", value: data.details?.other || 0 },
  ];

  // Financial totals from API summary
  const { gross, totalDeductions, net } = data.summary;

  return (
    <Container size="lg" py="xl">
      <Title ta="center" mb="xl">
        Your Pay
      </Title>

      <Grid align="start" gutter="xl">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card radius="md" p="xl" bg="transparent" withBorder={false}>
            <Title order={2} ta="center" c="dimmed" mb="md">
              Gross Pay
            </Title>
            <Box h={360}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.chartData} // Uses the pre-formatted chart data from route.ts
                    dataKey="value"
                    nameKey="name"
                    outerRadius={120}
                    label={({ percent, value }) =>
                      `$${value}\n${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {data.chartData.map((entry: any, index: number) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack gap="xl">
            <SummaryBlock
              title="Gross Earnings"
              total={gross}
              items={earningsBreakdown}
            />
            <SummaryBlock
              title="Total Deductions"
              total={totalDeductions}
              items={deductionBreakdown}
            />

            <Card
              radius="lg"
              p="sm"
              style={{
                backgroundColor: "#e9ecef",
                border: "1px solid #dee2e6",
              }}
            >
              <Group justify="space-between">
                <Text fw={700} size="lg">
                  Net Earnings
                </Text>
                <Text fw={700} size="lg">
                  ${net.toFixed(2)}
                </Text>
              </Group>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>

      <Group justify="center" gap="xl" mt={50}>
        <Button
          size="lg"
          radius="md"
          styles={{
            root: {
              minWidth: 320,
              height: 58,
              backgroundColor: "#125f82",
              fontSize: "1.1rem",
              fontWeight: 500,
            },
          }}
          onClick={() => window.open("/pay")}
        >
          Download Current Statements
        </Button>

        <Button
          size="lg"
          radius="md"
          styles={{
            root: {
              minWidth: 320,
              height: 58,
              backgroundColor: "#125f82",
              fontSize: "1.1rem",
              fontWeight: 500,
            },
          }}
        >
          Download Past Statements
        </Button>
      </Group>
    </Container>
  );
}

function SummaryBlock({
  title,
  total,
  items,
}: {
  title: string;
  total: number;
  items: { label: string; value: number }[];
}) {
  return (
    <Box>
      <Card
        radius="lg"
        p="sm"
        style={{ backgroundColor: "#e9ecef", border: "1px solid #dee2e6" }}
      >
        <Group justify="space-between">
          <Text fw={700} size="lg">
            {title}
          </Text>
          <Text fw={700} size="lg">
            ${total.toFixed(2)}
          </Text>
        </Group>
      </Card>
      <Stack gap={8} mt="sm" px="sm">
        {items.map((item) => (
          <Group key={item.label} justify="space-between">
            <Text>{item.label}</Text>
            <Text>${item.value.toFixed(2)}</Text>
          </Group>
        ))}
      </Stack>
    </Box>
  );
}
