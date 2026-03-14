'use client';

import { useEffect, useState } from 'react';
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
} from '@mantine/core';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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

  useEffect(() => {
    async function fetchHistory() {
      // Use hardcoded ID for testing or session ID
      const userId = '3b32d468-9f20-4808-9f25-bffabed6a9cb';
      try {
        const res = await fetch(`/api/staff/${userId}/pay-statements`);
        const data = await res.json();
        setStatements(data);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [session]);

  if (loading)
    return (
      <Container py="xl" ta="center">
        <Loader size="xl" />
      </Container>
    );

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="xl">
        Payment History
      </Title>

      <Card withBorder radius="md" p="md">
        <Table striped highlightOnHover verticalSpacing="md">
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
            {statements.map((s) => (
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
                      href={`/pay/${s.id}`}
                    >
                      Details
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Container>
  );
}
