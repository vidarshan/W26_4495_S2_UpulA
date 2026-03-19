'use client';

import TopBar from '@/app/components/pwa/TopBar';
import { useStaffUiStore } from '@/stores/store';
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
} from '@mantine/core';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IoCalendarClearOutline,
  IoCheckboxOutline,
  IoCloseOutline,
  IoPersonOutline,
  IoTimeOutline,
} from 'react-icons/io5';

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
      style={{
        width: '100%',
        padding: '10px 4px',
        borderRadius: 12,
      }}
    >
      <Group gap="sm">
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            color: 'var(--mantine-color-dark-8)',
          }}
        >
          {icon}
        </Box>

        <Text fw={active ? 700 : 500} size="lg">
          {label}
        </Text>
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

  return (
    <Container p={0} mih="100vh">
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        withCloseButton={false}
        position="left"
        size="78%"
        overlayProps={{ backgroundOpacity: 0.45, blur: 0 }}
        styles={{
          body: {
            padding: 0,
            height: '100%',
          },
          content: {
            backgroundColor: 'white',
          },
        }}
      >
        <Box px="lg" pt="lg" pb="md" h="100%">
          <Group justify="space-between" align="center" mb="xl">
            <Text size="xl" fw={500}>
              Eco Clean
            </Text>

            <ActionIcon
              variant="subtle"
              color="dark"
              radius="xl"
              onClick={closeDrawer}
            >
              <IoCloseOutline size={28} />
            </ActionIcon>
          </Group>

          <Stack gap="md" justify="space-between" h="calc(100% - 60px)">
            <Stack gap="xs">
              <MenuItem
                href="/staff/tasks"
                label="My Tasks"
                icon={<IoCheckboxOutline size={24} />}
                active={pathname === '/staff/tasks'}
                onClick={closeDrawer}
              />

              <MenuItem
                href="/staff/staff-profile"
                label="Profile"
                icon={<IoPersonOutline size={24} />}
                active={pathname === '/staff/staff-profile'}
                onClick={closeDrawer}
              />

              <MenuItem
                href="/staff/apply-leave"
                label="Time-off"
                icon={<IoCalendarClearOutline size={24} />}
                active={pathname === '/staff/apply-leave'}
                onClick={closeDrawer}
              />

              <MenuItem
                href="/staff/enter-availability"
                label="Availability"
                icon={<IoTimeOutline size={24} />}
                active={pathname === '/staff/enter-availability'}
                onClick={closeDrawer}
              />
            </Stack>

            <Button
              radius="xl"
              size="lg"
              color="green"
              fullWidth
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              Logout
            </Button>
          </Stack>
        </Box>
      </Drawer>

      <TopBar
        back={back}
        onClick={back ? (onBack ?? (() => window.history.back())) : openDrawer}
        title={title}
        onRefresh={() => onRefresh?.()}
        refreshing={refreshing}
      />

      {children}
    </Container>
  );
}
