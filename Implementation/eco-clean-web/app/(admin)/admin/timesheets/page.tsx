"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IoCalendar, IoCheckmarkDone, IoPeople, IoTime } from "react-icons/io5";
import AdminPageFrame from "@/app/components/admin/AdminPageFrame";

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
  const absoluteMinutes = Math.abs(minutes);
  const hrs = Math.floor(absoluteMinutes / 60);
  const mins = absoluteMinutes % 60;
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
      return "lime";
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
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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

    void loadPeriods();
  }, []);

  useEffect(() => {
    if (!selectedPeriodId) return;

    async function loadOverview() {
      try {
        setLoadingOverview(true);
        setError(null);

        const res = await fetch(
          `/api/admin/timesheets/periods/${selectedPeriodId}/overview`,
          { cache: "no-store" },
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load overview");
        }

        const data: OverviewResponse = await res.json();
        setOverview(data);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to load overview",
        );
      } finally {
        setLoadingOverview(false);
      }
    }

    void loadOverview();
  }, [selectedPeriodId]);

  async function handleApprove(timesheetId: string) {
    setApprovingId(timesheetId);

    try {
      const res = await fetch(`/api/admin/timesheets/${timesheetId}/approve`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        notifications.show({
          title: "Approval failed",
          message: data.error || "Failed to approve timesheet.",
          color: "red",
        });
        return;
      }

      if (selectedPeriodId) {
        const refresh = await fetch(
          `/api/admin/timesheets/periods/${selectedPeriodId}/overview`,
          { cache: "no-store" },
        );
        const refreshedData = await refresh.json();
        setOverview(refreshedData);
      }
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Something went wrong",
        message: "Unable to approve the timesheet right now.",
        color: "red",
      });
    } finally {
      setApprovingId(null);
    }
  }

  const periodOptions = useMemo(
    () =>
      periods.map((period) => ({
        value: period.id,
        label: `${formatDate(period.startDate)} → ${formatDate(period.endDate)} (${period.status})`,
      })),
    [periods],
  );

  const summary = useMemo(() => {
    if (!overview) {
      return {
        employeeCount: 0,
        totalPlannedMinutes: 0,
        totalActualMinutes: 0,
        totalVarianceMinutes: 0,
        submittedCount: 0,
      };
    }

    const totalPlannedMinutes = overview.employees.reduce(
      (sum, employee) => sum + employee.totals.plannedMinutes,
      0,
    );
    const totalActualMinutes = overview.employees.reduce(
      (sum, employee) => sum + employee.totals.actualMinutes,
      0,
    );
    const submittedCount = overview.employees.filter(
      (employee) => employee.timesheetStatus === "SUBMITTED",
    ).length;

    return {
      employeeCount: overview.employees.length,
      totalPlannedMinutes,
      totalActualMinutes,
      totalVarianceMinutes: totalActualMinutes - totalPlannedMinutes,
      submittedCount,
    };
  }, [overview]);

  return (
    <AdminPageFrame
      eyebrow="Time tracking"
      title="Timesheets"
      description="Compare planned work against submitted time, then approve ready timesheets from a more readable admin review flow."
      stats={[
        {
          label: "Employees",
          value: String(summary.employeeCount),
          icon: IoPeople,
        },
        {
          label: "Awaiting approval",
          value: String(summary.submittedCount),
          icon: IoCheckmarkDone,
        },
        {
          label: "Period variance",
          value: formatMinutes(summary.totalVarianceMinutes),
          icon: IoTime,
        },
      ]}
    >
      <Stack gap="lg">
        <Stack gap="lg">
          {error ? (
            <Alert color="red" title="Something went wrong">
              {error}
            </Alert>
          ) : null}

          <Paper
            withBorder
            radius="lg"
            p="md"
            className="admin-page-frame__stat"
            style={{
              background:
                "linear-gradient(180deg, rgba(247, 254, 231, 0.78), rgba(255, 255, 255, 0.96))",
            }}
          >
            <Stack gap="md">
              <Group justify="space-between" align="flex-end" gap="md">
                <div>
                  <Text fw={700} c="#0f172a">
                    Timesheet review window
                  </Text>
                  <Text size="sm" c="dimmed" mt={4}>
                    Review one period at a time, then approve submitted staff
                    timesheets from the employee cards below.
                  </Text>
                </div>

                {overview?.period ? (
                  <Group gap="sm">
                    <Badge
                      color={
                        overview.period.status === "LOCKED" ? "grape" : "lime"
                      }
                    >
                      {overview.period.status}
                    </Badge>
                    <Badge variant="light" color="gray">
                      <IoCalendar size={14} style={{ marginRight: 6 }} />
                      {formatDate(overview.period.startDate)} →{" "}
                      {formatDate(overview.period.endDate)}
                    </Badge>
                  </Group>
                ) : null}
              </Group>

              <Select
                placeholder={
                  loadingPeriods ? "Loading periods..." : "Select a period"
                }
                data={periodOptions}
                value={selectedPeriodId}
                onChange={setSelectedPeriodId}
                searchable
                disabled={loadingPeriods || periodOptions.length === 0}
              />

              {overview?.period ? (
                <Text size="sm" c="dimmed">
                  Locked at: {formatDateTime(overview.period.lockedAt)}
                </Text>
              ) : null}
            </Stack>
          </Paper>

          {loadingOverview ? (
            <Group justify="center" py="xl">
              <Loader color="lime" />
            </Group>
          ) : overview ? (
            <Stack gap="lg">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                <Paper
                  withBorder
                  radius="lg"
                  p="md"
                  className="admin-page-frame__stat"
                >
                  <Text size="sm" c="dimmed">
                    Employees
                  </Text>
                  <Text size="xl" fw={700} c="#0f172a" mt={6}>
                    {summary.employeeCount}
                  </Text>
                </Paper>
                <Paper
                  withBorder
                  radius="lg"
                  p="md"
                  className="admin-page-frame__stat"
                >
                  <Text size="sm" c="dimmed">
                    Planned
                  </Text>
                  <Text size="xl" fw={700} c="#0f172a" mt={6}>
                    {formatMinutes(summary.totalPlannedMinutes)}
                  </Text>
                </Paper>
                <Paper
                  withBorder
                  radius="lg"
                  p="md"
                  className="admin-page-frame__stat"
                >
                  <Text size="sm" c="dimmed">
                    Actual
                  </Text>
                  <Text size="xl" fw={700} c="#0f172a" mt={6}>
                    {formatMinutes(summary.totalActualMinutes)}
                  </Text>
                </Paper>
                <Paper
                  withBorder
                  radius="lg"
                  p="md"
                  className="admin-page-frame__stat"
                >
                  <Text size="sm" c="dimmed">
                    Variance
                  </Text>
                  <Text
                    size="xl"
                    fw={700}
                    c={`${varianceColor(summary.totalVarianceMinutes)}.6`}
                    mt={6}
                  >
                    {summary.totalVarianceMinutes > 0
                      ? "+"
                      : summary.totalVarianceMinutes < 0
                        ? "-"
                        : ""}
                    {formatMinutes(summary.totalVarianceMinutes)}
                  </Text>
                </Paper>
              </SimpleGrid>

              {overview.employees.map((employee) => {
                const isCollapsed = collapsed[employee.staffId];

                return (
                  <Paper
                    key={employee.staffId}
                    withBorder
                    radius="lg"
                    p="lg"
                    className="admin-page-frame__surface"
                  >
                    <Stack gap="md">
                      <Group
                        justify="space-between"
                        align="flex-start"
                        gap="md"
                      >
                        <div>
                          <Text size="lg" fw={700} c="#0f172a">
                            {employee.name}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {employee.email}
                          </Text>
                          <Text size="sm" c="dimmed">
                            Staff ID: {employee.staffCode || "—"} | Position:{" "}
                            {employee.position || "—"}
                          </Text>
                        </div>

                        <Group gap="xs">
                          <Badge color={statusColor(employee.timesheetStatus)}>
                            {employee.timesheetStatus || "NO TIMESHEET"}
                          </Badge>
                          {employee.submittedAt ? (
                            <Badge variant="light" color="blue">
                              Submitted: {formatDate(employee.submittedAt)}
                            </Badge>
                          ) : null}
                          {employee.timesheetId &&
                          employee.timesheetStatus === "SUBMITTED" ? (
                            <Button
                              size="xs"
                              color="lime"
                              loading={approvingId === employee.timesheetId}
                              onClick={() =>
                                handleApprove(employee.timesheetId!)
                              }
                            >
                              Approve
                            </Button>
                          ) : null}
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() =>
                              setCollapsed((prev) => ({
                                ...prev,
                                [employee.staffId]: !prev[employee.staffId],
                              }))
                            }
                          >
                            {isCollapsed ? "Expand" : "Collapse"}
                          </Button>
                        </Group>
                      </Group>

                      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                        <Paper
                          withBorder
                          radius="lg"
                          p="md"
                          className="admin-page-frame__stat"
                        >
                          <Text size="sm" c="dimmed">
                            Planned
                          </Text>
                          <Text fw={700} mt={6}>
                            {formatMinutes(employee.totals.plannedMinutes)}
                          </Text>
                        </Paper>
                        <Paper
                          withBorder
                          radius="lg"
                          p="md"
                          className="admin-page-frame__stat"
                        >
                          <Text size="sm" c="dimmed">
                            Actual
                          </Text>
                          <Text fw={700} mt={6}>
                            {formatMinutes(employee.totals.actualMinutes)}
                          </Text>
                        </Paper>
                        <Paper
                          withBorder
                          radius="lg"
                          p="md"
                          className="admin-page-frame__stat"
                        >
                          <Text size="sm" c="dimmed">
                            Variance
                          </Text>
                          <Text
                            fw={700}
                            c={`${varianceColor(employee.totals.varianceMinutes)}.6`}
                            mt={6}
                          >
                            {employee.totals.varianceMinutes > 0
                              ? "+"
                              : employee.totals.varianceMinutes < 0
                                ? "-"
                                : ""}
                            {formatMinutes(employee.totals.varianceMinutes)}
                          </Text>
                        </Paper>
                      </SimpleGrid>

                      {employee.notes ? (
                        <Alert color="gray" title="Timesheet notes">
                          {employee.notes}
                        </Alert>
                      ) : null}

                      {!isCollapsed ? (
                        <>
                          <Divider />

                          {employee.days.length === 0 ? (
                            <Text c="dimmed">
                              No data for this employee in the selected period.
                            </Text>
                          ) : (
                            <Stack gap="md">
                              {employee.days.map((day) => (
                                <Paper
                                  key={`${employee.staffId}-${day.date}`}
                                  withBorder
                                  radius="lg"
                                  p="md"
                                  className="admin-page-frame__stat"
                                >
                                  <Stack gap="md">
                                    <Group
                                      justify="space-between"
                                      align="flex-start"
                                      gap="md"
                                    >
                                      <div>
                                        <Text fw={700} c="#0f172a">
                                          {day.date}
                                        </Text>
                                        <Text size="sm" c="dimmed" mt={4}>
                                          {day.notes || "No timesheet note"}
                                        </Text>
                                      </div>

                                      <Text
                                        c={`${varianceColor(day.varianceMinutes)}.6`}
                                        fw={700}
                                      >
                                        {day.varianceMinutes > 0
                                          ? "+"
                                          : day.varianceMinutes < 0
                                            ? "-"
                                            : ""}
                                        {formatMinutes(day.varianceMinutes)}
                                      </Text>
                                    </Group>

                                    <SimpleGrid
                                      cols={{ base: 2, lg: 4 }}
                                      spacing="sm"
                                    >
                                      <Paper withBorder p="sm" radius="lg">
                                        <Text size="xs" c="dimmed">
                                          Planned
                                        </Text>
                                        <Text fw={700} mt={4}>
                                          {formatMinutes(day.plannedMinutes)}
                                        </Text>
                                      </Paper>
                                      <Paper withBorder p="sm" radius="lg">
                                        <Text size="xs" c="dimmed">
                                          Actual
                                        </Text>
                                        <Text fw={700} mt={4}>
                                          {formatMinutes(day.actualMinutes)}
                                        </Text>
                                      </Paper>
                                      <Paper withBorder p="sm" radius="lg">
                                        <Text size="xs" c="dimmed">
                                          Hourly rate
                                        </Text>
                                        <Text fw={700} mt={4}>
                                          {day.hourlyRate != null
                                            ? `$${day.hourlyRate.toFixed(2)}`
                                            : "—"}
                                        </Text>
                                      </Paper>
                                      <Paper withBorder p="sm" radius="lg">
                                        <Text size="xs" c="dimmed">
                                          Assignments
                                        </Text>
                                        <Text fw={700} mt={4}>
                                          {day.assignments.length}
                                        </Text>
                                      </Paper>
                                    </SimpleGrid>

                                    {day.assignments.length === 0 ? (
                                      <Text size="sm" c="dimmed">
                                        No planned assignments
                                      </Text>
                                    ) : (
                                      <Stack gap="xs">
                                        {day.assignments.map((assignment) => (
                                          <Paper
                                            key={assignment.id}
                                            withBorder
                                            radius="lg"
                                            p="sm"
                                            className="admin-page-frame__surface"
                                          >
                                            <Group
                                              justify="space-between"
                                              align="flex-start"
                                              gap="md"
                                            >
                                              <div>
                                                <Text fw={600}>
                                                  {assignment.jobTitle}
                                                </Text>
                                                <Text size="sm" c="dimmed">
                                                  {assignment.clientName}
                                                </Text>
                                                <Text size="sm" c="dimmed">
                                                  {assignment.addressLine ||
                                                    "No address"}
                                                </Text>
                                              </div>
                                              <Badge variant="light">
                                                {assignment.status}
                                              </Badge>
                                            </Group>

                                            <SimpleGrid
                                              cols={{ base: 1, md: 2 }}
                                              spacing="xs"
                                              mt="sm"
                                            >
                                              <Text size="sm">
                                                Planned:{" "}
                                                {formatDateTime(
                                                  assignment.plannedStart,
                                                )}{" "}
                                                →{" "}
                                                {formatDateTime(
                                                  assignment.plannedEnd,
                                                )}
                                              </Text>
                                              <Text size="sm">
                                                Planned minutes:{" "}
                                                {formatMinutes(
                                                  assignment.plannedMinutes,
                                                )}
                                              </Text>
                                              <Text size="sm">
                                                Break: {assignment.breakMinutes}{" "}
                                                min
                                              </Text>
                                              <Text size="sm">
                                                Assignment rate:{" "}
                                                {assignment.hourlyRateAtTime !=
                                                null
                                                  ? `$${assignment.hourlyRateAtTime.toFixed(2)}`
                                                  : "—"}
                                              </Text>
                                            </SimpleGrid>

                                            {assignment.notes ? (
                                              <Text size="sm" mt={6} c="dimmed">
                                                Note: {assignment.notes}
                                              </Text>
                                            ) : null}
                                          </Paper>
                                        ))}
                                      </Stack>
                                    )}
                                  </Stack>
                                </Paper>
                              ))}
                            </Stack>
                          )}
                        </>
                      ) : null}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          ) : (
            !loadingPeriods && (
              <Alert color="gray" title="No data">
                No period selected or no overview available.
              </Alert>
            )
          )}
        </Stack>
      </Stack>
    </AdminPageFrame>
  );
}
