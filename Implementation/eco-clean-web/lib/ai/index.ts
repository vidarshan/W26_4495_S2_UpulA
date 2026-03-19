import OpenAI from "openai";
import { z } from "zod";

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
