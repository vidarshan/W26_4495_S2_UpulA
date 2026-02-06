"use client";

import { ActionIcon, Box, Group, Image, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import React from "react";
import { IoMenu } from "react-icons/io5";

const Navbar = () => {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <Box
      component="header"
      pos="fixed"
      top={0}
      left={0}
      right={0}
      h={64}
      px="md"
      bg="blue"
      style={{ zIndex: 1000 }}
    >
      <Group h="100%" justify="space-between">
        {/* Left: Logo */}
        <Group gap="xs">
          <ActionIcon onClick={open}>
            <IoMenu />
          </ActionIcon>
          <Image
            src="/logo.png"
            width={32}
            height={32}
            alt="Eco Clean Logo"
            style={{ objectFit: "contain" }}
          />
          <Text fw={600} c="white">
            Eco Clean
          </Text>
        </Group>

        {/* Right: Actions (future-proof) */}
        <Group gap="sm">{/* buttons / profile / etc */}</Group>
      </Group>
    </Box>
  );
};

export default Navbar;
