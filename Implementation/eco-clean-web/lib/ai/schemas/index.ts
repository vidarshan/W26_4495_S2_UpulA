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

export const StaffRecommendationResponseSchema = z.object({
  brief: z.string(),
  topPick: z
    .object({
      staffId: z.string(),
      name: z.string(),
      reason: z.string(),
    })
    .nullable(),
  alternates: z
    .array(
      z.object({
        staffId: z.string(),
        name: z.string(),
        reason: z.string(),
      }),
    )
    .default([]),
  unavailable: z
    .array(
      z.object({
        staffId: z.string(),
        name: z.string(),
        reason: z.string(),
      }),
    )
    .default([]),
  cautions: z.array(z.string()).default([]),
});

export type StaffRecommendationResponse = z.infer<
  typeof StaffRecommendationResponseSchema
>;
