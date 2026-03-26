import { buildTaskAssistantPrompt } from "@/lib/ai/prompts";
import { TaskAssistantResponseSchema } from "@/lib/ai/schemas";
import { getTaskAssistantContext } from "@/lib/ai/context";

type TaskAssistantPromptContext = NonNullable<
  Awaited<ReturnType<typeof getTaskAssistantContext>>
> & {
  mode: "plan" | "complete";
};

export const taskAssistantFeature = {
  type: "task_assistant.plan",
  model: "gpt-5-mini",
  promptVersion: "task_assistant_v2",
  schemaName: "task_assistant_response",
  system:
    "You are an AI task assistant for a professional residential cleaning company. Return valid JSON only.",
  schema: TaskAssistantResponseSchema,
  async getContext(appointmentId: string, input: TaskAssistantFeatureInput) {
    return getTaskAssistantContext(appointmentId, {
      includePreviousVisit: input.includePreviousVisit,
      staffNoteDraft: input.staffNoteDraft,
    });
  },
  buildUserPrompt(context: TaskAssistantPromptContext) {
    return buildTaskAssistantPrompt(context, context.mode ?? "plan");
  },
};

export type TaskAssistantFeatureInput = {
  mode: "plan" | "complete";
  includePreviousVisit: boolean;
  staffNoteDraft: string | null;
};
