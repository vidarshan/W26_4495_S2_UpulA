"use client";

import { createUser, editUser } from "@/lib/api/users";
import {
  Button,
  Code,
  Flex,
  Group,
  Modal,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

type Mode = "create" | "edit";

type Props = {
  opened: boolean;
  onClose: () => void;
  mode: Mode;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: "ADMIN" | "STAFF" | string | null;
  } | null;
};

type FormValues = {
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  password: string;
  confirmPassword: string;
};

export default function UserUpsertModal({
  opened,
  onClose,
  mode,
  user,
}: Props) {
  const queryClient = useQueryClient();
  const [generatedPassword, setGeneratedPassword] = useState("");

  const initialValues = useMemo<FormValues>(
    () => ({
      name: mode === "edit" ? (user?.name ?? "") : "",
      email: mode === "edit" ? (user?.email ?? "") : "",
      role: mode === "edit" && user?.role === "ADMIN" ? "ADMIN" : "STAFF",
      password: "",
      confirmPassword: "",
    }),
    [mode, user],
  );

  const form = useForm<FormValues>({
    initialValues,
    validate: {
      name: (v) => (!v.trim() ? "Name is required" : null),
      email: (v) => (/^\S+@\S+$/.test(v) ? null : "Invalid email"),

      password: (value) => {
        const p = (value || "").trim();
        if (!p) return null; // optional on edit
        return p.length < 8 ? "Password must be at least 8 characters" : null;
      },

      confirmPassword: (value, values) => {
        const p = (values.password || "").trim();
        const c = (value || "").trim();

        if (!p) return null; // not resetting password
        if (!c) return "Please confirm the password";
        return c !== p ? "Passwords do not match" : null;
      },
    },
  });

  // reset when opening / switching mode / switching user
  useEffect(() => {
    if (!opened) return;
    setGeneratedPassword("");
    form.setValues(initialValues);
    form.resetDirty();
    form.clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, initialValues]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (mode === "create") {
        // returns { user, tempPassword }
        return createUser(values.name, values.role, values.email);
      }

      if (!user?.id) throw new Error("Missing user id");

      const passwordToSet = (values.password || "").trim();

      return editUser(
        user.id,
        values.name,
        values.role,
        values.email,
        passwordToSet ? passwordToSet : undefined,
      );
    },

    onSuccess: async (result: any) => {
      await queryClient.invalidateQueries({
        queryKey: ["staff"],
        exact: false,
      });

      if (mode === "create") {
        setGeneratedPassword(result?.tempPassword || "");
        form.setFieldValue("password", "");
        form.setFieldValue("confirmPassword", "");
        return; // keep open to copy password
      }

      onClose();
    },
  });

  const handleClose = () => {
    if (mutation.isPending) return;
    onClose();
  };

  const submitLabel =
    mode === "create" ? (generatedPassword ? "Done" : "Create") : "Save";

  const handleSubmit = (values: FormValues) => {
    if (mode === "create" && generatedPassword) {
      handleClose();
      return;
    }
    mutation.mutate(values);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={mode === "create" ? "Add User" : "Edit User"}
      size="sm"
      closeOnClickOutside={false}
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="sm">
          <TextInput label="Name" {...form.getInputProps("name")} />
          <TextInput label="Email" {...form.getInputProps("email")} />

          {/* Select needs manual wiring for best TS compatibility */}
          <Select
            label="Role"
            data={[
              { value: "ADMIN", label: "Admin" },
              { value: "STAFF", label: "Staff" },
            ]}
            value={form.values.role}
            onChange={(v) => form.setFieldValue("role", (v as any) || "STAFF")}
            error={form.errors.role}
          />

          {/* ADD: show generated password after successful create */}
          {mode === "create" && generatedPassword && (
            <Stack gap={6} mt="xs">
              <Text size="sm" fw={600}>
                Generated password
              </Text>
              <Group justify="space-between" align="center">
                <Code style={{ userSelect: "all" }}>{generatedPassword}</Code>
                <Button
                  type="button"
                  variant="light"
                  onClick={() =>
                    navigator.clipboard.writeText(generatedPassword)
                  }
                >
                  Copy
                </Button>
              </Group>
              <Text size="xs" c="dimmed">
                Copy this now — you won’t be able to view it again later.
              </Text>
            </Stack>
          )}

          {/* EDIT: optional password reset */}
          {mode === "edit" && (
            <>
              <PasswordInput
                label="Reset password"
                placeholder="Leave blank to keep unchanged"
                {...form.getInputProps("password")}
              />
              <PasswordInput
                label="Confirm password"
                placeholder="Re-enter password"
                {...form.getInputProps("confirmPassword")}
              />
            </>
          )}
        </Stack>

        <Flex mt="sm" gap="xs">
          <Button
            type="button"
            variant="default"
            onClick={handleClose}
            fullWidth
          >
            Cancel
          </Button>

          <Button type="submit" loading={mutation.isPending} fullWidth>
            {submitLabel}
          </Button>
        </Flex>
      </form>
    </Modal>
  );
}
