'use client';

import {
  Container,
  Title,
  Table,
  Button,
  Group,
  Text,
  Card,
  Badge,
  Loader,
  Center,
  Stack,
  Divider,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Leave = {
  id: string;
  type: string;
  startAt: string;
  endAt: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  staff: {
    name?: string; //Upul
  };
};

export default function LeaveApprovalPage() {
  const [leaveRequests, setLeaveRequests] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/leave');
      const data = await res.json();
      setLeaveRequests(data);
    } catch (err) {
      console.error('Failed to fetch leave requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const updateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await fetch(`/api/admin/leave/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      fetchLeaves(); // refresh
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const getBadgeColor = (status: string) => {
    if (status === 'APPROVED') return 'green';
    if (status === 'REJECTED') return 'red';
    return 'yellow';
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Title order={2}>Leave Requests</Title>

        <Divider label="Pending & Processed Requests" labelPosition="center" />

        <Card withBorder radius="md">
          {loading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : (
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr bg="gray.1">
                  <Table.Th>Employee</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Start</Table.Th>
                  <Table.Th>End</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {leaveRequests.length > 0 ? (
                  leaveRequests.map((l) => (
                    <Table.Tr key={l.id}>
                      <Table.Td>
                        {l.staff?.name}
                      </Table.Td>

                      <Table.Td>{l.type.replaceAll('_', ' ')}</Table.Td>

                      <Table.Td>
                        {new Date(l.startAt).toLocaleDateString()}
                      </Table.Td>

                      <Table.Td>
                        {new Date(l.endAt).toLocaleDateString()}
                      </Table.Td>

                      <Table.Td>
                        <Badge color={getBadgeColor(l.status)} variant="light">
                          {l.status}
                        </Badge>
                      </Table.Td>

                      <Table.Td ta="right">
                        <Group gap="xs" justify="flex-end">
                          <Button
                            size="xs"
                            color="green"
                            variant="light"
                            disabled={l.status !== 'PENDING'}
                            onClick={() => updateStatus(l.id, 'APPROVED')}
                          >
                            Approve
                          </Button>

                          <Button
                            size="xs"
                            color="red"
                            variant="light"
                            disabled={l.status !== 'PENDING'}
                            onClick={() => updateStatus(l.id, 'REJECTED')}
                          >
                            Reject
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={6} ta="center" py="xl">
                      <Text c="dimmed">No leave requests found.</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      </Stack>
    </Container>
  );
}