"use client";

import { useEffect, useState } from "react";
import {
  Container,
  Title,
  Table,
  Button,
  Badge,
  Text,
  Loader,
  Card,
  Group,
  ScrollArea,
  Stack,
  Box,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useSession } from "next-auth/react";
import Link from "next/link";

type PayStatement = {
  id: string;
  payDate: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  netEarnings: number;
};

type SessionUser = {
  id: string;
  name?: string;
  email?: string;
};

export default function PayHistoryPage() {
  const { data: session } = useSession();
  const [statements, setStatements] = useState<PayStatement[]>([]);
  const [loading, setLoading] = useState(true);

  const isMobile = useMediaQuery("(max-width: 768px)");

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
          <Loader size="xl" />
        </Box>
      </Container>
    );
  }

  return (
    <Container fluid px="md" py="xl" className="staff-app-page">
      <Title order={2} ta="center" mb="xl">
        Manage Pay Periods
      </Title>

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
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text fw={700}>Pay Date</Text>
                      <Text>{new Date(s.payDate).toLocaleDateString()}</Text>
                    </Group>

                    <Group justify="space-between">
                      <Text fw={700}>Period Start</Text>
                      <Text>
                        {new Date(s.payPeriodStart).toLocaleDateString()}
                      </Text>
                    </Group>

                    <Group justify="space-between">
                      <Text fw={700}>Period End</Text>
                      <Text>
                        {new Date(s.payPeriodEnd).toLocaleDateString()}
                      </Text>
                    </Group>

                    <Group justify="space-between">
                      <Text fw={700}>Net Earnings</Text>
                      <Badge color="green" variant="light" size="lg">
                        ${s.netEarnings.toFixed(2)}
                      </Badge>
                    </Group>

                    <Button
                      mt="sm"
                      variant="outline"
                      color="blue"
                      fullWidth
                      component={Link}
                      href={`/staff/pay-stub/${s.id}`}
                    >
                      Details
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
                            variant="outline"
                            color="blue"
                            size="xs"
                            component={Link}
                            href={`/staff/pay-stub/${s.id}`}
                          >
                            Details
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
    </Container>
  );
}
