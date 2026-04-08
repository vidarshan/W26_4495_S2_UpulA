import { ActionIcon, Box, Flex, Text, ThemeIcon } from "@mantine/core";
import { IoArrowBack, IoMenuOutline, IoRefreshOutline } from "react-icons/io5";

interface Props {
  onClick: () => void;
  back: boolean;
  title: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const TopBar = ({ back, onClick, title, onRefresh, refreshing }: Props) => {
  return (
    <Box pos="sticky" top={0} className="staff-topbar">
      {back ? (
        <Flex py={10} px="sm" align="center" className="staff-topbar__inner">
          <ThemeIcon
            variant="light"
            color="lime"
            radius="lg"
            size={40}
            onClick={onClick}
            className="staff-topbar__nav-icon"
          >
            <IoArrowBack size={22} />
          </ThemeIcon>

          <Text size="lg" fw={700} className="staff-topbar__title">
            {title}
          </Text>
        </Flex>
      ) : (
        <Flex justify="space-between" py={10} px="sm" align="center" className="staff-topbar__inner">
          <Flex align="center" gap="xs">
            <ThemeIcon
              variant="light"
              color="lime"
              radius="lg"
              size={40}
              onClick={onClick}
              className="staff-topbar__nav-icon"
            >
              <IoMenuOutline size={24} />
            </ThemeIcon>

            <Text size="lg" fw={700} className="staff-topbar__title">
              {title}
            </Text>
          </Flex>

          <ActionIcon
            radius="lg"
            size={40}
            variant="light"
            aria-label="Refresh appointments"
            onClick={onRefresh}
            disabled={refreshing}
            className="staff-topbar__refresh"
          >
            <IoRefreshOutline size={20} />
          </ActionIcon>
        </Flex>
      )}
    </Box>
  );
};

export default TopBar;
