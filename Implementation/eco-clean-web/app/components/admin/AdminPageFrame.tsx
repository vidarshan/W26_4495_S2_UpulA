import { Box, Group, Paper, SimpleGrid, Text, ThemeIcon } from "@mantine/core";
import { ReactNode } from "react";
import { IconType } from "react-icons";

type StatItem = {
  label: string;
  value: string;
  icon: IconType;
};

type AdminPageFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  stats?: StatItem[];
  children: ReactNode;
};

export default function AdminPageFrame({
  eyebrow,
  title,
  description,
  action,
  stats = [],
  children,
}: AdminPageFrameProps) {
  return (
    <Box className="admin-page-frame">
      <Group justify="space-between" align="flex-end" gap="md" mb="lg">
        <Box maw={720}>
          <Text
            size="xs"
            fw={700}
            tt="uppercase"
            c="#64748b"
            style={{ letterSpacing: "0.08em" }}
          >
            {eyebrow}
          </Text>
          <Text size="2rem" fw={700} lh={1.2} mt={4} c="#0f172a">
            {title}
          </Text>
          <Text size="sm" mt={6} c="#475569">
            {description}
          </Text>
        </Box>

        {action ? <Box>{action}</Box> : null}
      </Group>

      {stats.length ? (
        <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md" mb="lg">
          {stats.map((stat) => (
            <Paper
              key={`${stat.label}-${stat.value}`}
              radius="lg"
              p="md"
              withBorder
              className="admin-page-frame__stat"
            >
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Box>
                  <Text size="xs" fw={600} c="#64748b">
                    {stat.label}
                  </Text>
                  <Text size="lg" fw={700} mt={6} c="#111827">
                    {stat.value}
                  </Text>
                </Box>
                <ThemeIcon size={40} radius="lg" variant="light" color="gray">
                  <stat.icon size={18} />
                </ThemeIcon>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      ) : null}

      <Paper
        radius="lg"
        p={{ base: "md", md: "lg" }}
        withBorder
        className="admin-page-frame__surface"
      >
        {children}
      </Paper>
    </Box>
  );
}
