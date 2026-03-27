import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  List,
  Progress,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useState } from "react";
import {
  IoAlertCircleOutline,
  IoArrowDown,
  IoArrowUp,
  IoCheckmarkCircleOutline,
  IoSparklesOutline,
} from "react-icons/io5";
import { TaskAssistantResponse } from "@/lib/ai/schemas";

type Props = {
  data: TaskAssistantResponse;
};

const riskColor = (risk: TaskAssistantResponse["riskLevel"]) => {
  if (risk === "high") return "red";
  if (risk === "medium") return "yellow";
  return "green";
};

export default function AiTaskAssistantCard({ data }: Props) {
  const [collapse, setCollapse] = useState(false);
  const totalMinutes = data.timePlan.reduce(
    (sum, item) => sum + item.minutes,
    0,
  );

  return (
    <Card
      radius="md"
      withBorder
      shadow="sm"
      p="md"
      style={{
        position: "relative",
        overflow: "hidden",
        background: `
          radial-gradient(circle at top right, rgba(236, 72, 153, 0.14), transparent 30%),
          radial-gradient(circle at bottom left, rgba(168, 85, 247, 0.12), transparent 28%),
          linear-gradient(135deg, rgba(253, 242, 248, 0.96) 0%, rgba(250, 245, 255, 0.98) 45%, rgba(255, 255, 255, 1) 100%)
        `,
        border: "1px solid rgba(236, 72, 153, 0.18)",
        boxShadow:
          "0 8px 24px rgba(236, 72, 153, 0.08), 0 2px 8px rgba(168, 85, 247, 0.06)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -36,
          right: -28,
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: "rgba(236, 72, 153, 0.16)",
          filter: "blur(28px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -26,
          left: -18,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "rgba(168, 85, 247, 0.12)",
          filter: "blur(24px)",
          pointerEvents: "none",
        }}
      />

      <Stack gap="md" style={{ position: "relative", zIndex: 1 }}>
        <Group justify="space-between" align="center">
          <Group gap="xs" justify="space-between">
            <ThemeIcon
              radius="md"
              variant="filled"
              style={{
                background: "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)",
                boxShadow: "0 6px 16px rgba(236, 72, 153, 0.24)",
              }}
            >
              <IoSparklesOutline size={16} />
            </ThemeIcon>
            <Title order={4}>AI Overview</Title>
          </Group>
          <Button
            leftSection={collapse ? <IoArrowUp /> : <IoArrowDown />}
            radius="xl"
            size="xs"
            variant="white"
            onClick={() => setCollapse(!collapse)}
          >
            {collapse ? "Collapse" : "Expand"}
          </Button>
        </Group>
        {collapse && (
          <>
            <Stack gap={4}>
              <Text fw={600}>Quick Brief</Text>
              <Text size="sm" c="dimmed">
                {data.brief}
              </Text>
            </Stack>

            {data.riskReason && (
              <Stack gap={4}>
                <Text fw={600}>Risk Insight</Text>
                <Text size="sm" c="dimmed">
                  {data.riskReason}
                </Text>
              </Stack>
            )}

            {data.priorityOrder.length > 0 && (
              <Stack gap={4}>
                <Text fw={600}>Priority Order</Text>

                <List
                  size="sm"
                  spacing="xs"
                  icon={
                    <ThemeIcon
                      radius="md"
                      size={18}
                      variant="filled"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(236, 72, 153, 0.92), rgba(168, 85, 247, 0.92))",
                      }}
                    >
                      <IoCheckmarkCircleOutline size={12} />
                    </ThemeIcon>
                  }
                >
                  {data.priorityOrder.map((item, index) => (
                    <List.Item key={index}>{item}</List.Item>
                  ))}
                </List>
              </Stack>
            )}

            {data.timePlan.length > 0 && (
              <Stack gap="xs">
                <Text fw={600}>Suggested Time Plan</Text>

                <Stack gap="xs">
                  {data.timePlan.map((item, index) => {
                    const percent =
                      totalMinutes > 0
                        ? (item.minutes / totalMinutes) * 100
                        : 0;

                    return (
                      <Stack
                        gap={4}
                        key={index}
                        style={{
                          background: "rgba(255, 255, 255, 0.52)",
                          border: "1px solid rgba(236, 72, 153, 0.08)",
                          borderRadius: 10,
                          padding: "10px 12px",
                        }}
                      >
                        <Group justify="space-between" align="center">
                          <Text size="sm">{item.label}</Text>
                          <Text size="xs" c="dimmed">
                            {item.minutes} min
                          </Text>
                        </Group>
                        <Progress
                          value={percent}
                          radius="xl"
                          size="sm"
                          style={{
                            background: "rgba(236, 72, 153, 0.08)",
                          }}
                        />
                        {index !== data.timePlan.length - 1 ? (
                          <Divider mt={6} color="rgba(236, 72, 153, 0.10)" />
                        ) : null}
                      </Stack>
                    );
                  })}
                </Stack>
              </Stack>
            )}

            {data.alerts.length > 0 && (
              <Stack gap={4}>
                <Text fw={600}>Alerts</Text>

                <List
                  size="sm"
                  spacing="xs"
                  icon={
                    <ThemeIcon
                      radius="md"
                      size={18}
                      variant="filled"
                      color="yellow"
                    >
                      <IoAlertCircleOutline size={12} />
                    </ThemeIcon>
                  }
                >
                  {data.alerts.map((item, index) => (
                    <List.Item key={index}>{item}</List.Item>
                  ))}
                </List>
              </Stack>
            )}

            {data.checklist.length > 0 && (
              <Stack gap={4}>
                <Text fw={600}>Checklist</Text>
                <List
                  size="sm"
                  spacing="xs"
                  icon={
                    <ThemeIcon
                      radius="md"
                      size={18}
                      variant="filled"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(236, 72, 153, 0.92), rgba(168, 85, 247, 0.92))",
                      }}
                    >
                      <IoCheckmarkCircleOutline size={12} />
                    </ThemeIcon>
                  }
                >
                  {data.checklist.map((item, index) => (
                    <List.Item key={index}>{item}</List.Item>
                  ))}
                </List>
              </Stack>
            )}

            {data.completionDraft && (
              <Stack gap={4}>
                <Text fw={600}>Completion Draft</Text>
                <Text size="sm" c="dimmed">
                  {data.completionDraft}
                </Text>
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
}
