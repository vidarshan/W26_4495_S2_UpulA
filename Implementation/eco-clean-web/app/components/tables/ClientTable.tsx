"use client";

import {
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

import { useRouter } from "next/navigation";

import { IoFilterOutline, IoSearchOutline } from "react-icons/io5";
import Loader from "../UI/Loader";
import { useClients } from "@/hooks/useClient";
import { useState } from "react";

export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  email: string;
  phone: string;
  preferredContact?: "call" | "sms" | "email";
  leadSource?: string;
  createdAt: string;
};

export type Address = {
  id: string;
  clientId: string;
  street1: string;
  street2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
  isBilling: boolean;
  createdAt: string;
};

export type Staff = {
  id: string;
  name: string;
  role: string;
  email: string;
  createdAt: string;
};

export type MetaData = {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

export const getClientName = (c: Client) => `${c.firstName} ${c.lastName}`;

export default function ClientsTable() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
  });

  const { clients, meta, loading } = useClients({
    query,
    page: pagination.page,
    limit: pagination.limit,
    sort,
  });

  const renderPreferredContact = (method?: "call" | "sms" | "email") => {
    if (!method) return "—";
    return method.toUpperCase();
  };

  const renderValue = (value?: string) => (value?.length ? value : "—");

  const handleSearch = (value: string) => {
    setQuery(value);
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={400}>
          Clients
        </Text>
        <Group gap="sm">
          <TextInput
            placeholder="Search clients"
            leftSection={<IoSearchOutline size={16} />}
            radius="md"
            onChange={(e) => handleSearch(e.target.value)}
          />

          <Select
            placeholder="Sort by"
            leftSection={<IoFilterOutline />}
            value={sort}
            data={[
              { value: "newest", label: "Newest" },
              { value: "oldest", label: "Oldest" },
            ]}
            onChange={(value) => setSort(value as "newest" | "oldest")}
            radius="md"
          />
        </Group>
      </Group>

      {loading ? (
        <Loader />
      ) : !loading && !clients.length ? (
        <Center py="md">
          <Text c="dimmed">No matching clients</Text>
        </Center>
      ) : (
        <ScrollArea mih="60vh">
          <Table striped highlightOnHover withTableBorder withRowBorders>
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
              {clients.map((client) => (
                <Table.Tr
                  key={client.id}
                  onClick={() => router.push(`/clients/${client.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <Table.Td>
                    <Text fw={500}>{getClientName(client)}</Text>
                  </Table.Td>

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

          <Flex mt="sm" w="100%" justify="flex-end">
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
        </ScrollArea>
      )}
    </Box>
  );
}
