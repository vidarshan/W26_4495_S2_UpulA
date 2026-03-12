"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActionIcon,
  Center,
  Flex,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import {
  IoCalendarClearOutline,
  IoCheckboxOutline,
  IoMagnet,
  IoPersonOutline,
} from "react-icons/io5";
import { JSX } from "react";

type Tab = {
  href: string;
  label: string;
  Icon: JSX.Element;
};

const TABS: Tab[] = [
  { href: "/tasks", label: "Tasks", Icon: <IoCheckboxOutline /> },
  { href: "/calendar", label: "Calendar", Icon: <IoCalendarClearOutline /> },
  { href: "/profile", label: "Profile", Icon: <IoPersonOutline /> },
];

export default function BottomBar() {
  const pathname = usePathname();

  return (
    <Paper
      withBorder
      pos="fixed"
      bottom={0}
      left={0}
      right={0}
      radius={0}
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 10px)",
        zIndex: 2000,
      }}
    >
      <Group justify="space-around" py="xs">
        {TABS.map(({ href, label, Icon }) => {
          const active =
            pathname === href || (href !== "/" && pathname?.startsWith(href));

          return (
            <Flex
              key={label}
              gap={6}
              align="center"
              justify="center"
              direction="column"
            >
              <ActionIcon variant="light">{Icon}</ActionIcon>
              <Text c="green" fw={800} size="xs">
                {label}
              </Text>
            </Flex>
          );
        })}
      </Group>
    </Paper>
  );
}
