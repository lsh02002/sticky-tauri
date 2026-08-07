import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useNavigate } from "react-router-dom";

import { noteApi } from "../../api/noteApi";
import { NoteListCard } from "../../components/card/NoteListCard";
import type { NoteSummary } from "../../types/note";
import { confirm } from "@tauri-apps/plugin-dialog";

export default function TrashManager() {
  const navigate = useNavigate();

  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);

  async function reload() {
    try {
      setError("");

      // 휴지통에 있는 메모 목록
      const values = await noteApi.listDeletedNotes();

      setNotes(values);
    } catch (reason) {
      console.error("휴지통 불러오기 실패:", reason);
      setError(String(reason));
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  // 메모가 휴지통으로 이동되었을 때 목록 갱신
  useEffect(() => {
    const unlisten = listen<{ noteId: number }>("note-deleted", async () => {
      await reload();
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  // 메모 복원
  async function restore(noteId: number) {
    if (processingId !== null) {
      return;
    }

    try {
      setProcessingId(noteId);
      setError("");

      await noteApi.restoreDeletedNote(noteId);

      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    } catch (reason) {
      console.error("메모 복원 실패:", reason);
      setError(String(reason));
    } finally {
      setProcessingId(null);
    }
  }

  // 영구 삭제
  async function permanentDelete(noteId: number) {
    if (processingId !== null) {
      return;
    }

    const confirmed = await confirm("메모를 삭제할까요?", {
      title: "메모 삭제",
      kind: "warning",
    });

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(noteId);
      setError("");

      await noteApi.delete(noteId);

      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    } catch (reason) {
      console.error("메모 영구 삭제 실패:", reason);
      setError(String(reason));
    } finally {
      setProcessingId(null);
    }
  }

  function goBack() {
    sessionStorage.setItem("fromTrash", "true");
    navigate(-1);
  }

  return (
    <div>
      <nav className="navbar navbar-dark bg-dark sticky-top">
        <div className="container-fluid">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-trash3 text-white fs-4" />

            <span className="navbar-brand mb-0">휴지통</span>
          </div>

          <button
            type="button"
            className="btn btn-outline-light btn-sm"
            onClick={goBack}
          >
            <i className="bi bi-arrow-left me-1" />
            메모로 돌아가기
          </button>
        </div>
      </nav>

      <main className="container-fluid py-4">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {notes.length === 0 ? (
          <div className="empty-state text-center text-muted">
            <i className="bi bi-trash3 display-1" />

            <h2 className="mt-3">휴지통이 비어 있습니다</h2>

            <p>삭제한 메모가 여기에 표시됩니다.</p>
          </div>
        ) : (
          <div className="memo-grid">
            {notes.map((note) => (
              <div key={note.id} className="position-relative">
                <NoteListCard
                  note={note}
                  query={""}
                  onDeleted={() => {
                    void permanentDelete(note.id);
                  }}
                />

                <div className="d-flex gap-2 mt-2">
                  <button
                    type="button"
                    className="btn btn-success btn-sm flex-grow-1"
                    disabled={processingId !== null}
                    onClick={() => void restore(note.id)}
                  >
                    {processingId === note.id ? (
                      <span className="spinner-border spinner-border-sm me-1" />
                    ) : (
                      <i className="bi bi-arrow-counterclockwise me-1" />
                    )}
                    복원
                  </button>

                  <button
                    type="button"
                    className="btn btn-danger btn-sm flex-grow-1"
                    disabled={processingId !== null}
                    onClick={() => void permanentDelete(note.id)}
                  >
                    <i className="bi bi-trash-fill me-1" />
                    영구 삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
