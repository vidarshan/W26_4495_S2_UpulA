// src/components/ui/Title.tsx
import { Text, StyleSheet } from "react-native";
import { colors, spacing } from "@/theme/index";

type TitleProps = {
  children: string;
  variant?: "screen" | "section" | "label";
};

export function Title({ children, variant = "screen" }: TitleProps) {
  return <Text style={[styles.base, styles[variant]]}>{children}</Text>;
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
  },

  screen: {
    fontSize: 28,
    fontWeight: "700",
  },

  section: {
    fontSize: 20,
    fontWeight: "600",
  },

  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.muted,
  },
});
