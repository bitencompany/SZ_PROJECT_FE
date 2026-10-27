import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "이름결 | 나를 알아가는 작은 시작",
  description: "태어난 순간과 이름에 담긴 이야기를 차분하게 살펴보세요.",
};
export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
