"use client";

import { useState } from "react";
import {
  Box,
  Image,
  Modal,
  UnstyledButton,
} from "@mantine/core";
import type { ReactNode } from "react";

type ImageViewerProps = {
  src: string;
  alt: string;
  modalTitle?: string;
  thumbWidth?: number | string;
  thumbHeight?: number | string;
  thumbRadius?: string | number;
  previewMaxHeight?: string | number;
  overlay?: ReactNode;
};

export default function ImageViewer({
  src,
  alt,
  modalTitle,
  thumbWidth = 88,
  thumbHeight = 88,
  thumbRadius = "md",
  previewMaxHeight = "80dvh",
  overlay,
}: ImageViewerProps) {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Box pos="relative">
        <UnstyledButton onClick={() => setOpened(true)}>
          <Image
            src={src}
            alt={alt}
            w={thumbWidth}
            h={thumbHeight}
            fit="cover"
            radius={thumbRadius}
          />
        </UnstyledButton>

        {overlay ? (
          <Box pos="absolute" top={4} right={4}>
            {overlay}
          </Box>
        ) : null}
      </Box>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={modalTitle ?? "Image Preview"}
        centered
        size="auto"
      >
        <Box maw="min(96vw, 1100px)">
          <Image
            src={src}
            alt={alt}
            w="100%"
            mah={previewMaxHeight}
            fit="contain"
            radius="md"
          />
        </Box>
      </Modal>
    </>
  );
}
