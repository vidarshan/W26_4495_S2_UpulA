"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";

type TimesheetPeriod = {
  id: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "LOCKED";
  createdAt: string;
  lockedAt: string | null;
};

type AssignmentItem = {
  id: string;
  appointmentId: string;
  jobTitle: string;
  clientName: string;
  addressLine: string;
  status: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  breakMinutes: number;
  plannedMinutes: number;
  hourlyRateAtTime: number;
  notes: string | null;
};

type DayRow = {
  date: string;
  actualMinutes: number;
  plannedMinutes: number;
  varianceMinutes: number;
  timesheetDayId: string | null;
  hourlyRate: number | null;
  notes: string | null;
  assignments: AssignmentItem[];
};

type EmployeeOverview = {
  staffId: string;
  name: string;
  email: string;
  staffCode: string | null;
  position: string | null;
  timesheetId: string | null;
  timesheetStatus: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  notes: string | null;
  totals: {
    plannedMinutes: number;
    actualMinutes: number;
    varianceMinutes: number;
  };
  days: DayRow[];
};

type OverviewResponse = {
  period: TimesheetPeriod;
  employees: EmployeeOverview[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMinutes(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
}

function varianceColor(value: number) {
  if (value > 0) return "orange";
  if (value < 0) return "blue";
  return "gray";
}

function statusColor(status: string | null) {
  switch (status) {
    case "SUBMITTED":
      return "blue";
    case "APPROVED":
      return "green";
    case "LOCKED":
      return "grape";
    case "OPEN":
      return "gray";
    default:
      return "gray";
  }
}

export default function AdminTimesheetOverviewPage() {
  const [periods, setPeriods] = useState<TimesheetPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPeriods() {
      try {
        setLoadingPeriods(true);
        setError(null);

        const res = await fetch("/api/admin/timesheets/periods", {
          cache: "no-store",
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load periods");
        }

        const data: TimesheetPeriod[] = await res.json();
        setPeriods(data);

        if (data.length > 0) {
          setSelectedPeriodId((prev) => prev ?? data[0].id);
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load periods");
      } finally {
        setLoadingPeriods(false);
      }
    }

    loadPeriods();
  }, []);

  useEffect(() => {
    if (!selectedPeriodId) return;

    async function loadOverview() {
      try {
        setLoadingOverview(true);
        setError(null);

        const res = await fetch(
          `/api/admin/timesheets/periods/${selectedPeriodId}/overview`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load overview");
        }

        const data: OverviewResponse = await res.json();
        setOverview(data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load overview");
      } finally {
        setLoadingOverview(false);
      }
    }

    loadOverview();
  }, [selectedPeriodId]);

  const periodOptions = useMemo(
    () =>
      periods.map((period) => ({
        value: period.id,
        label: `${formatDate(period.startDate)} → ${formatDate(period.endDate)} (${period.status})`,
      })),
    [periods]
  );

  const summary = useMemo(() => {
    if (!overview) {
      return {
        employeeCount: 0,
        totalPlannedMinutes: 0,
        totalActualMinutes: 0,
        totalVarianceMinutes: 0,
      };
    }

    const totalPlannedMinutes = overview.employees.reduce(
      (sum, emp) => sum + emp.totals.plannedMinutes,
      0
    );

    const totalActualMinutes = overview.employees.reduce(
      (sum, emp) => sum + emp.totals.actualMinutes,
      0
    );

    return {
      employeeCount: overview.employees.length,
      totalPlannedMinutes,
      totalActualMinutes,
      totalVarianceMinutes: totalActualMinutes - totalPlannedMinutes,
    };
  }, [overview]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>Admin Timesheet Overview</Title>
          <Text c="dimmed" mt={4}>
            Compare submitted timesheet days against planned assignment time for a selected period.
          </Text>
        </div>

        {error && (
          <Alert color="red" title="Something went wrong">
            {error}
          </Alert>
        )}

        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Select
              label="Timesheet period"
              placeholder={loadingPeriods ? "Loading periods..." : "Select a period"}
              data={periodOptions}
              value={selectedPeriodId}
              onChange={setSelectedPeriodId}
              searchable
              disabled={loadingPeriods || periodOptions.length === 0}
            />

            {overview?.period && (
              <Group gap="sm">
                <Badge color={overview.period.status === "LOCKED" ? "grape" : "green"}>
                  {overview.period.status}
                </Badge>
                <Text size="sm">
                  {formatDate(overview.period.startDate)} → {formatDate(overview.period.endDate)}
                </Text>
                <Text size="sm" c="dimmed">
                  Locked at: {formatDateTime(overview.period.lockedAt)}
                </Text>
              </Group>
            )}
          </Stack>
        </Card>

        {loadingOverview ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : overview ? (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
              <Card withBorder radius="md" p="lg">
                <Text size="sm" c="dimmed">
                  Employees
                </Text>
                <Title order={3}>{summary.employeeCount}</Title>
              </Card>

              <Card withBorder radius="md" p="lg">
                <Text size="sm" c="dimmed">
                  Planned
                </Text>
                <Title order={3}>{formatMinutes(summary.totalPlannedMinutes)}</Title>
              </Card>

              <Card withBorder radius="md" p="lg">
                <Text size="sm" c="dimmed">
                  Actual
                </Text>
                <Title order={3}>{formatMinutes(summary.totalActualMinutes)}</Title>
              </Card>

              <Card withBorder radius="md" p="lg">
                <Text size="sm" c="dimmed">
                  Variance
                </Text>
                <Title order={3} c={`${varianceColor(summary.totalVarianceMinutes)}.6`}>
                  {summary.totalVarianceMinutes > 0 ? "+" : ""}
                  {formatMinutes(summary.totalVarianceMinutes)}
                </Title>
              </Card>
            </SimpleGrid>

            <Stack gap="lg">
              {overview.employees.map((employee) => (
                <Card key={employee.staffId} withBorder radius="md" p="lg">
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Title order={4}>{employee.name}</Title>
                        <Text size="sm" c="dimmed">
                          {employee.email}
                        </Text>
                        <Text size="sm" c="dimmed">
                          Staff ID: {employee.staffCode || "—"} | Position: {employee.position || "—"}
                        </Text>
                      </div>

                      <Group gap="xs">
                        <Badge color={statusColor(employee.timesheetStatus)}>
                          {employee.timesheetStatus || "NO TIMESHEET"}
                        </Badge>
                        {employee.submittedAt && (
                          <Badge variant="light" color="blue">
                            Submitted: {formatDate(employee.submittedAt)}
                          </Badge>
                        )}
                      </Group>
                    </Group>

                    <SimpleGrid cols={{ base: 1, sm: 3 }}>
                      <Card withBorder radius="md" p="md">
                        <Text size="sm" c="dimmed">
                          Planned
                        </Text>
                        <Text fw={700}>{formatMinutes(employee.totals.plannedMinutes)}</Text>
                      </Card>

                      <Card withBorder radius="md" p="md">
                        <Text size="sm" c="dimmed">
                          Actual
                        </Text>
                        <Text fw={700}>{formatMinutes(employee.totals.actualMinutes)}</Text>
                      </Card>

                      <Card withBorder radius="md" p="md">
                        <Text size="sm" c="dimmed">
                          Variance
                        </Text>
                        <Text fw={700} c={`${varianceColor(employee.totals.varianceMinutes)}.6`}>
                          {employee.totals.varianceMinutes > 0 ? "+" : ""}
                          {formatMinutes(employee.totals.varianceMinutes)}
                        </Text>
                      </Card>
                    </SimpleGrid>

                    {employee.notes && (
                      <Alert color="gray" title="Timesheet notes">
                        {employee.notes}
                      </Alert>
                    )}

                    <Divider />

                    <Table.ScrollContainer minWidth={1100}>
                      <Table striped highlightOnHover withTableBorder>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Date</Table.Th>
                            <Table.Th>Planned</Table.Th>
                            <Table.Th>Actual</Table.Th>
                            <Table.Th>Variance</Table.Th>
                            <Table.Th>Hourly Rate</Table.Th>
                            <Table.Th>Timesheet Note</Table.Th>
                            <Table.Th>Assignment Details</Table.Th>
                          </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                          {employee.days.length === 0 ? (
                            <Table.Tr>
                              <Table.Td colSpan={7}>
                                <Text c="dimmed">No data for this employee in the selected period.</Text>
                              </Table.Td>
                            </Table.Tr>
                          ) : (
                            employee.days.map((day) => (
                              <Table.Tr key={`${employee.staffId}-${day.date}`}>
                                <Table.Td>{day.date}</Table.Td>
                                <Table.Td>{formatMinutes(day.plannedMinutes)}</Table.Td>
                                <Table.Td>{formatMinutes(day.actualMinutes)}</Table.Td>
                                <Table.Td>
                                  <Text c={`${varianceColor(day.varianceMinutes)}.6`} fw={600}>
                                    {day.varianceMinutes > 0 ? "+" : ""}
                                    {formatMinutes(day.varianceMinutes)}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  {day.hourlyRate != null ? `$${day.hourlyRate.toFixed(2)}` : "—"}
                                </Table.Td>
                                <Table.Td>{day.notes || "—"}</Table.Td>
                                <Table.Td>
                                  {day.assignments.length === 0 ? (
                                    <Text size="sm" c="dimmed">
                                      No planned assignments
                                    </Text>
                                  ) : (
                                    <Stack gap={8}>
                                      {day.assignments.map((assignment) => (
                                        <Card key={assignment.id} withBorder radius="md" p="sm">
                                          <Group justify="space-between" align="flex-start">
                                            <div>
                                              <Text fw={600}>{assignment.jobTitle}</Text>
                                              <Text size="sm" c="dimmed">
                                                {assignment.clientName}
                                              </Text>
                                              <Text size="sm" c="dimmed">
                                                {assignment.addressLine || "No address"}
                                              </Text>
                                            </div>
                                            <Badge variant="light">{assignment.status}</Badge>
                                          </Group>

                                          <Text size="sm" mt={8}>
                                            Planned: {formatDateTime(assignment.plannedStart)} →{" "}
                                            {formatDateTime(assignment.plannedEnd)}
                                          </Text>
                                          <Text size="sm">
                                            Planned minutes: {formatMinutes(assignment.plannedMinutes)}
                                          </Text>
                                          <Text size="sm">
                                            Break: {assignment.breakMinutes} min
                                          </Text>
                                          <Text size="sm">
                                            Assignment rate: ${assignment.hourlyRateAtTime.toFixed(2)}
                                          </Text>

                                          {assignment.notes && (
                                            <Text size="sm" mt={6} c="dimmed">
                                              Note: {assignment.notes}
                                            </Text>
                                          )}
                                        </Card>
                                      ))}
                                    </Stack>
                                  )}
                                </Table.Td>
                              </Table.Tr>
                            ))
                          )}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </>
        ) : (
          !loadingPeriods && (
            <Alert color="gray" title="No data">
              No period selected or no overview available.
            </Alert>
          )
        )}
      </Stack>
    </Container>
  );
}
