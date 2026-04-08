"use client";

import { createUser, editUser } from "@/lib/api/users";
import {
  Alert,
  Badge,
  Button,
  Code,
  Flex,
  Group,
  Modal,
  PasswordInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Loader,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  IoLockClosedOutline,
  IoPeopleOutline,
  IoPersonCircleOutline,
  IoTextOutline,
} from "react-icons/io5";
import AdminStaffDetailsModal from "@/app/components/popups/AdminStaffDetailsModal";
import { StaffRole } from "@/types";
type Mode = "create" | "edit";
type Role = StaffRole;

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
  staffProfile?: unknown;
  temporaryPassword: string;
};

type EditUserResult = {
  user?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  };
  staffProfile?: unknown;
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
  const [detailsOpen, setDetailsOpen] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, mode, user?.id]);

  // ✅ FIXED MUTATION
  const mutation = useMutation<
    CreateUserResult | EditUserResult,
    Error,
    FormValues
  >({
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
      size={mode === "edit" ? "lg" : "sm"}
      centered
      closeOnClickOutside={!isBusy}
      closeOnEscape={!isBusy}
      withCloseButton={!isBusy}
      classNames={{
        content: "app-modal__content",
        header: "app-modal__header",
        title: "app-modal__title",
        body: "app-modal__body",
      }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Paper withBorder radius="xl" p="lg">
            <Group justify="space-between" align="flex-start" wrap="wrap">
              <Group align="flex-start" wrap="nowrap" gap="md">
                <ThemeIcon size={48} radius="xl" color="lime" variant="light">
                  <IoPersonCircleOutline size={22} />
                </ThemeIcon>
                <Stack gap={4}>
                  <Text size="xs" fw={800} c="dimmed" tt="uppercase">
                    User Access
                  </Text>
                  <Text fw={800} size="lg">
                    {mode === "create"
                      ? "Create a team account"
                      : "Edit account details"}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Control identity, role access, and staff-profile management
                    from one admin entry point.
                  </Text>
                </Stack>
              </Group>

              <Badge
                radius="xl"
                variant="light"
                color={mode === "create" ? "teal" : "blue"}
              >
                {mode === "create" ? "New user" : "Existing user"}
              </Badge>
            </Group>
          </Paper>

          {isBusy && (
            <Alert color="gray">
              <Group gap="xs">
                <Loader size="sm" />
                <Text size="sm">
                  {mode === "create" ? "Creating user..." : "Saving changes..."}
                </Text>
              </Group>
            </Alert>
          )}

          <Paper withBorder radius="xl" p="lg">
            <Stack gap="md">
              <Text fw={700}>Account details</Text>

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
            </Stack>
          </Paper>

          {mode === "create" && generatedPassword && (
            <Paper withBorder radius="xl" p="lg">
              <Stack gap={8}>
                <Group gap="sm">
                  <ThemeIcon
                    radius="xl"
                    size="lg"
                    variant="light"
                    color="grape"
                  >
                    <IoLockClosedOutline size={18} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text fw={700}>Generated password</Text>
                    <Text size="sm" c="dimmed">
                      Copy this now. It will not be shown again after this modal
                      closes.
                    </Text>
                  </Stack>
                </Group>

                <Group justify="space-between" align="center">
                  <Code block style={{ flex: 1 }}>
                    {generatedPassword}
                  </Code>
                  <Button onClick={handleCopyPassword}>
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </Group>
              </Stack>
            </Paper>
          )}

          {mode === "edit" && (
            <Paper withBorder radius="xl" p="lg">
              <Stack gap="md">
                <Text fw={700}>Password reset</Text>
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
              </Stack>
            </Paper>
          )}
        </Stack>

        <Flex mt="md" gap="xs" direction="column">
          {mode === "edit" && form.values.role === "STAFF" && (
            <Paper withBorder radius="lg" p="md">
              <Group justify="space-between" align="center" wrap="wrap">
                <Stack gap={2}>
                  <Text fw={700}>Staff workspace</Text>
                  <Text size="sm" c="dimmed">
                    Open profile, payroll, and contact management in one larger
                    admin panel.
                  </Text>
                </Stack>
                <Button
                  variant="light"
                  color="lime"
                  onClick={() => {
                    setDetailsOpen(true);
                  }}
                >
                  Open Staff Workspace
                </Button>
              </Group>
            </Paper>
          )}

          <Group grow>
            <Button variant="default" onClick={() => handleClose()}>
              Cancel
            </Button>

            <Button type="submit" loading={isBusy}>
              {submitLabel}
            </Button>
          </Group>
        </Flex>
      </form>

      <AdminStaffDetailsModal
        opened={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        staff={user}
      />
    </Modal>
  );
}
