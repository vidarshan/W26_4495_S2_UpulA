import OpenAI from "openai";
import { z } from "zod";

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
  schemaName = "structured_response",
  model = "gpt-5-mini",
}: {
  system: string;
  user: string;
  schema: z.ZodSchema<T>;
  schemaName?: string;
  model?: string;
}): Promise<T> {
  const jsonSchema = z.toJSONSchema(schema);

  const response = await openai.responses.create({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        schema: jsonSchema,
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

export async function runPayComparisonFeature(a: unknown, b: unknown) {
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
