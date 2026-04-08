"use client";

import { useStaff } from "@/hooks/useStaff";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Group,
  Pagination,
  ScrollArea,
  Select,
  Table,
  TextInput,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useCallback, useState } from "react";
import { IoAdd, IoFilter, IoSearch } from "react-icons/io5";
import Loader from "../UI/Loader";
import UserUpsertModal from "../popups/UserModal";
import { Staff } from "@/types";

export default function StaffTable() {
  const isNarrow = useMediaQuery("(max-width: 62em)", false, {
    getInitialValueInEffect: true,
  });
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useStaff({
    q,
    page,
    limit,
    sort,
    paginate: true,
  });

  const meta = data?.meta;

  const [opened, setOpened] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<Staff | null>(null);

  const handleSearch = (value: string) => {
    setQ(value);
    setPage(1);
  };

  const openEdit = useCallback((u: Staff) => {
    setMode("edit");
    setSelectedUser(u);
    setOpened(true);
  }, []);

  return (
    <Box>
      <UserUpsertModal
        key={`${mode}:${selectedUser?.id ?? "new"}`}
        opened={opened}
        onClose={() => setOpened(false)}
        mode={mode}
        user={selectedUser}
      />

      <Group justify="space-between" gap="md" mb="md" align="flex-start">
        <Group gap="xs">
          <Badge color="lime" variant="light" radius="xl">
            Employee records
          </Badge>
          <Badge color="gray" variant="light" radius="xl">
            {(data?.data ?? []).length} shown
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
              setMode("create");
              setSelectedUser(null);
              setOpened(true);
            }}
          >
            Add user
          </Button>

          <TextInput
            placeholder="Search users"
            leftSection={<IoSearch size={16} />}
            radius="xl"
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
            onChange={(value) =>
              setSort((value as "newest" | "oldest") ?? "newest")
            }
            radius="xl"
            style={{ minWidth: isNarrow ? 180 : undefined }}
          />
        </Group>
      </Group>

      {isLoading ? (
        <Loader />
      ) : (
        <>
          <Card
            withBorder
            radius="lg"
            padding={0}
            bg="rgba(255, 255, 255, 0.74)"
          >
            <ScrollArea mih="60vh" offsetScrollbars>
              <Table striped highlightOnHover withRowBorders miw={620}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Joined</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(data?.data ?? []).map((u) => (
                    <Table.Tr
                      key={u.id}
                      onClick={() => openEdit(u)}
                      style={{ cursor: "pointer" }}
                    >
                      <Table.Td>{u.name}</Table.Td>
                      <Table.Td>{u.role}</Table.Td>
                      <Table.Td>{u.email}</Table.Td>
                      <Table.Td>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>

          <Flex mt="sm" w="100%" justify={isNarrow ? "center" : "flex-end"}>
            {meta?.totalPages ? (
              <Group justify="center" mt="md">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={meta.totalPages}
                />
              </Group>
            ) : null}
          </Flex>
        </>
      )}
    </Box>
  );
}
