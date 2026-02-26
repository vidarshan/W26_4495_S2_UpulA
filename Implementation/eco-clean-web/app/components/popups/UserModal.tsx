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

type CreateUserResult = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt?: string;
  };
  tempPassword: string;
};

type EditUserResult = {
  user?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  };
};

type MutationResult = CreateUserResult | EditUserResult;

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

  useEffect(() => {
    if (!opened) return;
    setGeneratedPassword("");
    form.setValues(initialValues);
    form.resetDirty();
    form.clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, initialValues]);

  const mutation = useMutation<MutationResult, Error, FormValues>({
    mutationFn: async (values) => {
      if (mode === "create") {
        // expected: { user, tempPassword }
        return (await createUser(
          values.name,
          values.role,
          values.email,
        )) as CreateUserResult;
      }

      if (!user?.id) throw new Error("Missing user id");

      const passwordToSet = (values.password || "").trim();

      // expected: updated user or any success payload
      return (await editUser(
        user.id,
        values.name,
        values.role,
        values.email,
        passwordToSet ? passwordToSet : undefined,
      )) as EditUserResult;
    },

    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: ["staff"],
        exact: false,
      });

      if (mode === "create") {
        // Narrow result type safely
        const temp = "tempPassword" in result ? result.tempPassword : "";
        setGeneratedPassword(temp);

        form.setFieldValue("password", "");
        form.setFieldValue("confirmPassword", "");
        return; // keep open so admin can copy
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

  const roleOptions: { value: Role; label: string }[] = [
    { value: "ADMIN", label: "Admin" },
    { value: "STAFF", label: "Staff" },
  ];

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
          <TextInput
            leftSection={<IoTextOutline />}
            label="Name"
            placeholder="Staff name"
            {...form.getInputProps("name")}
          />
          <TextInput
            leftSection={<IoTextOutline />}
            placeholder="Staff email"
            label="Email"
            {...form.getInputProps("email")}
          />

          <Select
            label="Role"
            data={roleOptions}
            value={form.values.role}
            leftSection={<IoPeopleOutline />}
            onChange={(v) => {
              // Mantine Select returns string | null
              const nextRole: Role =
                v === "ADMIN" || v === "STAFF" ? v : "STAFF";
              form.setFieldValue("role", nextRole);
            }}
            error={form.errors.role}
          />

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
