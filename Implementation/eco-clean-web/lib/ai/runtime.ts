import { z } from "zod";
import { openai } from "@/lib/ai/client";

export async function generateStructuredJson<T>({
  system,
  user,
  schemaName,
  schema,
  model,
}: {
  system: string;
  user: string;
  schemaName: string;
  schema: z.ZodType<T>;
  model: string;
}): Promise<T> {
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
        strict: true,
        schema: z.toJSONSchema(schema),
      },
    },
  });

  const parsed = JSON.parse(response.output_text);
  return schema.parse(parsed);
}
