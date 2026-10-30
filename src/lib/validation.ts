import { z } from "zod";

export const nameSchema = z.object({
  name: z
    .string()
    .regex(/^[가-힣]{3}$/, "성 1자와 이름 2자를 한글로 입력해 주세요."),
  hanjaIds: z
    .array(z.string().max(80))
    .length(3, "한자를 세 글자 모두 선택해 주세요."),
});
// 백엔드 v1 저장·이름 계산 계약은 위의 세 글자 스키마를 유지합니다.
export const nameInputSchema = z
  .object({
    name: z
      .string()
      .regex(/^[가-힣]{2,20}$/, "성을 포함해 한글 2~20글자를 입력해 주세요."),
    nameMode: z.enum(["hanja", "hangul", "mixed"]).default("hanja"),
    surnameLength: z.union([z.literal(1), z.literal(2)]).default(1),
    hanjaIds: z.array(z.string().min(1).max(80).nullable()).max(20),
  })
  .superRefine((value, ctx) => {
    if (value.surnameLength >= value.name.length)
      ctx.addIssue({
        code: "custom",
        path: ["surnameLength"],
        message: "성 뒤에 이름을 입력해 주세요.",
      });
    const ids = value.hanjaIds;
    const legacyHangul = value.nameMode === "hangul" && ids.length === 0;
    const correctMode =
      value.nameMode === "hanja"
        ? ids.every((id) => id !== null)
        : value.nameMode === "hangul"
          ? ids.every((id) => id === null)
          : ids.some((id) => id === null) && ids.some((id) => id !== null);
    if ((!legacyHangul && ids.length !== value.name.length) || !correctMode)
      ctx.addIssue({
        code: "custom",
        path: ["hanjaIds"],
        message: "이름의 각 글자에 맞는 한자를 선택해 주세요.",
      });
  });
export type NameInput = z.infer<typeof nameInputSchema>;
export function supportsStoredName(
  value: Pick<NameInput, "name" | "nameMode"> & { surnameLength: number },
): boolean {
  return (
    value.nameMode === "hanja" &&
    value.surnameLength === 1 &&
    /^[가-힣]{3}$/.test(value.name)
  );
}
export const birthSchema = z
  .object({
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    birthTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
    gender: z.enum(["female", "male"]),
    birthCity: z.enum([
      "서울",
      "부산",
      "대구",
      "인천",
      "광주",
      "대전",
      "울산",
      "제주",
    ]),
    consent: z.literal(true),
  })
  .superRefine((value, ctx): void => {
    const [year, month, day]: number[] = value.birthDate.split("-").map(Number);
    const date: Date = new Date(Date.UTC(year, month - 1, day));
    const today: string = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Seoul",
    }).format(new Date());
    if (
      year < 1900 ||
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day ||
      value.birthDate > today
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["birthDate"],
        message:
          "1900년 이후의 올바른 생년월일을 입력해 주세요. 미래 날짜는 사용할 수 없습니다.",
      });
    }
  });
export type BirthInput = z.infer<typeof birthSchema>;
