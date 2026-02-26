"use client";

import { useStaff } from "@/hooks/useStaff";
import {
  Box,
  Flex,
  Group,
  Pagination,
  ScrollArea,
  Select,
  Table,
  TextInput,
  Button,
} from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import { IoFilterOutline, IoSearchOutline } from "react-icons/io5";
import Loader from "../UI/Loader";
import { formatDateTime } from "@/lib/utils/formatDateTime";
import UserUpsertModal from "../popups/UserModal";
import { Staff } from "@/app/types/staff";

export default function StaffTable() {
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

  const staff = data?.data ?? [];
  const meta = data?.meta;

  const [opened, setOpened] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<Staff | null>(null);

  const handleSearch = (value: string) => {
    setQ(value);
    setPage(1);
  };

  const openAdd = useCallback(() => {
    setMode("create");
    setSelectedUser(null);
    setOpened(true);
  }, []);

  const openEdit = useCallback((u: Staff) => {
    setMode("edit");
    setSelectedUser(u);
    setOpened(true);
  }, []);

  const rows = useMemo(
    () =>
      staff.map((u) => (
        <Table.Tr
          key={u.id}
          onClick={() => openEdit(u)}
          style={{ cursor: "pointer" }}
        >
          <Table.Td>{u.name}</Table.Td>
          <Table.Td>{u.role}</Table.Td>
          <Table.Td>{u.email}</Table.Td>
          <Table.Td>{new Date(u.createdAt).toLocaleDateString()}</Table.Td>
        </Table.Tr>
      )),
    [openEdit, staff],
  );

  return (
    <Box>
      <UserUpsertModal
        key={`${mode}:${selectedUser?.id ?? "new"}`}
        opened={opened}
        onClose={() => setOpened(false)}
        mode={mode}
        user={selectedUser}
      />

      <Group justify="space-between" gap="sm" mb="md">
        <Box></Box>
        <Group gap="sm">
          <TextInput
            placeholder="Search users"
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
            onChange={(value) =>
              setSort((value as "newest" | "oldest") ?? "newest")
            }
            radius="md"
          />
        </Group>
      </Group>

      {isLoading ? (
        <Loader />
      ) : (
        <>
          <ScrollArea mih="60vh">
            <Table striped highlightOnHover withTableBorder withRowBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Joined</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          </ScrollArea>

          <Flex mt="sm" w="100%" justify="flex-end">
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
