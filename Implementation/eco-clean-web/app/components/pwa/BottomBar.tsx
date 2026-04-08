"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Group,
  Paper,
  Text,
  Box,
  ThemeIcon,
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
      className="staff-bottom-bar"
    >
      <Group justify="space-around" py="xs" px="xs" wrap="nowrap">
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
              <ThemeIcon
                size={34}
                radius="xl"
                variant={active ? "filled" : "light"}
                color={active ? "lime" : "gray"}
                className="staff-bottom-bar__icon"
              >
                {Icon}
              </ThemeIcon>
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
