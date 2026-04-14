"use client";

import { ActionIcon, Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { IoAdd, IoTrash } from "@/lib/icons";

export type ChecklistDraftItem = {
  id: string;
  persistedId?: string;
  label: string;
};

type Props = {
  items: ChecklistDraftItem[];
  onChange: (items: ChecklistDraftItem[]) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  addLabel?: string;
};

export function createChecklistDraftItem(
  label = "",
  persistedId?: string,
): ChecklistDraftItem {
  return {
    id: crypto.randomUUID(),
    ...(persistedId ? { persistedId } : {}),
    label,
  };
}

export default function ChecklistEditor({
  items,
  onChange,
  disabled = false,
  label = "Checklist",
  description = "Add the steps staff should complete for this appointment.",
  addLabel = "Add checklist item",
}: Props) {
  const updateItem = (id: string, label: string) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, label } : item)),
    );
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const addItem = () => {
    onChange([...items, createChecklistDraftItem()]);
  };

  return (
    <Stack gap="xs">
      <div>
        <Text fw={600} size="sm">
          {label}
        </Text>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      </div>

      {items.length ? (
        <Stack gap="xs">
          {items.map((item, index) => (
            <Group key={item.id} align="end" wrap="nowrap">
              <TextInput
                style={{ flex: 1 }}
                label={`Item ${index + 1}`}
                placeholder="e.g. Vacuum lobby and front entry"
                value={item.label}
                disabled={disabled}
                onChange={(event) => updateItem(item.id, event.currentTarget.value)}
              />

              <ActionIcon
                color="red"
                variant="light"
                size="lg"
                aria-label={`Remove checklist item ${index + 1}`}
                disabled={disabled}
                onClick={() => removeItem(item.id)}
              >
                <IoTrash size={16} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      ) : (
        <Text size="sm" c="dimmed">
          No checklist items yet.
        </Text>
      )}

      <Button
        type="button"
        variant="light"
        color="lime"
        leftSection={<IoAdd size={16} />}
        disabled={disabled}
        onClick={addItem}
      >
        {addLabel}
      </Button>
    </Stack>
  );
}
