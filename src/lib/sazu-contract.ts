import { z } from "zod";
import {
  detailedPillarSchema,
  detailModulesShape,
  detailModulesSchema,
  providerDataSchema,
} from "./sazu-details";
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
const pillar = detailedPillarSchema;
const responseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    source: z.literal("SAZU"),
    sandbox: z.boolean(),
    providerData: providerDataSchema.optional(),
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
      ...detailModulesShape,
    }),
  }),
});
export function parseSazuResponse(value: unknown): SazuResult {
  const parsed = responseSchema.parse(value);
  const { fourPillars, elements, sinStrength, decadeFortune } =
    parsed.data.modules;
  const details = detailModulesSchema.parse(parsed.data.modules);
  return {
    ...(Object.keys(details).length ? { details } : {}),
    ...(parsed.data.providerData
      ? { providerData: parsed.data.providerData }
      : {}),
    sample: parsed.data.sandbox,
    pillars: [
      { ...fourPillars.year, label: "년주", value: fourPillars.year.full },
      { ...fourPillars.month, label: "월주", value: fourPillars.month.full },
      { ...fourPillars.day, label: "일주", value: fourPillars.day.full },
      {
        ...(fourPillars.hour ?? {}),
        label: "시주",
        value: fourPillars.hour?.full ?? null,
      },
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
  const result = parseSazuResponse(parsed);
  return {
    ...result,
    previewId: parsed.data.previewId,
    expiresAt: parsed.data.expiresAt,
    providerVersion: parsed.data.providerVersion,
  };
}
