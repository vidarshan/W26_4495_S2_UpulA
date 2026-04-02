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
  Loader,
  Paper,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { IoPeopleOutline, IoTextOutline } from "react-icons/io5";

type Mode = "create" | "edit";
type Role = "ADMIN" | "STAFF";

type UserLite = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: Role | string | null;
};

type Props = {
  opened: boolean;
  onClose: () => void;
  mode: Mode;
  user?: UserLite | null;
};

type FormValues = {
  name: string;
  email: string;
  role: Role;
  password: string;
  confirmPassword: string;
};

// ✅ FIXED TYPE (matches backend)
type CreateUserResult = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt?: string;
  };
  staffProfile?: any;
  temporaryPassword: string;
};

type EditUserResult = {
  user?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  };
};

export default function UserUpsertModal({
  opened,
  onClose,
  mode,
  user,
}: Props) {
  const queryClient = useQueryClient();
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);

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
      email: (v) =>
        /^\S+@\S+\.\S+$/.test(v.trim()) ? null : "Invalid email address",

      password: (value) => {
        const p = (value || "").trim();
        if (!p) return null;
        return p.length < 8 ? "Password must be at least 8 characters" : null;
      },

      confirmPassword: (value, values) => {
        const p = (values.password || "").trim();
        const c = (value || "").trim();

        if (!p) return null;
        if (!c) return "Please confirm the password";
        return c !== p ? "Passwords do not match" : null;
      },
    },
  });

  useEffect(() => {
    if (!opened) return;

    setGeneratedPassword("");
    setCopied(false);
    form.setValues(initialValues);
    form.resetDirty();
    form.clearErrors();
  }, [opened, initialValues]);

  // ✅ FIXED MUTATION
  const mutation = useMutation<CreateUserResult | EditUserResult, Error, FormValues>({
    mutationFn: async (values): Promise<CreateUserResult | EditUserResult> => {
  if (mode === "create") {
    return (await createUser(
      values.name.trim(),
      values.role,
      values.email.trim().toLowerCase(),
    )) as CreateUserResult;
  }

  if (!user?.id) throw new Error("Missing user id");

  const passwordToSet = (values.password || "").trim();

  return (await editUser(
    user.id,
    values.name.trim(),
    values.role,
    values.email.trim().toLowerCase(),
    passwordToSet ? passwordToSet : undefined,
  )) as EditUserResult;
},

    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["users"], exact: false }),
      ]);

      // ✅ CLEAN TYPE-SAFE HANDLING
      if (mode === "create" && "temporaryPassword" in result) {
        const temp = result.temporaryPassword;

        setGeneratedPassword(temp);

        form.setFieldValue("password", "");
        form.setFieldValue("confirmPassword", "");

        notifications.show({
          title: "User created",
          message: "User created successfully. Copy the generated password.",
          color: "green",
        });

        return;
      }

      notifications.show({
        title: "User updated",
        message: "User details saved successfully.",
        color: "green",
      });

      handleClose(true);
    },

    onError: (error) => {
      console.error(error);
      notifications.show({
        title: mode === "create" ? "Create failed" : "Update failed",
        message: error.message || "Something went wrong. Please try again.",
        color: "red",
      });
    },
  });

  const isBusy = mutation.isPending;
  const isCreateComplete = mode === "create" && !!generatedPassword;

  const handleClose = (force = false) => {
    if (isBusy && !force) return;

    setGeneratedPassword("");
    setCopied(false);
    form.reset();
    form.clearErrors();
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

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);

      notifications.show({
        title: "Copied",
        message: "Generated password copied to clipboard.",
        color: "green",
      });
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Copy failed",
        message: "Could not copy password. Please copy it manually.",
        color: "red",
      });
    }
  };

  const roleOptions = [
    { value: "ADMIN", label: "Admin" },
    { value: "STAFF", label: "Staff" },
  ];

  return (
    <Modal
      opened={opened}
      onClose={() => handleClose()}
      title={mode === "create" ? "Add User" : "Edit User"}
      size="sm"
      centered
      closeOnClickOutside={!isBusy}
      closeOnEscape={!isBusy}
      withCloseButton={!isBusy}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="sm">
          {isBusy && (
            <Paper withBorder p="sm" radius="md">
              <Group gap="xs">
                <Loader size="sm" />
                <Text size="sm">
                  {mode === "create" ? "Creating user..." : "Saving changes..."}
                </Text>
              </Group>
            </Paper>
          )}

          <TextInput
            leftSection={<IoTextOutline />}
            label="Name"
            placeholder="Staff name"
            disabled={isBusy || isCreateComplete}
            {...form.getInputProps("name")}
          />

          <TextInput
            leftSection={<IoTextOutline />}
            label="Email"
            placeholder="Staff email"
            disabled={isBusy || isCreateComplete}
            {...form.getInputProps("email")}
          />

          <Select
            label="Role"
            data={roleOptions}
            value={form.values.role}
            leftSection={<IoPeopleOutline />}
            disabled={isBusy || isCreateComplete}
            onChange={(v) =>
              form.setFieldValue("role", (v as Role) || "STAFF")
            }
          />

          {mode === "create" && generatedPassword && (
            <Stack gap={6} mt="xs">
              <Text size="sm" fw={600}>
                Generated password
              </Text>

              <Group justify="space-between">
                <Code style={{ flex: 1 }}>{generatedPassword}</Code>

                <Button onClick={handleCopyPassword}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </Group>

              <Text size="xs" c="dimmed">
                Copy this now — you won’t be able to view it again later.
              </Text>
            </Stack>
          )}

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
          <Button variant="default" onClick={() => handleClose()} fullWidth>
            Cancel
          </Button>

          <Button type="submit" loading={isBusy} fullWidth>
            {submitLabel}
          </Button>
        </Flex>
      </form>
    </Modal>
  );
}