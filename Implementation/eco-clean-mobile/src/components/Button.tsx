// src/components/ui/Button.tsx
import { Pressable, Text, StyleSheet } from "react-native";
import { colors, spacing, radius } from "@/theme/index";

type ButtonProps = {
  title: string;
  variant?: "primary" | "outline";
  disabled?: boolean;
  onPress?: () => void;
};

export function Button({
  title,
  variant = "primary",
  disabled,
  onPress,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.text, styles[`${variant}Text`]]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "ComicNeue-Regular",
  },
  primaryText: {
    color: colors.primaryText,
  },
  outlineText: {
    color: colors.primary,
  },
});
