import { z } from "zod";
import { nameSchema, birthSchema } from "./validation";
import { reportSchema } from "./reading-request";
export const storedInputSchema = nameSchema
  .extend({ birth: birthSchema.nullable() })
  .strict();
export const savedRequestSchema = z.object({
  data: z.object({
    requestId: z.uuid(),
    input: storedInputSchema,
    createdAt: z.iso.datetime(),
  }),
});
export const saveResponseSchema = z.object({
  data: z.object({ requestId: z.uuid(), paymentAvailable: z.literal(false) }),
});
export const readingListSchema = z.object({
  data: z
    .array(
      z.object({
        id: z.uuid(),
        subjectName: z.string().max(100),
        title: z.string().max(200),
        createdAt: z.iso.datetime(),
      }),
    )
    .max(20),
  nextPage: z.number().int().min(0).max(10000).nullable(),
});
export const readingDetailSchema = z.object({
  data: z.object({
    id: z.uuid(),
    subjectName: z.string().max(100),
    content: reportSchema,
    createdAt: z.iso.datetime(),
    provenance: z.unknown(),
  }),
});
export const orderSchema = z.object({
  data: z.object({
    orderId: z.uuid(),
    status: z.enum(["pending", "paid", "failed", "cancelled", "refunded"]),
    amount: z.number().int().nonnegative(),
    currency: z.literal("KRW"),
    generationStatus: z
      .enum(["queued", "processing", "ready", "failed"])
      .nullable(),
    readingId: z.uuid().nullable(),
  }),
});
export type SavedRequest = z.infer<typeof savedRequestSchema>["data"];
export type ReadingListItem = z.infer<typeof readingListSchema>["data"][number];
export type OrderState = z.infer<typeof orderSchema>["data"];
