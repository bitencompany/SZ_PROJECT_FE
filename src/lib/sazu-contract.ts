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
    birthMinute: time?.[1] ?? null,
    isFemale: input.gender === "female",
    isLunar: false,
    birthCity: input.birthCity,
  };
}
const pillar = z.object({ full: z.string().min(1).max(40) });
const responseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    modules: z.object({
      fourPillars: z.object({
        year: pillar,
        month: pillar,
        day: pillar,
        hour: pillar.nullable().optional(),
      }),
      elements: z.record(
        z.string(),
        z.object({
          name: z.string().min(1).max(30),
          total: z.object({ count: z.number().finite().nonnegative() }),
        }),
      ),
    }),
  }),
  meta: z.object({ sample: z.boolean().optional() }).optional(),
});
export function parseSazuResponse(value: unknown): SazuResult {
  const parsed = responseSchema.parse(value);
  const { fourPillars, elements } = parsed.data.modules;
  return {
    sample: parsed.meta?.sample === true,
    pillars: [
      { label: "년주", value: fourPillars.year.full },
      { label: "월주", value: fourPillars.month.full },
      { label: "일주", value: fourPillars.day.full },
      { label: "시주", value: fourPillars.hour?.full ?? null },
    ],
    elements: Object.values(elements).map((element) => ({
      name: element.name,
      count: element.total.count,
    })),
  };
}
