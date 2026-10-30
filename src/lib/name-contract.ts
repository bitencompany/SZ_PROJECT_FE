import { z } from "zod";

const element = z.enum(["목", "화", "토", "금", "수"]);
export const hanjaSchema = z.object({
  id: z.string().min(1).max(80),
  reading: z.string().regex(/^[가-힣]$/),
  character: z.string().min(1).max(4),
  meaning: z.string().min(1).max(100),
  strokes: z.number().int().positive().max(100),
  element: element.nullable(),
  isBulyong: z.boolean().nullable(),
  dictionaryStrokes: z.number().int().positive().max(100).nullable(),
  strokeReview: z.enum(["unreviewed", "reference-checked"]),
  strokeSources: z
    .array(
      z.object({
        title: z.string().max(150),
        url: z.url().refine((value) => value.startsWith("https://")),
        basis: z.enum(["dictionary", "naming-original"]),
      }),
    )
    .max(10),
});
export const catalogSchema = z.object({
  status: z.enum(["preview", "verified"]),
  version: z.string().min(1).max(100),
});
export const hanjaResponseSchema = z.object({
  data: z.array(hanjaSchema).max(2000),
  catalog: catalogSchema,
});
export const legacyNameResponseSchema = z.object({
  data: z.object({
    name: z.string().regex(/^[가-힣]{3}$/),
    hanja: z.array(hanjaSchema).length(3),
    grids: z
      .array(
        z.object({
          label: z.string().max(20),
          period: z.string().max(20),
          total: z.number().int().positive(),
          number: z.number().int().min(1).max(81),
          title: z.string().max(100),
          fortune: z.string().max(20),
          description: z.string().max(4000),
        }),
      )
      .length(4),
    sounds: z
      .array(
        z.object({
          syllable: z.string().length(1),
          element: element.nullable(),
        }),
      )
      .length(3),
    relations: z.array(z.string().max(100)).length(2),
  }),
  catalog: catalogSchema,
});
export const nameResponseSchema = z
  .object({
    data: legacyNameResponseSchema.shape.data.extend({
      name: z.string().regex(/^[가-힣]{2,20}$/),
      hanja: z.array(hanjaSchema.nullable()).max(20),
      grids: z
        .array(legacyNameResponseSchema.shape.data.shape.grids.element)
        .max(4),
      sounds: z
        .array(legacyNameResponseSchema.shape.data.shape.sounds.element)
        .min(2)
        .max(20),
      relations: z.array(z.string().max(100)).min(1).max(19),
      analysisNotice: z.string().max(400).optional(),
    }),
    catalog: catalogSchema,
  })
  .superRefine(({ data }, ctx) => {
    if (
      data.sounds.length !== data.name.length ||
      data.relations.length !== data.name.length - 1 ||
      data.sounds.some((sound, index) => sound.syllable !== data.name[index]) ||
      (data.hanja.length !== 0 && data.hanja.length !== data.name.length) ||
      data.hanja.some(
        (item, index) => item !== null && item.reading !== data.name[index],
      ) ||
      (data.grids.length !== 0 &&
        (data.grids.length !== 4 ||
          data.hanja.length !== 3 ||
          data.hanja.some((item) => item === null) ||
          data.name.length !== 3))
    )
      ctx.addIssue({ code: "custom", message: "Name result shape mismatch" });
  });
export const previewCatalog = {
  status: "preview" as const,
  version: "preview-2026-10-30",
};
