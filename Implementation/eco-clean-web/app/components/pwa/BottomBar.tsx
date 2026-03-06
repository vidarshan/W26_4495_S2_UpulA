"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActionIcon, Group, Paper, Text } from "@mantine/core";
import {
  IoCalendarClearOutline,
  IoCheckboxOutline,
  IoPersonOutline,
} from "react-icons/io5";

type Tab = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
};

const TABS: Tab[] = [
  { href: "/tasks", label: "Tasks", Icon: IoCheckboxOutline },
  { href: "/calendar", label: "Calendar", Icon: IoCalendarClearOutline },
  { href: "/profile", label: "Profile", Icon: IoPersonOutline },
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
            <ActionIcon
              key={href}
              component={Link}
              href={href}
              variant={active ? "filled" : "subtle"}
              size="xl"
              radius="xl"
              aria-label={label}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  paddingTop: 2,
                }}
              >
                <Icon size={20} />
                <Text size="xs" fw={active ? 600 : 500}>
                  {label}
                </Text>
              </div>
            </ActionIcon>
          );
        })}
      </Group>
    </Paper>
  );
}
