// src/components/ui/Title.tsx
import { Text, StyleSheet } from "react-native";
import { colors } from "@/theme/index";

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
    fontFamily: "ComicNeue-Bold",
    fontWeight: "900",
  },
  screen: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "ComicNeue-Regular",
  },

  section: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "ComicNeue-Regular",
  },

  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.muted,
    fontFamily: "ComicNeue-Regular",
  },
});
