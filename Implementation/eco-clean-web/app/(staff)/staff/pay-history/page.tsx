"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Loader from "@/app/components/UI/Loader";

type PayStatement = {
  id: string;
  payDate: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  netEarnings: number;
};

export default function PayHistoryPage() {
  const { data: session } = useSession();
  const [statements, setStatements] = useState<PayStatement[]>([]);
  const [loading, setLoading] = useState(true);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const totalNet = statements.reduce(
    (sum, statement) => sum + statement.netEarnings,
    0,
  );

  useEffect(() => {
    async function fetchHistory() {
      if (!session?.user?.id) return;

      try {
        const res = await fetch(`/api/staff/pay-statements`);
        const data = await res.json();
        setStatements(data);
      } catch (error) {
        console.error("Error loading history:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [session]);

  if (loading) {
    return (
      <Container fluid py="xl">
        <Box ta="center" py="xl">
          <Loader />
        </Box>
      </Container>
    );
  }

  return (
    <Container fluid px="md" py="xl" className="staff-app-page">
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
                <Title order={3}>Pay History</Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Review previous pay statements and open the full stub for any
                  completed pay period.
                </Text>
              </Box>

              <Group gap="xs" wrap="wrap">
                <Badge variant="light" color="lime">
                  {statements.length} statements
                </Badge>
                <Badge variant="light" color="gray">
                  ${totalNet.toFixed(2)} total net
                </Badge>
              </Group>
            </Group>
          </Stack>
        </Card>

        <Card withBorder radius="lg" p="md" className="staff-app-surface">
          {isMobile ? (
            <Stack gap="md">
              {statements.length === 0 ? (
                <Text c="dimmed">No pay statements found.</Text>
              ) : (
                statements.map((s) => (
                  <Card
                    key={s.id}
                    withBorder
                    radius="lg"
                    p="md"
                    className="staff-app-surface"
                  >
                    <Stack gap="sm">
                      <Group justify="space-between" align="start">
                        <Box>
                          <Text size="xs" tt="uppercase" c="dimmed" fw={700}>
                            Pay Date
                          </Text>
                          <Text fw={700}>
                            {new Date(s.payDate).toLocaleDateString()}
                          </Text>
                        </Box>

                        <Badge color="green" variant="light" size="lg">
                          ${s.netEarnings.toFixed(2)}
                        </Badge>
                      </Group>

                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Period Start
                        </Text>
                        <Text size="sm">
                          {new Date(s.payPeriodStart).toLocaleDateString()}
                        </Text>
                      </Group>

                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Period End
                        </Text>
                        <Text size="sm">
                          {new Date(s.payPeriodEnd).toLocaleDateString()}
                        </Text>
                      </Group>

                      <Button
                        mt="xs"
                        variant="default"
                        fullWidth
                        radius="lg"
                        size="md"
                        component={Link}
                        href={`/staff/pay-stub/${s.id}`}
                      >
                        Open Statement
                      </Button>
                    </Stack>
                  </Card>
                ))
              )}
            </Stack>
          ) : (
            <ScrollArea>
              <Table
                striped
                highlightOnHover
                verticalSpacing="md"
                horizontalSpacing="lg"
                miw={900}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Pay Date</Table.Th>
                    <Table.Th>Period Start</Table.Th>
                    <Table.Th>Period End</Table.Th>
                    <Table.Th>Net Earnings</Table.Th>
                    <Table.Th ta="right">Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody>
                  {statements.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text ta="center" c="dimmed">
                          No pay statements found.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    statements.map((s) => (
                      <Table.Tr key={s.id}>
                        <Table.Td>
                          <Text fw={700}>
                            {new Date(s.payDate).toLocaleDateString()}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {new Date(s.payPeriodStart).toLocaleDateString()}
                        </Table.Td>
                        <Table.Td>
                          {new Date(s.payPeriodEnd).toLocaleDateString()}
                        </Table.Td>
                        <Table.Td>
                          <Badge color="green" variant="light" size="lg">
                            ${s.netEarnings.toFixed(2)}
                          </Badge>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Group justify="flex-end">
                            <Button
                              variant="default"
                              size="md"
                              radius="lg"
                              component={Link}
                              href={`/staff/pay-stub/${s.id}`}
                            >
                              Open Statement
                            </Button>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
