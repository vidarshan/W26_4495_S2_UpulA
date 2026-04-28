export type ChecklistInput = {
  id?: string;
  label: string;
};

export type NormalizedChecklistInput = ChecklistInput & {
  sortOrder: number;
};

export function normalizeChecklistInput(raw: unknown): NormalizedChecklistInput[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object",
    )
    .map((item) => {
      const id =
        typeof item.id === "string" && item.id.trim().length
          ? item.id.trim()
          : undefined;
      const label =
        typeof item.label === "string" ? item.label.trim() : "";

      return {
        ...(id ? { id } : {}),
        label,
      };
    })
    .filter((item) => item.label.length > 0)
    .map((item, index) => ({
      ...item,
      sortOrder: index,
    }));
}

export function normalizeLeadStaffId(
  rawLeadStaffId: unknown,
  staffIds: string[],
): string | null {
  if (typeof rawLeadStaffId !== "string" || !rawLeadStaffId.trim()) {
    return staffIds[0] ?? null;
  }

  const leadStaffId = rawLeadStaffId.trim();
  return staffIds.includes(leadStaffId) ? leadStaffId : (staffIds[0] ?? null);
}
