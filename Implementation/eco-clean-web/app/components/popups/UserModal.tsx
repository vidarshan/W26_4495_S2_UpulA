"use client";

import { createUser, deleteUser, editUser } from "@/lib/api/users";
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
  ScrollArea,
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
  IoLockClosed,
  IoPeople,
  IoPersonCircle,
  IoText,
} from "@/lib/icons";
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

// Matches backend response shape
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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

  // Mutation
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

      // Type-safe result handling
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
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Missing user id");
      return deleteUser(user.id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff"], exact: false }),
        queryClient.invalidateQueries({ queryKey: ["users"], exact: false }),
      ]);

      notifications.show({
        title: "User deleted",
        message: "The user has been soft deleted and can no longer log in.",
        color: "green",
      });

      handleClose(true);
    },
    onError: (error: Error) => {
      notifications.show({
        title: "Delete failed",
        message: error.message || "Could not delete the user.",
        color: "red",
      });
    },
  });

  const isDeleting = deleteMutation.isPending;
  const isBusyAny = isBusy || isDeleting;
  const isCreateComplete = mode === "create" && !!generatedPassword;

  const handleClose = (force = false) => {
    if (isBusyAny && !force) return;

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
      yOffset="2vh"
      scrollAreaComponent={ScrollArea.Autosize}
      closeOnClickOutside={!isBusyAny}
      closeOnEscape={!isBusyAny}
      withCloseButton={!isBusyAny}
      styles={{
        content: {
          maxHeight: "calc(100dvh - 4vh)",
        },
        body: {
          maxHeight: "calc(100dvh - 11rem)",
          overflowY: "auto",
        },
      }}
      classNames={{
        content: "app-modal__content",
        header: "app-modal__header",
        title: "app-modal__title",
        body: "app-modal__body",
      }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Paper withBorder radius="md" p="lg" className="app-modal__hero">
            <Group justify="space-between" align="flex-start" wrap="wrap">
              <Group align="flex-start" wrap="nowrap" gap="md">
                <ThemeIcon size={48} radius="md" color="lime" variant="light" className="app-modal__icon">
                  <IoPersonCircle size={22} />
                </ThemeIcon>
                <Stack gap={4}>
                  <Text size="xs" fw={800} c="dimmed" className="app-modal__eyebrow">
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
                radius="md"
                variant="light"
                color={mode === "create" ? "teal" : "blue"}
              >
                {mode === "create" ? "New user" : "Existing user"}
              </Badge>
            </Group>
          </Paper>

          {isBusyAny && (
            <Alert color="gray" className="app-modal__banner">
              <Group gap="xs">
                <Loader size="sm" />
                <Text size="sm">
                  {isDeleting
                    ? "Deleting user..."
                    : mode === "create"
                      ? "Creating user..."
                      : "Saving changes..."}
                </Text>
              </Group>
            </Alert>
          )}

          <Paper withBorder radius="md" p="lg" className="app-modal__section">
            <Stack gap="md">
              <Text fw={700}>Account details</Text>

              <TextInput
                leftSection={<IoText />}
                label="Name"
                placeholder="Staff name"
                disabled={isBusyAny || isCreateComplete}
                {...form.getInputProps("name")}
              />

              <TextInput
                leftSection={<IoText />}
                label="Email"
                placeholder="Staff email"
                disabled={isBusyAny || isCreateComplete}
                {...form.getInputProps("email")}
              />

              <Select
                label="Role"
                data={roleOptions}
                value={form.values.role}
                leftSection={<IoPeople />}
                disabled={isBusyAny || isCreateComplete}
                onChange={(v) =>
                  form.setFieldValue("role", (v as Role) || "STAFF")
                }
              />
            </Stack>
          </Paper>

          {mode === "create" && generatedPassword && (
            <Paper withBorder radius="md" p="lg" className="app-modal__section">
              <Stack gap={8}>
                <Group gap="sm">
                  <ThemeIcon
                    radius="md"
                    size="lg"
                    variant="light"
                    color="grape"
                    className="app-modal__icon"
                  >
                    <IoLockClosed size={18} />
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
            <Paper withBorder radius="md" p="lg" className="app-modal__section">
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

          {mode === "edit" && form.values.role === "STAFF" && (
            <Paper withBorder radius="md" p="md" className="app-modal__subsection">
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
        </Stack>

        <Flex mt="md" gap="xs" direction="column">
          <Group grow>
            {mode === "edit" && (
              <Button
                color="red"
                variant="light"
                onClick={() => setConfirmDeleteOpen(true)}
                loading={isDeleting}
              >
                Delete
              </Button>
            )}
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
        staff={user ?? null}
      />

      <Modal
        opened={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Delete user"
        centered
        classNames={{
          content: "app-modal__content",
          header: "app-modal__header",
          title: "app-modal__title",
          body: "app-modal__body",
        }}
      >
        <Stack gap="md">
          <Text size="sm">
            Soft delete this user? They will no longer appear in lists or be
            able to log in.
          </Text>

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={isDeleting}
              onClick={() => {
                deleteMutation.mutate();
                setConfirmDeleteOpen(false);
              }}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Modal>
  );
}
