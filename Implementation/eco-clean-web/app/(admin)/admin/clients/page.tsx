import { Box, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import AdminPageFrame from "@/app/components/admin/AdminPageFrame";
import ClientsTable from "@/app/components/tables/ClientTable";

export default function ClientsPage() {
  return (
    <AdminPageFrame
      eyebrow="Client workspace"
      title="Clients"
      description="Manage client accounts and property records"
    >
      <SimpleGrid cols={{ base: 1, lg: 12 }} spacing="lg">
        <Box style={{ gridColumn: "span 12" }}>
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start" gap="md">
              <div>
                <Text fw={700} c="#0f172a">
                  Client directory
                </Text>
                <Text size="sm" c="#475569" mt={6}>
                  Search, sort, and open client records without the page title
                  competing with the working area below.
                </Text>
              </div>
            </Group>

            <ClientsTable />
          </Stack>
        </Box>
      </SimpleGrid>
    </AdminPageFrame>
  );
}
