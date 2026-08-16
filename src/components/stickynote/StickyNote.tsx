import { useCallback, useEffect, useMemo, useState } from "react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { useParams } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit, listen } from "@tauri-apps/api/event";
import { noteApi } from "../../api/noteApi";
import { TextMemo } from "../../components/card/TextMemo";
import { TodoMemo } from "../../components/card/TodoMemo";
import { ExpenseMemo } from "../../components/card/ExpenseMemo";
import type { NoteSummary, SelectOption } from "../../types/note";
import { PhotoMemo } from "../card/PhotoMemo";
import { RichTextMemo } from "../card/RichTextMemo";

const colors = ["#fff59d", "#ffccbc", "#c8e6c9", "#bbdefb", "#e1bee7"];

export default function StickyNote() {
  const { noteId } = useParams<{ noteId: string }>();
  const [note, setNote] = useState<NoteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState("");
  const [changingColor, setChangingColor] = useState(false);
  const [folderId, setFolderId] = useState("");
  const [folderOptions, setFolderOptions] = useState<SelectOption[]>([]);

  const currentWindow = useMemo(() => getCurrentWindow(), []);

  const fetchFolders = async () => {
    try {
      const result = await noteApi.listFolders();
      setFolderOptions(
        result?.map((folder) => ({
          label: folder.name,
          value: String(folder.id),
        })),
      );
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    void fetchFolders();
  }, []);

  useEffect(() => {
    const unlisten = listen("folders-updated", () => {
      void fetchFolders();
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const notes = await noteApi.listNotes(folderId ? Number(folderId) : null);

      const found = notes.find((item) => item.id === Number(noteId));

      if (!found) {
        throw new Error(`메모를 찾을 수 없습니다. ID: ${noteId}`);
      }

      setNote(found);
      setTitle(found.title);
      setFolderId(found.folderId ? String(found.folderId) : "");

      await currentWindow.setTitle(found.title.trim() || "스티키 메모");
    } catch (reason) {
      console.error("메모 로딩 실패:", reason);
      setError(String(reason));
    } finally {
      setLoading(false);
    }
  }, [currentWindow, noteId]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    (async () => {
      unlisten = await listen<{ noteId: number }>(
        "note-title-changed",
        async (event) => {
          if (event.payload.noteId === Number(noteId)) {
            const notes = await noteApi.listNotes(
              folderId ? Number(folderId) : null,
            );
            const found = notes?.find((item) => item.id === Number(noteId));

            if (found) {
              setNote(found);
              await currentWindow.setTitle(found.title.trim() || "스티키 메모");
            }
          }
        },
      );
    })();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    (async () => {
      unlisten = await listen<{ noteId: number }>(
        "note-deleted",
        async (event) => {
          if (event.payload.noteId === Number(noteId)) {
            await currentWindow.close();
          }
        },
      );
    })();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [noteId]);

  async function closeWindow() {
    try {
      setError("");
      await currentWindow.close();
    } catch (reason) {
      console.error("창 닫기 실패:", reason);
      setError(`창 닫기 실패: ${String(reason)}`);
    }
  }

  async function remove() {
    if (deleting) {
      return;
    }

    const confirmed = await confirm("메모를 삭제하고 창을 닫을까요?", {
      title: "메모 삭제",
      kind: "warning",
    });

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      await noteApi.setDeletedNote(Number(noteId), true);

      await emit("note-deleted", { noteId: Number(noteId) });
      await currentWindow.close();
    } catch (reason) {
      console.error("메모 삭제 실패:", reason);
      setError(String(reason));
    } finally {
      setDeleting(false);
    }
  }

  async function changeColor(color: string) {
    if (changingColor) {
      return;
    }

    try {
      setChangingColor(true);
      setError("");

      await noteApi.updateColor(Number(noteId), color);

      setNote((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          color,
        };
      });

      await emit("note-color-changed", {
        noteId: Number(noteId),
        color,
        updatedAt: new Date().toLocaleString("sv-SE", {
          timeZone: "Asia/Seoul",
        }),
      });
    } catch (reason) {
      console.error("색상 변경 실패:", reason);
      setError(String(reason));
    } finally {
      setChangingColor(false);
    }
  }

  async function changeFolder(folderId: string) {
    try {
      setError("");

      await noteApi.setFolder(Number(noteId), Number(folderId));

      setNote((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          folderId: folderId ? Number(folderId) : null,
        };
      });

      await emit("note-folder-changed");
    } catch (reason) {
      console.error("폴더 변경 실패:", reason);
      setError(String(reason));
    }
  }

  async function updateTitle() {
    try {
      const changed = await noteApi.updateTitle(Number(note?.id), title);

      if (changed) {
        await emit("note-title-changed", {
          noteId: Number(noteId),
          title,
          updatedAt: new Date().toLocaleString("sv-SE", {
            timeZone: "Asia/Seoul",
          }),
        });
      }
    } catch (reason) {
      console.error("제목 업데이트 실패:", reason);
      setError(String(reason));
    }
  }

  if (loading) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center">
        <div className="text-center">
          <div
            className="spinner-border mb-3"
            role="status"
            aria-label="메모 불러오는 중"
          />

          <div>메모를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (error && !note) {
    return (
      <main className="container-fluid p-3">
        <div className="alert alert-danger">
          <strong>메모를 불러오지 못했습니다.</strong>
          <div className="mt-2">{error}</div>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void closeWindow()}
        >
          <i className="bi bi-x-lg me-2" />창 닫기
        </button>
      </main>
    );
  }

  if (!note) {
    return (
      <main className="container-fluid p-3">
        <div className="alert alert-warning">메모 데이터가 없습니다.</div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void closeWindow()}
        >
          창 닫기
        </button>
      </main>
    );
  }

  return (
    <>
      <header
        data-tauri-drag-region
        className="w-100 d-flex justify-content-between align-items-center gap-3 p-2 position-fixed"
        style={{
          cursor: "grab",
          backgroundColor: `color-mix(in srgb, ${note.color} 95%, black 5%)`,
          zIndex: 100,
        }}
      >
        <span
          className="badge text-bg-dark"
          style={{ cursor: "pointer" }}
          onClick={() => noteApi.openManagerWindow()}
        >
          관리창
        </span>

        <div className="w-100 d-flex align-items-center justify-content-center gap-2 mx-2">
          <div className="w-100 d-flex align-items-center gap-2">
            <input
              className="form-control form-control-sm"
              value={title}
              onChange={async (e) => setTitle(e.target.value)}
              onBlur={updateTitle}
            />
          </div>

          <div className="dropdown">
            <button
              type="button"
              className="btn btn-sm btn-light"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              title="메모 설정"
            >
              <i className="bi bi-three-dots-vertical" />
            </button>

            <div className="dropdown-menu dropdown-menu-end p-2">
              <select
                value={folderId}
                onChange={(e) => {
                  setFolderId(e.target.value);
                  void changeFolder(e.target.value);
                }}
                className="form-select"
              >
                <option value="">폴더를 선택하세요</option>

                {folderOptions.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="d-flex gap-1 my-2">
                {colors.map((color) => {
                  const selected = note.color === color;

                  return (
                    <button
                      type="button"
                      key={color}
                      className="color-button"
                      style={{
                        backgroundColor: color,
                      }}
                      aria-label={`메모 배경색 ${color}`}
                      disabled={changingColor}
                      onClick={() => void changeColor(color)}
                    >
                      {selected && <i className="bi bi-check-lg color-check" />}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="dropdown-item text-danger"
                disabled={deleting}
                onClick={() => void remove()}
              >
                {deleting ? (
                  <span className="spinner-border spinner-border-sm me-2" />
                ) : (
                  <i className="bi bi-trash me-2" />
                )}
                삭제
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-sm btn-dark"
          onClick={() => void closeWindow()}
          aria-label="창 닫기"
          title="창 닫기"
        >
          <i className="bi bi-x-lg" />
        </button>
      </header>

      <main
        className="note-window h-100"
        style={{
          backgroundColor: note.color,
        }}
      >
        {error && (
          <div
            className="alert alert-danger py-2"
            style={{ marginTop: "3rem" }}
            role="alert"
          >
            {error}
          </div>
        )}

        <section className="note-editor-panel">
          {note.noteType === "text" && (
            <TextMemo noteId={note.id} onChanged={() => void reload()} />
          )}

          {note.noteType === "richText" && (
            <RichTextMemo noteId={note.id} onChanged={() => void reload()} />
          )}

          {note.noteType === "todo" && <TodoMemo noteId={note.id} />}

          {note.noteType === "expense" && <ExpenseMemo noteId={note.id} />}

          {note.noteType === "photo" && <PhotoMemo noteId={note.id} />}

          {!["text", "richText", "todo", "expense", "photo"].includes(
            note.noteType,
          ) && (
            <div className="alert alert-danger">
              지원하지 않는 메모 타입입니다: {note.noteType}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
