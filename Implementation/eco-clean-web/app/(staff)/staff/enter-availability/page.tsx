"use client";

import {
  Badge,
  Container,
  Title,
  TextInput,
  Checkbox,
  Group,
  Stack,
  Button,
  Text,
  Box,
  Table,
  Card,
  SimpleGrid,
  Textarea,
  ThemeIcon,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useSession } from "next-auth/react";
import { addAppDays, appNowDate } from "@/lib/dateTime";
import { useEffect } from "react";
import { IoCalendarOutline, IoTimeOutline } from "react-icons/io5";

type DayAvailability = {
  active: boolean;
  s1: boolean;
  s2: boolean;
};

type AvailabilityFormValues = {
  todaysDate: Date | null;
  employeeName: string;
  effectiveDate: Date | null;
  comments: string;
  // Grouping by day for the grid
  availability: Record<string, DayAvailability>;
};

const DAYS = [
  { label: "Monday", key: "mon" },
  { label: "Tuesday", key: "tue" },
  { label: "Wednesday", key: "wed" },
  { label: "Thursday", key: "thu" },
  { label: "Friday", key: "fri" },
  { label: "Saturday", key: "sat" },
  { label: "Sunday", key: "sun" },
];

export default function EnterAvailabilityPage() {
  const { data: session } = useSession();

  const form = useForm<AvailabilityFormValues>({
    initialValues: {
      todaysDate: new Date(),
      employeeName: "",
      effectiveDate: null,
      comments: "",
      availability: {
        mon: { active: false, s1: false, s2: false },
        tue: { active: false, s1: false, s2: false },
        wed: { active: false, s1: false, s2: false },
        thu: { active: false, s1: false, s2: false },
        fri: { active: false, s1: false, s2: false },
        sat: { active: false, s1: false, s2: false },
        sun: { active: false, s1: false, s2: false },
      },
    },
    validate: {
      employeeName: (v) =>
        v.trim().length > 0 ? null : "Employee name is required",
      effectiveDate: (v) => (v ? null : "Effective date is required"),
    },
  });

  useEffect(() => {
    if (session?.user?.name) {
      form.setFieldValue("employeeName", session.user.name);
    }
    // useForm returns a mutable object; depending on it here can cause a render loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.name]);

  async function handleSubmit(values: AvailabilityFormValues) {
    const staffProfileId = session?.user?.id;
    try {
      const response = await fetch(
        `/api/staff/${staffProfileId}/availability`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            effectiveFrom: values.effectiveDate
              ? new Date(values.effectiveDate).toISOString()
              : null, // Mapping our flat grid values to your new schema
            monActive: values.availability.mon.active,
            monS1: values.availability.mon.s1,
            monS2: values.availability.mon.s2,
            tueActive: values.availability.tue.active,
            tueS1: values.availability.tue.s1,
            tueS2: values.availability.tue.s2,
            wedActive: values.availability.wed.active,
            wedS1: values.availability.wed.s1,
            wedS2: values.availability.wed.s2,
            thuActive: values.availability.thu.active,
            thuS1: values.availability.thu.s1,
            thuS2: values.availability.thu.s2,
            friActive: values.availability.fri.active,
            friS1: values.availability.fri.s1,
            friS2: values.availability.fri.s2,
            satActive: values.availability.sat.active,
            satS1: values.availability.sat.s1,
            satS2: values.availability.sat.s2,
            sunActive: values.availability.sun.active,
            sunS1: values.availability.sun.s1,
            sunS2: values.availability.sun.s2,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to save availability.");

      if (!staffProfileId) {
        notifications.show({
          title: "User not ready",
          message: "User information has not loaded yet.",
          color: "yellow",
        });
        return;
      }

      notifications.show({
        title: "Availability updated",
        message: "Availability updated successfully.",
        color: "green",
      });
      form.reset();
    } catch (error) {
      notifications.show({
        title: "Update failed",
        message:
          error instanceof Error ? error.message : "Failed to update availability.",
        color: "red",
      });
    }
  }

  return (
    <Container p={0} className="staff-app-page">
      <Box
        component="form"
        onSubmit={form.onSubmit(handleSubmit)}
      >
        <Stack className="staff-page-stack">
          <Card
            withBorder
            radius="lg"
            p="lg"
            className="staff-app-surface staff-app-surface--hero"
          >
            <Group justify="space-between" align="flex-start" gap="md">
              <Box>
                <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: "0.08em" }}>
                  Schedule preferences
                </Text>
                <Title order={2} mt={6}>
                  Availability
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Tell us which days and times you are usually available.
                </Text>
              </Box>

              <Badge variant="light" color="lime">
                Two shifts per day
              </Badge>
            </Group>
          </Card>

          <SimpleGrid cols={{ base: 1, sm: 2 }} className="staff-summary-grid">
            <Card withBorder radius="lg" p="md" className="staff-app-surface">
              <Group align="flex-start" wrap="nowrap">
                <ThemeIcon size={40} radius="lg" color="lime" variant="light">
                  <IoCalendarOutline size={20} />
                </ThemeIcon>
                <Box>
                  <Text fw={700}>Effective date</Text>
                  <Text size="sm" c="dimmed">
                    Your changes will start next week.
                  </Text>
                </Box>
              </Group>
            </Card>

            <Card withBorder radius="lg" p="md" className="staff-app-surface">
              <Group align="flex-start" wrap="nowrap">
                <ThemeIcon size={40} radius="lg" color="lime" variant="light">
                  <IoTimeOutline size={20} />
                </ThemeIcon>
                <Box>
                  <Text fw={700}>Shift pattern</Text>
                  <Text size="sm" c="dimmed">
                    Choose morning, afternoon, or both for each day.
                  </Text>
                </Box>
              </Group>
            </Card>
          </SimpleGrid>

          <Card withBorder radius="lg" p="lg" className="staff-app-surface">
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }} className="staff-form-grid">
                <DateInput
                  label="Today's Date"
                  value={form.values.todaysDate}
                  readOnly
                />
                <TextInput
                  label="Employee Name"
                  {...form.getInputProps("employeeName")}
                  readOnly
                />
                <DateInput
                  label="Effective Date"
                  placeholder="When does this start?"
                  minDate={addAppDays(appNowDate(), 7)}
                  {...form.getInputProps("effectiveDate")}
                />
                <Textarea
                  label="Comments"
                  placeholder="Optional notes"
                  minRows={2}
                  autosize
                  {...form.getInputProps("comments")}
                />
              </SimpleGrid>
            </Stack>
          </Card>

          <Card withBorder radius="lg" p={0} className="staff-app-surface staff-mobile-table-card">
            <Box p="md">
              <Text fw={700}>Weekly shift availability</Text>
              <Text size="sm" c="dimmed" mt={4}>
                Pick the times you are usually free to work.
              </Text>
            </Box>

            <Box style={{ overflowX: "auto" }}>
              <Table verticalSpacing="sm" horizontalSpacing="md">
                <Table.Thead>
                  <Table.Tr bg="gray.0">
                    <Table.Th>Day</Table.Th>
                    <Table.Th ta="center">Available?</Table.Th>
                    <Table.Th ta="center">Morning (S1)</Table.Th>
                    <Table.Th ta="center">Afternoon (S2)</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {DAYS.map((day) => (
                    <Table.Tr key={day.key}>
                      <Table.Td fw={500}>{day.label}</Table.Td>
                      <Table.Td ta="center">
                        <Checkbox
                          checked={form.values.availability[day.key].active}
                          onChange={(e) =>
                            form.setFieldValue(
                              `availability.${day.key}.active`,
                              e.currentTarget.checked,
                            )
                          }
                        />
                      </Table.Td>
                      <Table.Td ta="center">
                        <Checkbox
                          disabled={!form.values.availability[day.key].active}
                          checked={form.values.availability[day.key].s1}
                          onChange={(e) =>
                            form.setFieldValue(
                              `availability.${day.key}.s1`,
                              e.currentTarget.checked,
                            )
                          }
                        />
                      </Table.Td>
                      <Table.Td ta="center">
                        <Checkbox
                          disabled={!form.values.availability[day.key].active}
                          checked={form.values.availability[day.key].s2}
                          onChange={(e) =>
                            form.setFieldValue(
                              `availability.${day.key}.s2`,
                              e.currentTarget.checked,
                            )
                          }
                        />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          </Card>

          <Group justify="center" mt="md">
            <Button
              type="submit"
              size="lg"
              radius="lg"
              color="lime"
              styles={{ root: { minWidth: 220, height: 52, fontWeight: 700 } }}
            >
              Save Availability
            </Button>
          </Group>
        </Stack>
      </Box>
    </Container>
  );
}
