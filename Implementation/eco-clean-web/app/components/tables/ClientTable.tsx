"use client";

import {
  Badge,
  Button,
  Table,
  TextInput,
  Group,
  Text,
  ScrollArea,
  Center,
  Box,
  Pagination,
  Flex,
  Select,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import { IoAdd, IoFilter, IoSearch } from "@/lib/icons";
import Loader from "../UI/Loader";
import { useClients } from "@/hooks/useClient";
import { useState } from "react";
import ClientPropertyModal from "../popups/ClientModal";
import { useQueryClient } from "@tanstack/react-query";
import { Client } from "@/types";

export const getClientName = (c: Client) => `${c.firstName} ${c.lastName}`;

export default function ClientsTable() {
  const isNarrow = useMediaQuery("(max-width: 62em)", false, {
    getInitialValueInEffect: true,
  });
  const [opened, setOpened] = useState(false);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<
    string | undefined
  >();
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
  });

  const { data, isLoading } = useClients({
    query,
    page: pagination.page,
    limit: pagination.limit,
    sort,
  });

  const clients = data?.data ?? [];
  const meta = data?.meta ?? {
    page: 1,
    totalPages: 1,
  };

  const renderPreferredContact = (method?: string | null) => {
    if (!method) return "—";
    return method.toUpperCase();
  };

  const renderValue = (value?: string | null) => (value?.length ? value : "—");

  const handleSearch = (value: string) => {
    setQuery(value);
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  return (
    <Box>
      <ClientPropertyModal
        opened={opened}
        onClose={() => {
          setOpened(false);
          setSelectedClientId(undefined);
        }}
        clientId={selectedClientId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["clients"] });
        }}
      />
      <Group justify="space-between" mb="md" align="flex-start" gap="md">
        <Group gap="xs">
          <Badge color="lime" variant="light" radius="xl">
            Client records
          </Badge>
          <Badge color="gray" variant="light" radius="xl">
            {clients.length} shown
          </Badge>
        </Group>

        <Group
          gap="sm"
          wrap="wrap"
          style={{ width: isNarrow ? "100%" : "auto" }}
        >
          <Button
            color="lime"
            onClick={() => {
              setSelectedClientId(undefined);
              setOpened(true);
            }}
          >
            Add client
          </Button>

          <TextInput
            placeholder="Search clients"
            radius="xl"
            leftSection={<IoSearch size={16} />}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              flex: isNarrow ? 1 : undefined,
              minWidth: isNarrow ? 220 : undefined,
            }}
          />

          <Select
            placeholder="Sort by"
            leftSection={<IoFilter />}
            value={sort}
            data={[
              { value: "newest", label: "Newest" },
              { value: "oldest", label: "Oldest" },
            ]}
            onChange={(value) => setSort(value as "newest" | "oldest")}
            radius="xl"
            style={{ minWidth: isNarrow ? 180 : undefined }}
          />
        </Group>
      </Group>

      {isLoading ? (
        <Loader />
      ) : !isLoading && !clients.length ? (
        <Center py="md">
          <Text c="dimmed">No matching clients</Text>
        </Center>
      ) : (
        <>
          <ScrollArea mih="60vh" offsetScrollbars>
            <Table striped highlightOnHover withRowBorders miw={760}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Client</Table.Th>
                  <Table.Th>Company</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Phone</Table.Th>
                  <Table.Th>Preferred</Table.Th>
                  <Table.Th>Lead source</Table.Th>
                  <Table.Th>Created</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {clients.map((client: Client) => (
                  <Table.Tr
                    key={client.id}
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setOpened(true);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <Table.Td>{getClientName(client)}</Table.Td>

                    <Table.Td>{renderValue(client.companyName)}</Table.Td>

                    <Table.Td>{client.email}</Table.Td>

                    <Table.Td>{client.phone}</Table.Td>

                    <Table.Td>
                      {renderPreferredContact(client.preferredContact)}
                    </Table.Td>

                    <Table.Td>{renderValue(client.leadSource)}</Table.Td>

                    <Table.Td>
                      {new Date(client.createdAt).toLocaleDateString()}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          <Flex mt="sm" w="100%" justify={isNarrow ? "center" : "flex-end"}>
            <Pagination
              value={meta.page}
              total={meta.totalPages}
              onChange={(page) =>
                setPagination((prev) => ({
                  ...prev,
                  page,
                }))
              }
            />
          </Flex>
        </>
      )}
    </Box>
  );
}
