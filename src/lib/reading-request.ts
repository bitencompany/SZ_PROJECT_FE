import { z } from "zod";
import { birthSchema, nameSchema } from "./validation";

export const readingRequestSchema = nameSchema
  .extend({
    requestId: z.string().uuid(),
    birth: birthSchema.nullable(),
    consentToSave: z.literal(true),
    previewId: z.uuid().optional(),
  })
  .strict();

export const reportSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(4000),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1).max(200),
        body: z.string().min(1).max(12000),
      }),
    )
    .min(1)
    .max(20),
});
