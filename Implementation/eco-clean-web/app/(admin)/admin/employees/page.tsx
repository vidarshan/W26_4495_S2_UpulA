import { Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import AdminPageFrame from "@/app/components/admin/AdminPageFrame";
import StaffTable from "@/app/components/tables/StaffTable";

export default function EmployeesPage() {
  return (
    <AdminPageFrame
      eyebrow="Team workspace"
      title="Employees"
      description="Review employee records and open staff profiles"
    >
      <SimpleGrid cols={{ base: 1, lg: 12 }} spacing="lg">
        <Paper style={{ gridColumn: "span 12" }}>
          <Stack gap="lg">
            <div>
              <Text fw={700} c="#0f172a">
                Employee directory
              </Text>
              <Text size="sm" c="#475569" mt={6}>
                Search, sort, and open employee records from one consistent
                working surface.
              </Text>
            </div>

            <StaffTable />
          </Stack>
        </Paper>
      </SimpleGrid>
    </AdminPageFrame>
  );
}
