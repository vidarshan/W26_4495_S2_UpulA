"use client";

import TopBar from "@/app/components/pwa/TopBar";
import { useStaffUiStore } from "@/stores/store";
import {
  ActionIcon,
  Box,
  Button,
  Container,
  Drawer,
  Group,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IoCalendarClearOutline,
  IoCheckboxOutline,
  IoCloseOutline,
  IoPersonOutline,
  IoTimeOutline,
} from "react-icons/io5";

type MenuItemProps = {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
};

function MenuItem({ href, label, icon, active, onClick }: MenuItemProps) {
  return (
    <UnstyledButton
      component={Link}
      href={href}
      onClick={onClick}
      className={`staff-shell-nav-item${active ? " staff-shell-nav-item--active" : ""}`}
    >
      <Group gap="sm">
        <Box >
          {icon}
        </Box>

        <Box className="staff-shell-nav-item__content">
          <Text fw={active ? 700 : 600} size="sm" className="staff-shell-nav-item__label">
            {label}
          </Text>
          <Text size="xs" className="staff-shell-nav-item__meta">
            {active ? "Open now" : "Go to section"}
          </Text>
        </Box>
      </Group>
    </UnstyledButton>
  );
}

export default function StaffShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    drawerOpened,
    openDrawer,
    closeDrawer,
    title,
    back,
    refreshing,
    onRefresh,
    onBack,
  } = useStaffUiStore();

  const pathname = usePathname();

  const menuItems = [
    {
      href: "/staff/tasks",
      label: "My Tasks",
      icon: <IoCheckboxOutline size={18} />,
      active: pathname.startsWith("/staff/tasks"),
    },
    {
      href: "/staff/profile",
      label: "Profile",
      icon: <IoPersonOutline size={18} />,
      active: pathname.startsWith("/staff/profile"),
    },
    {
      href: "/staff/apply-leave",
      label: "Time-off",
      icon: <IoCalendarClearOutline size={18} />,
      active: pathname.startsWith("/staff/apply-leave"),
    },
    {
      href: "/staff/enter-availability",
      label: "Availability",
      icon: <IoTimeOutline size={18} />,
      active: pathname.startsWith("/staff/enter-availability"),
    },
  ];

  return (
    <Container p={0} mih="100vh" className="staff-shell">
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        withCloseButton={false}
        position="left"
        size="78%"
        zIndex={500}
        overlayProps={{ backgroundOpacity: 0.45, blur: 4 }}
        classNames={{
          content: "staff-shell-drawer__content",
          body: "staff-shell-drawer__body",
        }}
      >
        <Box pt="lg" px="sm">
          <Group
            justify="space-between"
            align="center"
            mb="md"
            className="staff-drawer-brand"
          >
            <Box>
              <Text size="xs" fw={800} tt="uppercase" className="brand-kicker">
                Eco Clean
              </Text>
              <Text size="lg" fw={800} c="#0f172a">
                Staff Menu
              </Text>
            </Box>

            <ActionIcon
              variant="light"
              color="gray"
              radius="lg"
              onClick={closeDrawer}
            >
              <IoCloseOutline size={24} />
            </ActionIcon>
          </Group>
        </Box>
        <Stack px="sm" py="md" gap="xs">
          {menuItems.map((item) => (
            <MenuItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={item.active}
              onClick={closeDrawer}
            />
          ))}

          <Button
            radius="xl"
            onClick={() => signOut({ callbackUrl: "/login" })}
            fullWidth
            mt="md"
            className="staff-shell-signout"
          >
            Sign out
          </Button>
        </Stack>
      </Drawer>

      <TopBar
        back={back}
        onClick={back ? (onBack ?? (() => window.history.back())) : openDrawer}
        title={title}
        onRefresh={() => onRefresh?.()}
        refreshing={refreshing}
      />

      <Box className="staff-shell__content">{children}</Box>
    </Container>
  );
}
