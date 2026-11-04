import { z } from "zod";
import { selectionMode } from "./name-input";

export const DRAFT_KEY = "ireum-reading-draft-v1";
export const DRAFT_TTL = 30 * 60 * 1000;
export const draftSchema = z
  .object({
    version: z.literal(1),
    id: z.string().uuid(),
    savedAt: z.number().int().positive(),
    name: z.string().max(20),
    nameMode: z.enum(["hanja", "hangul", "mixed"]).default("hanja"),
    surnameLength: z.union([z.literal(1), z.literal(2)]).default(1),
    ids: z.array(z.string().max(80).nullable()).max(20),
    birthDate: z.string().max(10),
    birthTime: z.string().max(5),
    unknownTime: z.boolean(),
    gender: z.enum(["female", "male"]),
    birthCity: z.string().max(40),
    step: z.union([z.literal(1), z.literal(2)]),
    preview: z
      .object({
        id: z.uuid(),
        expiresAt: z.iso.datetime(),
        providerVersion: z.string().max(100),
      })
      .optional(),
  })
  .transform((value) => {
    // 이전 버전의 '이름 전체 한자 없음' 임시 입력도 글자별 선택으로 복원합니다.
    const ids =
      value.nameMode === "hangul" && value.ids.length === 0
        ? [...value.name].map(() => null)
        : value.ids;
    return { ...value, ids, nameMode: selectionMode(ids) };
  });
export type ReadingDraft = z.infer<typeof draftSchema>;

export function parseDraft(
  raw: string | null,
  now = Date.now(),
): ReadingDraft | null {
  try {
    if (!raw || raw.length > 4096) return null;
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    if (
      !parsed.success ||
      now - parsed.data.savedAt >= DRAFT_TTL ||
      parsed.data.savedAt > now
    )
      return null;
    if (parsed.data.preview && Date.parse(parsed.data.preview.expiresAt) <= now)
      delete parsed.data.preview;
    return parsed.data;
  } catch {
    return null;
  }
}

export function readDraft(): ReadingDraft | null {
  try {
    const draft = parseDraft(sessionStorage.getItem(DRAFT_KEY));
    if (!draft) sessionStorage.removeItem(DRAFT_KEY);
    return draft;
  } catch {
    return null;
  }
}

export function writeDraft(draft: ReadingDraft): boolean {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draftSchema.parse(draft)));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* 저장소 비활성 환경 */
  }
}

export function sameDraftInput(
  a: Pick<
    ReadingDraft,
    | "name"
    | "nameMode"
    | "ids"
    | "birthDate"
    | "birthTime"
    | "unknownTime"
    | "gender"
    | "birthCity"
  > & { surnameLength: number },
  b: Pick<
    ReadingDraft,
    | "name"
    | "nameMode"
    | "ids"
    | "birthDate"
    | "birthTime"
    | "unknownTime"
    | "gender"
    | "birthCity"
  > & { surnameLength: number },
): boolean {
  return (
    a.nameMode === b.nameMode &&
    a.surnameLength === b.surnameLength &&
    a.name === b.name &&
    JSON.stringify(a.ids) === JSON.stringify(b.ids) &&
    a.birthDate === b.birthDate &&
    a.birthTime === b.birthTime &&
    a.unknownTime === b.unknownTime &&
    a.gender === b.gender &&
    a.birthCity === b.birthCity
  );
}

export function createDraft(
  input: Omit<ReadingDraft, "version" | "id" | "savedAt" | "preview">,
  previous: ReadingDraft | null,
  preview?: ReadingDraft["preview"],
  now = Date.now(),
): ReadingDraft {
  const unchanged =
    previous !== null &&
    previous.savedAt <= now &&
    now - previous.savedAt < DRAFT_TTL &&
    sameDraftInput(previous, input);
  const candidate = preview ?? (unchanged ? previous.preview : undefined);
  return {
    ...input,
    version: 1,
    id: unchanged ? previous.id : crypto.randomUUID(),
    savedAt: now,
    ...(candidate && Date.parse(candidate.expiresAt) > now
      ? { preview: candidate }
      : {}),
  };
}
