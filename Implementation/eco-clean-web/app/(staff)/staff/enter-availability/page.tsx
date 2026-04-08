"use client";

import {
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
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { addAppDays, appNowDate, toAppDateKey } from "@/lib/dateTime";
import { useEffect } from "react";

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
  const { data: session, status } = useSession();

  useEffect(() => {
    if (session?.user?.name) {
      form.setFieldValue("employeeName", session.user.name);
    }
  }, [session]);

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
        alert("User not loaded yet");
        return;
      }

      alert("Availability updated successfully!");
      form.reset();
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <Container size="md" py="xl">
      <Title order={1} ta="center" mb="xl">
        Your Availability
      </Title>

      <Box
        component="form"
        onSubmit={form.onSubmit(handleSubmit)}
        style={{ maxWidth: 720, marginInline: "auto" }}
      >
        <Stack gap="xl">
          <Group grow>
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
          </Group>

          <DateInput
            label="Effective Date"
            {...form.getInputProps("effectiveDate")}
            placeholder="When does this start?"
            minDate={new Date(new Date().getTime() + 7 * 24 * 3600)}
          />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
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
          {/* THE SHIFT GRID */}
          <Box>
            <Text fw={600} mb={10}>
              Weekly Shift Availability <span style={{ color: "red" }}>*</span>
            </Text>
            <Card withBorder radius="md" p={0}>
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
            </Card>
          </Box>

          <TextInput label="Comments" {...form.getInputProps("comments")} />

          <Group justify="center" mt="md">
            <Button
              type="submit"
              size="lg"
              radius="md"
              color="green"
              styles={{ root: { minWidth: 220, height: 56, fontWeight: 700 } }}
            >
              Submit
            </Button>
          </Group>
        </Stack>
      </Box>
    </Container>
  );
}
