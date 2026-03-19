import { z } from "zod";

export const TaskAssistantResponseSchema = z.object({
  brief: z.string(),
  priorityOrder: z.array(z.string()).default([]),
  timePlan: z
    .array(
      z.object({
        label: z.string(),
        minutes: z.number().int().nonnegative(),
      }),
    )
    .default([]),
  alerts: z.array(z.string()).default([]),
  checklist: z.array(z.string()).default([]),
  riskLevel: z.enum(["low", "medium", "high"]),
  riskReason: z.string().nullable(),
  completionDraft: z.string().nullable(),
});

export type TaskAssistantResponse = z.infer<typeof TaskAssistantResponseSchema>;
