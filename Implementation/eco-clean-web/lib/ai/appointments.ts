import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateStructuredJson } from "@/lib/ai/runtime";
import {
  TaskAssistantFeatureInput,
  taskAssistantFeature,
} from "@/lib/ai/features/taskAssistant";

type AppointmentAiFeature = typeof taskAssistantFeature;

export async function getCachedAppointmentInsight(
  appointmentId: string,
  type: string,
) {
  return prisma.appointmentAiInsight.findUnique({
    where: {
      appointmentId_type: {
        appointmentId,
        type,
      },
    },
  });
}

export async function saveAppointmentInsight({
  appointmentId,
  type,
  payload,
  model,
  promptVersion,
}: {
  appointmentId: string;
  type: string;
  payload: Prisma.InputJsonValue;
  model: string;
  promptVersion: string;
}) {
  return prisma.appointmentAiInsight.upsert({
    where: {
      appointmentId_type: {
        appointmentId,
        type,
      },
    },
    update: {
      payload,
      model,
      promptVersion,
    },
    create: {
      appointmentId,
      type,
      payload,
      model,
      promptVersion,
    },
  });
}

export async function runTaskAssistantFeature(
  appointmentId: string,
  input: TaskAssistantFeatureInput,
) {
  const feature: AppointmentAiFeature = taskAssistantFeature;
  const context = await feature.getContext(appointmentId, input);

  if (!context) {
    return null;
  }

  const promptContext = {
    ...context,
    mode: input.mode,
  };

  const result = await generateStructuredJson({
    system: feature.system,
    user: feature.buildUserPrompt(promptContext),
    schemaName: feature.schemaName,
    schema: feature.schema,
    model: feature.model,
  });

  await saveAppointmentInsight({
    appointmentId,
    type: getTaskAssistantInsightType(input),
    payload: result,
    model: feature.model,
    promptVersion: feature.promptVersion,
  });

  return result;
}

export function getTaskAssistantInsightType(input: TaskAssistantFeatureInput) {
  if (
    input.mode === "plan" &&
    input.includePreviousVisit &&
    !input.staffNoteDraft
  ) {
    return taskAssistantFeature.type;
  }

  return `task_assistant.${input.mode}.volatile`;
}
