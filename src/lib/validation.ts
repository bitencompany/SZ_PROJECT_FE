import { z } from "zod";

export const nameSchema = z.object({
  name: z
    .string()
    .regex(/^[가-힣]{3}$/, "성 1자와 이름 2자를 한글로 입력해 주세요."),
  hanjaIds: z
    .array(z.string().max(16))
    .length(3, "한자를 세 글자 모두 선택해 주세요."),
});
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
