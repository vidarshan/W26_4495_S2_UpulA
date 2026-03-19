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
    <Box
      pos="sticky"
      top={0}
      style={{
        zIndex: 100,
        background: "white",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {back ? (
        <Flex bg="white" py={8} px="sm" align="center">
          <ThemeIcon
            variant="transparent"
            color="dark"
            radius="xl"
            size="xl"
            onClick={onClick}
            style={{ cursor: "pointer" }}
          >
            <IoArrowBack size={22} />
          </ThemeIcon>

          <Text size="xl" fw={600}>
            {title}
          </Text>
        </Flex>
      ) : (
        <Flex bg="white" justify="space-between" py={8} px="sm" align="center">
          <Flex align="center" gap="xs">
            <ThemeIcon
              variant="transparent"
              color="dark"
              radius="xl"
              size="xl"
              onClick={onClick}
              style={{ cursor: "pointer" }}
            >
              <IoMenuOutline size={24} />
            </ThemeIcon>

            <Text size="xl" fw={600}>
              {title}
            </Text>
          </Flex>

          <ActionIcon
            mr={8}
            radius="xl"
            size="lg"
            variant="subtle"
            aria-label="Refresh appointments"
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              background: "rgba(0, 0, 0, 0.04)",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              color: "#1f2937",
            }}
          >
            <IoRefreshOutline size={20} />
          </ActionIcon>
        </Flex>
      )}
    </Box>
  );
};

export default TopBar;
