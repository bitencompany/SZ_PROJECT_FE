"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { readingDetailSchema } from "@/lib/member-contract";
import { clientApi, ApiFailure } from "@/lib/client-api";
export function ReadingDetail({ id }: { id: string }) {
  const [report, setReport] = useState<
    z.infer<typeof readingDetailSchema>["data"] | null
  >(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setReport(null);
    setError("");
    if (document.visibilityState === "visible")
      void clientApi(`/api/readings/${id}`, { signal: controller.signal })
        .then((value) => {
          if (!controller.signal.aborted)
            setReport(readingDetailSchema.parse(value).data);
        })
        .catch((cause) => {
          if (controller.signal.aborted) return;
          setReport(null);
          if (cause instanceof ApiFailure && cause.status === 401) {
            window.location.assign(
              `/login?next=${encodeURIComponent(`/my/readings/${id}`)}`,
            );
            return;
          }
          setError(
            cause instanceof ApiFailure
              ? cause.message
              : "상세 풀이를 불러오지 못했어요.",
          );
        });
    const visibility = () => {
      controller.abort();
      setReport(null);
      if (document.visibilityState === "visible")
        setRefresh((value) => value + 1);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [id, refresh]);
  if (error)
    return (
      <>
        <h1>상세 풀이를 확인할 수 없어요.</h1>
        <p role="alert">{error}</p>
        <button
          className="secondary-button"
          onClick={() => setRefresh((value) => value + 1)}
        >
          다시 확인
        </button>
      </>
    );
  if (!report) return <p role="status">상세 풀이를 확인하고 있어요…</p>;
  return (
    <>
      <span className="section-index">YOUR READING</span>
      <h1>{report.content.title}</h1>
      <p>{report.content.summary}</p>
      {report.content.sections.map((section, index) => (
        <section className="report-section" key={index}>
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
        </section>
      ))}
    </>
  );
}
