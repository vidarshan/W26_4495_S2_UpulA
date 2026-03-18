import { Paper, Group, Text, Badge, Stack, ThemeIcon } from "@mantine/core";
import { IoSparklesOutline } from "react-icons/io5";

type Props = {
  insights: string[];
};

export function AIInsightsSection({ insights }: Props) {
  return (
    <Paper
      p="md"
      style={{
        position: "relative",
        color: "white",
        background:
          "linear-gradient(120deg, rgba(168,85,247,0.70), rgba(59,130,246,0.80))",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06), transparent 40%)",
          pointerEvents: "none",
        }}
      />
      <Stack gap="xs" style={{ position: "relative", zIndex: 1 }}>
        <Text size="sm" fw={600}>
          AI Insights
        </Text>
        <Text size="lg" fw={600}>
          Smarter recommendations for your workflow
        </Text>
        <Text size="sm" style={{ opacity: 0.7, maxWidth: 520 }}>
          Analyze patterns and guide decisions using AI-powered insights.
        </Text>
      </Stack>
    </Paper>
  );
}
