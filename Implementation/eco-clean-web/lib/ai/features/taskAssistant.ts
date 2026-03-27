import { buildTaskAssistantPrompt } from "@/lib/ai/prompts";
import { TaskAssistantResponseSchema } from "@/lib/ai/schemas";
import { getTaskAssistantContext } from "@/lib/ai/context";
import { AssignmentInsightFields } from "@/types";

export const taskAssistantFeature = {
  type: "task_assistant.plan",
  model: "gpt-5-mini",
  promptVersion: "task_assistant_v2",
  schemaName: "task_assistant_response",
  system:
    "You are an AI task assistant for a professional residential cleaning company. Return valid JSON only.",
  schema: TaskAssistantResponseSchema,
  async getContext(
    addressId: string,
    appointmentStart: string,
    appointmentEnd: string,
    overrides?: {
      jobTitle?: string | null;
      clientName?: string | null;
      requiredStaffCount?: number | null;
    },
  ) {
    return getTaskAssistantContext(
      addressId,
      appointmentStart,
      appointmentEnd,
      overrides,
    );
  },
  buildUserPrompt(context: AssignmentInsightFields) {
    return buildTaskAssistantPrompt(context);
  },
};

export type TaskAssistantFeatureInput = {
  mode: "plan" | "complete";
  includePreviousVisit: boolean;
  staffNoteDraft: string | null;
};
