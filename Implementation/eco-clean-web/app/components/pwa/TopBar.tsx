import { Flex, Text, ThemeIcon } from "@mantine/core";
import React from "react";
import { IoArrowBack, IoMenuOutline } from "react-icons/io5";

interface Props {
  onClick: () => void;
  back: boolean;
  title: string;
}
const TopBar = ({ back, onClick, title }: Props) => {
  return (
    <>
      {back ? (
        <Flex bg="blue" py={6} align="center">
          <ThemeIcon
            variant="transparent"
            color="dark"
            radius="xl"
            size="xl"
            onClick={onClick}
          >
            <IoArrowBack />
          </ThemeIcon>
          <Text size="xl" fw={500}>
            {title}
          </Text>
        </Flex>
      ) : (
        <Flex bg="blue" py={6} align="center">
          <ThemeIcon
            variant="transparent"
            color="dark"
            radius="xl"
            size="xl"
            onClick={onClick}
          >
            <IoMenuOutline />
          </ThemeIcon>
          <Text size="xl" fw={500}>
            Tasks
          </Text>
        </Flex>
      )}
    </>
  );
};

export default TopBar;
