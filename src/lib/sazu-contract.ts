import { z } from "zod";
import type { BirthInput } from "./validation";
import type { SazuResult } from "./types";

export function toSazuRequest(input: BirthInput) {
  const [birthYear, birthMonth, birthDay]: number[] = input.birthDate
    .split("-")
    .map(Number);
  const time: number[] | null = input.birthTime
    ? input.birthTime.split(":").map(Number)
    : null;
  return {
    birthYear,
    birthMonth,
    birthDay,
    birthHour: time?.[0] ?? null,
    birthMinute: time?.[1] ?? 0,
    isFemale: input.gender === "female",
    isLunar: false,
    isLeapMonth: false,
    trueSolarTime: false,
    birthCity: input.birthCity,
  };
}
const pillar = z.object({ full: z.string().min(1).max(40) });
const responseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    source: z.literal("SAZU"),
    sandbox: z.boolean(),
    modules: z.object({
      fourPillars: z.object({
        year: pillar,
        month: pillar,
        day: pillar,
        hour: pillar.nullable().optional(),
      }),
      elements: z
        .record(
          z.string(),
          z.object({
            name: z.string().min(1).max(30),
            total: z.object({ count: z.number().finite().nonnegative() }),
          }),
        )
        .optional(),
      sinStrength: z
        .object({
          strength: z.string().max(100),
          analysis: z.string().max(4000).optional(),
        })
        .optional(),
      decadeFortune: z
        .object({
          direction: z.string().max(100),
          list: z
            .array(
              z.object({
                startAge: z.number().finite().nonnegative(),
                full: z.string().max(100),
              }),
            )
            .max(30),
        })
        .optional(),
    }),
  }),
});
export function parseSazuResponse(value: unknown): SazuResult {
  const parsed = responseSchema.parse(value);
  const { fourPillars, elements, sinStrength, decadeFortune } =
    parsed.data.modules;
  return {
    sample: parsed.data.sandbox,
    pillars: [
      { label: "년주", value: fourPillars.year.full },
      { label: "월주", value: fourPillars.month.full },
      { label: "일주", value: fourPillars.day.full },
      { label: "시주", value: fourPillars.hour?.full ?? null },
    ],
    elements: Object.values(elements ?? {}).map((element) => ({
      name: element.name,
      count: element.total.count,
    })),
    ...(sinStrength ? { strength: sinStrength } : {}),
    ...(decadeFortune ? { decadeFortune } : {}),
  };
}

const previewResponseSchema = responseSchema.extend({
  data: responseSchema.shape.data.extend({
    previewId: z.uuid(),
    expiresAt: z.iso.datetime(),
    providerVersion: z.string().min(1).max(100),
  }),
});
export function parsePreviewResponse(value: unknown): SazuResult {
  const parsed = previewResponseSchema.parse(value);
  const { sample, pillars, elements } = parseSazuResponse(parsed);
  return {
    sample,
    pillars,
    elements,
    previewId: parsed.data.previewId,
    expiresAt: parsed.data.expiresAt,
    providerVersion: parsed.data.providerVersion,
  };
}
