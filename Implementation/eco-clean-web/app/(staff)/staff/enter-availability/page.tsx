"use client";

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useSession } from "next-auth/react";
import { useState } from "react";

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
] as const;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to save availability.";
}

export default function EnterAvailabilityPage() {
  const { data: session } = useSession();
  const [submitState, setSubmitState] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<AvailabilityFormValues>({
    initialValues: {
      todaysDate: new Date(),
      employeeName: session?.user?.name ?? "",
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

  async function handleSubmit(values: AvailabilityFormValues) {
    const staffProfileId = session?.user?.id || "3b32d468-9f20-4808-9f25-bffabed6a9cb";

    try {
      setSubmitting(true);
      setSubmitState(null);

      const response = await fetch(`/api/staff/${staffProfileId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          effectiveFrom: values.effectiveDate
            ? new Date(values.effectiveDate).toISOString()
            : null,
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
      });

      if (!response.ok) throw new Error("Failed to save availability.");

      setSubmitState({
        type: "success",
        message: "Availability updated successfully.",
      });
      form.reset();
    } catch (error: unknown) {
      setSubmitState({
        type: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container p={0} className="staff-app-page">
      <Stack gap="md" p="md">
        <Card
          radius="lg"
          withBorder
          p="lg"
          className="staff-app-surface staff-app-surface--hero"
        >
          <Stack gap="xs">
            <Title order={3}>Your Availability</Title>
            <Text size="sm" c="dimmed">
              Set the shifts you can work so future scheduling can use your latest preferences.
            </Text>
          </Stack>
        </Card>

        {submitState ? (
          <Alert color={submitState.type === "success" ? "lime" : "red"}>
            {submitState.message}
          </Alert>
        ) : null}

        <Card
          component="form"
          onSubmit={form.onSubmit(handleSubmit)}
          radius="lg"
          withBorder
          p="lg"
          className="staff-app-surface"
        >
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DateInput label="Today's Date" value={form.values.todaysDate} readOnly />
              <TextInput
                label="Employee Name"
                placeholder="Enter your name"
                {...form.getInputProps("employeeName")}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DateInput
                label="Effective Date"
                placeholder="When does this start?"
                minDate={new Date(new Date().getTime() + 7 * 24 * 3600 * 1000)}
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

            <Stack gap="sm">
              <Stack gap={2}>
                <Text fw={700}>Weekly shift availability</Text>
                <Text size="sm" c="dimmed">
                  Turn a day on, then choose the shifts you can work. This layout stays mobile-safe without side scrolling.
                </Text>
              </Stack>

              <Stack gap="sm">
                {DAYS.map((day) => {
                  const dayValue = form.values.availability[day.key];

                  return (
                    <Paper key={day.key} withBorder radius="lg" p="md">
                      <Stack gap="sm">
                        <Group justify="space-between" wrap="wrap">
                          <Stack gap={2}>
                            <Text fw={700}>{day.label}</Text>
                            <Text size="sm" c="dimmed">
                              Choose whether you can work this day and which shifts fit.
                            </Text>
                          </Stack>

                          <Checkbox
                            label="Available"
                            checked={dayValue.active}
                            onChange={(e) =>
                              form.setFieldValue(
                                `availability.${day.key}.active`,
                                e.currentTarget.checked,
                              )
                            }
                          />
                        </Group>

                        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
                          <Paper withBorder radius="md" p="sm">
                            <Checkbox
                              label="Morning shift"
                              disabled={!dayValue.active}
                              checked={dayValue.s1}
                              onChange={(e) =>
                                form.setFieldValue(
                                  `availability.${day.key}.s1`,
                                  e.currentTarget.checked,
                                )
                              }
                            />
                          </Paper>

                          <Paper withBorder radius="md" p="sm">
                            <Checkbox
                              label="Afternoon shift"
                              disabled={!dayValue.active}
                              checked={dayValue.s2}
                              onChange={(e) =>
                                form.setFieldValue(
                                  `availability.${day.key}.s2`,
                                  e.currentTarget.checked,
                                )
                              }
                            />
                          </Paper>
                        </SimpleGrid>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Stack>

            <Group justify="flex-end">
              <Button type="submit" radius="md" color="lime" loading={submitting}>
                Save Availability
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
