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
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";

type AvailabilityFormValues = {
  todaysDate: Date | null;
  employeeName: string;
  effectiveDate: Date | null;
  days: string[];
  comments: string;
};

const DAYS = [
  { label: "Sunday", value: "SUN" },
  { label: "Monday", value: "MON" },
  { label: "Tuesday", value: "TUE" },
  { label: "Wednesday", value: "WED" },
  { label: "Thursday", value: "THU" },
  { label: "Friday", value: "FRI" },
  { label: "Saturday", value: "SAT" },
];

export default function EnterAvailabilityPage() {
  const form = useForm<AvailabilityFormValues>({
    initialValues: {
      todaysDate: new Date(),
      employeeName: "",
      effectiveDate: null,
      days: [],
      comments: "",
    },
    validate: {
      todaysDate: (v) => (v ? null : "Today's date is required"),
      employeeName: (v) =>
        v.trim().length > 0 ? null : "Employee name is required",
      effectiveDate: (v) => (v ? null : "Effective date is required"),
      days: (v) => (v.length > 0 ? null : "Select at least one day"),
    },
  });

  async function handleSubmit(values: AvailabilityFormValues) {
    // For now: just log. Later: POST to /api/availability
    console.log("Availability submit:", values);

    // Example future API call:
    // await fetch("/api/availability", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(values),
    // });

    form.reset();
  }

  return (
    <Container size="sm" py="xl">
      <Title order={1} ta="center" mb="xl">
        Your Availability
      </Title>

      <Box
        component="form"
        onSubmit={form.onSubmit(handleSubmit)}
        style={{ maxWidth: 640, marginInline: "auto" }}
      >
        <Stack gap="lg">
          {/* Today's Date */}
          <div>
            <Text fw={600} mb={6}>
              Todays Date <span style={{ color: "red" }}>*</span>
            </Text>
            <DateInput
              placeholder="mm/dd/yyyy"
              value={form.values.todaysDate}
              onChange={(d) => {
                form.setFieldValue("todaysDate", d ? new Date(d) : null);
              }}
              error={form.errors.todaysDate}
              clearable={false}
            />
          </div>

          {/* Employee Name */}
          <div>
            <Text fw={600} mb={6}>
              Employee Name <span style={{ color: "red" }}>*</span>
            </Text>
            <TextInput
              placeholder=""
              value={form.values.employeeName}
              onChange={(e) =>
                form.setFieldValue("employeeName", e.currentTarget.value)
              }
              error={form.errors.employeeName}
            />
          </div>

          {/* Effective Date */}
          <div>
            <Text fw={600} mb={6}>
              Effective Date <span style={{ color: "red" }}>*</span>
            </Text>
            <DateInput
              placeholder="mm/dd/yyyy"
              value={form.values.effectiveDate}
              onChange={(d) => {
                form.setFieldValue("effectiveDate", d ? new Date(d) : null);
              }}
              error={form.errors.effectiveDate}
            />
          </div>

          {/* Selected Days */}
          <div>
            <Text fw={600} mb={10}>
              Selected days <span style={{ color: "red" }}>*</span>
            </Text>

            <Group gap="xl" align="flex-start" wrap="wrap">
              {DAYS.map((d) => (
                <Checkbox
                  key={d.value}
                  label={d.label}
                  value={d.value}
                  checked={form.values.days.includes(d.value)}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked;
                    const current = form.values.days;
                    form.setFieldValue(
                      "days",
                      checked
                        ? [...current, d.value]
                        : current.filter((x) => x !== d.value),
                    );
                  }}
                />
              ))}
            </Group>

            {form.errors.days && (
              <Text c="red" size="sm" mt={6}>
                {form.errors.days}
              </Text>
            )}
          </div>

          {/* Comments */}
          <div>
            <Text fw={600} mb={6}>
              Comments
            </Text>
            <TextInput
              placeholder=""
              value={form.values.comments}
              onChange={(e) =>
                form.setFieldValue("comments", e.currentTarget.value)
              }
            />
          </div>

          {/* Submit Button */}
          <Group justify="center" mt="md">
            <Button
              type="submit"
              size="lg"
              radius="md"
              styles={{
                root: {
                  minWidth: 220,
                  height: 56,
                  fontWeight: 700,
                },
              }}
              color="green"
            >
              Submit
            </Button>
          </Group>
        </Stack>
      </Box>
    </Container>
  );
}
