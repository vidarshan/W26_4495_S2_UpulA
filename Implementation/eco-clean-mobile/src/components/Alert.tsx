import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AlertVariant = "info" | "success" | "warning" | "error";

type AlertProps = {
  title: string;
  message?: string;
  variant?: AlertVariant;
  onClose?: () => void;
};

const VARIANT_STYLES = {
  info: {
    bg: "#1F2A37",
    icon: "information-circle-outline",
    iconColor: "#60A5FA",
  },
  success: {
    bg: "#052E16",
    icon: "checkmark-circle-outline",
    iconColor: "#22C55E",
  },
  warning: {
    bg: "#422006",
    icon: "warning-outline",
    iconColor: "#F59E0B",
  },
  error: {
    bg: "#d7707069",
    icon: "alert-circle-outline",
    iconColor: "#F87171",
  },
};

export function Alert({
  title,
  message,
  variant = "info",
  onClose,
}: AlertProps) {
  const stylesForVariant = VARIANT_STYLES[variant];

  return (
    <View style={[styles.container, { backgroundColor: stylesForVariant.bg }]}>
      <Ionicons
        name={stylesForVariant.icon as any}
        size={22}
        color={stylesForVariant.iconColor}
        style={styles.icon}
      />

      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {message && <Text style={styles.message}>{message}</Text>}
      </View>

      {onClose && (
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={18} color="#9CA3AF" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    alignItems: "flex-start",
  },
  icon: {
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "#353535",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  message: {
    color: "#353535",
    fontSize: 14,
    lineHeight: 20,
  },
});
