"use client";

import { useUsers } from "@/hooks/useUsers";
import { Container, Table } from "@mantine/core";

export default function Page() {
  const users = useUsers();
  console.log(users);

  const elements = [
    { position: 6, mass: 12.011, symbol: "C", name: "Carbon" },
    { position: 7, mass: 14.007, symbol: "N", name: "Nitrogen" },
    { position: 39, mass: 88.906, symbol: "Y", name: "Yttrium" },
    { position: 56, mass: 137.33, symbol: "Ba", name: "Barium" },
    { position: 58, mass: 140.12, symbol: "Ce", name: "Cerium" },
  ];

  const rows = elements.map((e) => (
    <Table.Tr key={e.name}>
      <Table.Td>{e.position}</Table.Td>
      <Table.Td>{e.name}</Table.Td>
      <Table.Td>{e.symbol}</Table.Td>
      <Table.Td>{e.mass}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Container fluid>
      <h1>Users</h1>
      <Table striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Element position</Table.Th>
            <Table.Th>Element name</Table.Th>
            <Table.Th>Symbol</Table.Th>
            <Table.Th>Atomic mass</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Container>
  );
}
