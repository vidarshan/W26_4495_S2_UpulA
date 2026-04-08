'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Button,
  Badge,
  Text,
  Loader,
  Card,
  Group,
  Stack,
  Box,
  SimpleGrid,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
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

  const isMobile = useMediaQuery('(max-width: 768px)', false, {
    getInitialValueInEffect: true,
  });

  useEffect(() => {
    async function fetchHistory() {
      if (!session?.user?.id) return;

      try {
        const res = await fetch(`/api/staff/pay-statements`);
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
        {statements.length === 0 ? (
          <Text c="dimmed">No pay statements found.</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, lg: isMobile ? 1 : 2 }} spacing="md">
            {statements.map((s) => (
              <Card key={s.id} withBorder radius="lg" p="md" className="staff-app-surface">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text fw={700}>Pay Date</Text>
                      <Text>{new Date(s.payDate).toLocaleDateString()}</Text>
                    </div>
                    <Badge color="lime" variant="light" size="lg">
                      ${s.netEarnings.toFixed(2)}
                    </Badge>
                  </Group>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <Box>
                      <Text size="sm" c="dimmed">
                        Period Start
                      </Text>
                      <Text fw={600}>
                        {new Date(s.payPeriodStart).toLocaleDateString()}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="sm" c="dimmed">
                        Period End
                      </Text>
                      <Text fw={600}>
                        {new Date(s.payPeriodEnd).toLocaleDateString()}
                      </Text>
                    </Box>
                  </SimpleGrid>

                  <Button
                    variant="outline"
                    fullWidth
                    component={Link}
                    href={`/staff/pay-stub/${s.id}`}
                  >
                    View details
                  </Button>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Card>
    </Container>
  );
}
