"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import {
  IoCalendarClear,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoTime,
} from "@/lib/icons";
import AdminPageFrame from "@/app/components/admin/AdminPageFrame";
import Loader from "@/app/components/UI/Loader";

type Leave = {
  id: string;
  type: string;
  startAt: string;
  endAt: string;
  reason?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  staff: {
    name?: string;
  };
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getBadgeColor(status: Leave["status"]) {
  if (status === "APPROVED") return "lime";
  if (status === "REJECTED") return "red";
  return "yellow";
}

export default function LeaveApprovalPage() {
  const [leaveRequests, setLeaveRequests] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaves = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/leave", { cache: "no-store" });

      if (!res.ok) {
        throw new Error("Failed to load leave requests.");
      }

      const data = (await res.json()) as Leave[];
      setLeaveRequests(data);
    } catch (err) {
      console.error("Failed to fetch leave requests", err);
      setError(
        err instanceof Error ? err.message : "Failed to load leave requests.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLeaves();
  }, []);

  const updateStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    setUpdatingId(id);

    try {
      const res = await fetch(`/api/admin/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error("Failed to update leave request.");
      }

      await fetchLeaves();
    } catch (err) {
      console.error("Failed to update status", err);
      setError(
        err instanceof Error ? err.message : "Failed to update leave request.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const summary = useMemo(() => {
    const pending = leaveRequests.filter(
      (leave) => leave.status === "PENDING",
    ).length;
    const approved = leaveRequests.filter(
      (leave) => leave.status === "APPROVED",
    ).length;
    const rejected = leaveRequests.filter(
      (leave) => leave.status === "REJECTED",
    ).length;

    return {
      pending,
      approved,
      rejected,
    };
  }, [leaveRequests]);

  return (
    <AdminPageFrame
      eyebrow="Leave management"
      title="Leave Requests"
      description="Review pending requests quickly, keep processed items visible, and make approval decisions without scanning a crowded page."
      stats={[
        {
          label: "Pending",
          value: String(summary.pending),
          icon: IoTime,
        },
        {
          label: "Approved",
          value: String(summary.approved),
          icon: IoCheckmarkCircle,
        },
        {
          label: "Rejected",
          value: String(summary.rejected),
          icon: IoCloseCircle,
        },
      ]}
    >
      <Stack gap="lg">
        {error ? (
          <Alert color="red" title="Unable to load leave requests">
            {error}
          </Alert>
        ) : null}

        <SimpleGrid cols={{ base: 1, lg: 12 }} spacing="lg">
          <Paper radius="lg" style={{ gridColumn: "span 12" }}>
            <Stack gap="lg">
              <Group justify="space-between" align="flex-start" gap="md">
                <div>
                  <Text fw={700} c="#0f172a">
                    Approval list
                  </Text>
                  <Text size="sm" c="#475569" mt={6}>
                    Each row shows the request window, leave type, current
                    status, and approval actions.
                  </Text>
                </div>

                <Badge
                  color="lime"
                  variant="light"
                  radius="xl"
                  leftSection={<IoCalendarClear size={14} />}
                >
                  Sorted by current API order
                </Badge>
              </Group>

              {loading ? (
                <Center py="xl">
                  <Loader />
                </Center>
              ) : (
                <ScrollArea type="auto">
                  <Card p={0} radius="lg" withBorder>
                    <Table.ScrollContainer minWidth={900}>
                      <Table highlightOnHover striped>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Employee</Table.Th>
                            <Table.Th>Leave type</Table.Th>
                            <Table.Th>Dates</Table.Th>
                            <Table.Th>Reason</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th ta="right">Actions</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {leaveRequests.length ? (
                            leaveRequests.map((leave) => (
                              <Table.Tr key={leave.id}>
                                <Table.Td>
                                  <Text fw={600} c="#0f172a">
                                    {leave.staff?.name ||
                                      "Unknown staff member"}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  {leave.type.replaceAll("_", " ")}
                                </Table.Td>
                                <Table.Td>
                                  {formatDate(leave.startAt)} to{" "}
                                  {formatDate(leave.endAt)}
                                </Table.Td>
                                <Table.Td>
                                  {leave.reason || "No reason provided"}
                                </Table.Td>
                                <Table.Td>
                                  <Badge
                                    color={getBadgeColor(leave.status)}
                                    variant="light"
                                  >
                                    {leave.status}
                                  </Badge>
                                </Table.Td>
                                <Table.Td ta="right">
                                  <Group gap="xs" justify="flex-end">
                                    <Button
                                      size="xs"
                                      color="lime"
                                      variant="light"
                                      disabled={leave.status !== "PENDING"}
                                      loading={updatingId === leave.id}
                                      onClick={() =>
                                        updateStatus(leave.id, "APPROVED")
                                      }
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="xs"
                                      color="red"
                                      variant="light"
                                      disabled={leave.status !== "PENDING"}
                                      loading={updatingId === leave.id}
                                      onClick={() =>
                                        updateStatus(leave.id, "REJECTED")
                                      }
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
                    </Table.ScrollContainer>
                  </Card>
                </ScrollArea>
              )}
            </Stack>
          </Paper>
        </SimpleGrid>
      </Stack>
    </AdminPageFrame>
  );
}
