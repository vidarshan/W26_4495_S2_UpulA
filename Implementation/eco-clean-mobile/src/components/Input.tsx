// src/components/ui/Input.tsx
import { TextInput, StyleSheet, View, Text } from "react-native";
import { colors, spacing, radius } from "@/theme/index";

type InputProps = {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  textContentType?: "password" | "none";
  error?: string;
  onChangeText?: (text: string) => void;
};

export function Input({
  value,
  placeholder,
  disabled,
  error,
  onChangeText,
  textContentType,
}: InputProps) {
  return (
    <View>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        editable={!disabled}
        onChangeText={onChangeText}
        textContentType="password"
        autoCapitalize="none"
        secureTextEntry={textContentType === "password"}
        autoCorrect={false}
        style={[
          styles.base,
          disabled && styles.disabled,
          error && styles.error,
        ]}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48, // matches Button
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    fontFamily: "ComicNeue-Regular",
  },
  disabled: {
    opacity: 0.5,
  },
  error: {
    borderColor: colors.error,
  },
  errorText: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.error,
  },
});
