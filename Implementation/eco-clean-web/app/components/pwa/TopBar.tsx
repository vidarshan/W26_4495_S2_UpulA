import { ActionIcon, Box, Flex, Text, ThemeIcon } from "@mantine/core";
import { IoArrowBack, IoMenu, IoRefresh } from "@/lib/icons";

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
      <Box className="staff-topbar__inner">
        <Flex align="center" gap="xs" className="staff-topbar__lead">
          <ThemeIcon
            variant="light"
            color="lime"
            radius="lg"
            size={42}
            onClick={onClick}
            className="staff-topbar__nav-icon"
          >
            {back ? <IoArrowBack size={22} /> : <IoMenu size={24} />}
          </ThemeIcon>

          <Box style={{ minWidth: 0, flex: 1 }}>
            <Text size="lg" fw={700} className="staff-topbar__title" truncate>
              {title}
            </Text>
          </Box>
        </Flex>

        <ActionIcon
          radius="lg"
          size={42}
          variant="light"
          aria-label="Refresh"
          onClick={onRefresh}
          disabled={!onRefresh || refreshing}
          className="staff-topbar__refresh"
          style={{ visibility: onRefresh ? "visible" : "hidden" }}
        >
          <IoRefresh size={20} />
        </ActionIcon>
      </Box>
    </Box>
  );
};

export default TopBar;
