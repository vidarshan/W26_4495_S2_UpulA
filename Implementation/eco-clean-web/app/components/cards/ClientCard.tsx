import { Address, Client } from "@/types";
import { Card, Text, Group, Stack, Flex, Button, Box } from "@mantine/core";
import {
  IoCallOutline,
  IoHomeOutline,
  IoMailOpenOutline,
} from "react-icons/io5";

interface Props {
  client: Client;
  address: Address;
}

export default function ClientCard({ client, address }: Props) {
  const fullName =
    client.firstName || client.lastName
      ? `${client.firstName || ""} ${client.lastName || ""}`.trim()
      : null;

  const fullAddress = address
    ? `${address.street1}, ${address.city}, ${address.province}`
    : "No address available";

  return (
    <Card p={0}>
      <Stack mt="xs" gap="sm">
        <Group justify="apart">
          <Text size="sm" fw={500} lineClamp={1}>
            {client.companyName || fullName || "Unnamed Client"}
          </Text>
        </Group>

        {client.email && (
          <Flex justify="flex-start" align="center">
            <IoMailOpenOutline />
            <Text ml="xs" size="sm" lineClamp={1}>
              {client.email}
            </Text>
          </Flex>
        )}

        {client.phone && (
          <Flex justify="flex-start" align="center">
            <IoCallOutline />
            <Text ml="xs" size="sm" lineClamp={1}>
              {client.phone}
            </Text>
          </Flex>
        )}
        <Flex justify="space-between" align="center">
          <Flex>
            <IoHomeOutline />
            <Text ml="xs" size="sm" color="dimmed" lineClamp={2}>
              {fullAddress}
            </Text>
          </Flex>

          <Group mb="sm" align="center" justify="space-between">
            <Button size="xs">Edit Address</Button>
          </Group>
        </Flex>
      </Stack>
    </Card>
  );
}
