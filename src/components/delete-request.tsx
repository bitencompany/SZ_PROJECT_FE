"use client";
import { useState } from "react";
import { ApiFailure, clientApi } from "@/lib/client-api";
export function DeleteRequest({
  id,
  onDeleted,
}: {
  id: string;
  onDeleted: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await clientApi(`/api/reading-requests/${id}`, { method: "DELETE" });
      onDeleted();
    } catch (cause) {
      if (cause instanceof ApiFailure && cause.status === 401) {
        window.location.assign("/login?next=%2Fmy%2Freadings");
        return;
      }
      if (cause instanceof ApiFailure && cause.status === 404) {
        onDeleted();
        return;
      }
      setError(cause instanceof Error ? cause.message : "삭제하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="request-delete">
      {confirm ? (
        <>
          <p>보관한 입력을 삭제할까요? 삭제 후에는 복구할 수 없어요.</p>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              void remove();
            }}
          >
            {busy ? "삭제 중…" : "입력 삭제"}
          </button>{" "}
          <button
            className="text-button"
            disabled={busy}
            onClick={() => setConfirm(false)}
          >
            취소
          </button>
        </>
      ) : (
        <button className="text-button" onClick={() => setConfirm(true)}>
          보관한 입력 삭제
        </button>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
    </div>
  );
}
