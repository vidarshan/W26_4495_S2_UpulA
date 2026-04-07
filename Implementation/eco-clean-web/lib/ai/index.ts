import OpenAI from "openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { buildPayComparisonContext } from "./context/payComparison";
import { buildPayComparisonPrompt } from "./prompts/payComparison";
import { mapToPayComparison } from "./transformers/paycomparison";
import { TaskAssistantResponseSchema } from "./schemas";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateStructuredJson<T>({
  system,
  user,
  schema,
}: {
  system: string;
  user: string;
  schema: z.ZodSchema<T>;
}): Promise<T> {
  const response = await openai.responses.create({
    model: "gpt-5-mini",
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "task_assistant_response",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            brief: { type: "string" },
            priorityOrder: {
              type: "array",
              items: { type: "string" },
            },
            timePlan: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  label: { type: "string" },
                  minutes: { type: "number" },
                },
                required: ["label", "minutes"],
              },
            },
            alerts: {
              type: "array",
              items: { type: "string" },
            },
            checklist: {
              type: "array",
              items: { type: "string" },
            },
            riskLevel: {
              type: "string",
              enum: ["low", "medium", "high"],
            },
            riskReason: {
              type: ["string", "null"],
            },
            completionDraft: {
              type: ["string", "null"],
            },
          },
          required: [
            "brief",
            "priorityOrder",
            "timePlan",
            "alerts",
            "checklist",
            "riskLevel",
            "riskReason",
            "completionDraft",
          ],
        },
      },
    },
  });

  const raw = response.output_text;
  const parsed = JSON.parse(raw);
  return schema.parse(parsed);
}

export const PayComparisonResponseSchema = z.object({
  summary: z.string(),
  keyDrivers: z.array(z.string()),
  increases: z.array(z.string()),
  decreases: z.array(z.string()),
  anomalies: z.array(z.string()).default([]),
  recommendation: z.string().nullable(),
});

export async function runPayComparisonFeature(a: any, b: any) {
  const context = buildPayComparisonContext(a, b);

  const aiRaw = await generateStructuredJson({
    system: "You are a payroll assistant",
    user: buildPayComparisonPrompt(context),
    schema: TaskAssistantResponseSchema,
  });

  return mapToPayComparison(aiRaw);
}

export {
  getCachedAppointmentInsight,
  getTaskAssistantInsightType,
  runTaskAssistantFeature,
  saveAppointmentInsight,
} from "@/lib/ai/appointments";
