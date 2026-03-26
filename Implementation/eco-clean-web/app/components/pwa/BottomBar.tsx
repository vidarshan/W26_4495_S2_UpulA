"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flex,
  Group,
  Paper,
  Text,
  Box,
} from "@mantine/core";
import {
  IoCalendarClearOutline,
  IoCheckboxOutline,
  IoPersonOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { JSX } from "react";

type Tab = {
  href: string;
  label: string;
  Icon: JSX.Element;
};

const TABS: Tab[] = [
  { href: "/staff/tasks", label: "Tasks", Icon: <IoCheckboxOutline /> },
  { href: "/staff/apply-leave", label: "Time-off", Icon: <IoCalendarClearOutline /> },
  { href: "/staff/enter-availability", label: "Hours", Icon: <IoTimeOutline /> },
  { href: "/staff/profile", label: "Profile", Icon: <IoPersonOutline /> },
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
      className="staff-bottom-bar"
    >
      <Group justify="space-around" py="xs" wrap="nowrap">
        {TABS.map(({ href, label, Icon }) => {
          const active =
            pathname === href || (href !== "/" && pathname?.startsWith(href));

          return (
            <Box
              component={Link}
              href={href}
              key={label}
              className={`staff-bottom-bar__item${active ? " staff-bottom-bar__item--active" : ""}`}
            >
              <Box className="staff-bottom-bar__icon">{Icon}</Box>
              <Text fw={700} size="xs" className="staff-bottom-bar__label">
                {label}
              </Text>
            </Box>
          );
        })}
      </Group>
    </Paper>
  );
}
