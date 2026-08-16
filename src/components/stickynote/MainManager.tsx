import { useCallback, useEffect, useRef, useState } from "react";
import { listen, emit } from "@tauri-apps/api/event";
import { noteApi } from "../../api/noteApi";
import { NoteListCard } from "../../components/card/NoteListCard";
import type { FolderType, NoteSummary, NoteType } from "../../types/note";
import { useNavigate } from "react-router-dom";
import { useZustandStore } from "../../zustand/ZustandStore";

export default function MainManager() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<NoteType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedFolderId, setSelectedFolderId } = useZustandStore();
  const [folders, setFolders] = useState<FolderType[]>([]);

  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  const selectedFolderIdRef = useRef(selectedFolderId);
  const searchQueryRef = useRef(searchQuery);

  const createButtons = [
    {
      type: "text",
      label: "텍스트",
      className: "btn-warning",
      icon: "bi-file-text",
    },
    {
      type: "todo",
      label: "투두",
      className: "btn-success",
      icon: "bi-check2-square",
    },
    {
      type: "expense",
      label: "가계부",
      className: "btn-info",
      icon: "bi-wallet2",
    },
    {
      type: "photo",
      label: "사진",
      className: "btn-secondary",
      icon: "bi-image",
    },
  ] as const;

  useEffect(() => {
    selectedFolderIdRef.current = selectedFolderId;
  }, [selectedFolderId]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  const fetchFolders = async () => {
    try {
      const result = await noteApi.listFolders();
      setFolders(result);

      setError("");
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    void fetchFolders();
  }, []);

  const reload = useCallback(
    async (query = searchQuery, folderId = selectedFolderId) => {
      try {
        let values: NoteSummary[];

        if (query) {
          values = await noteApi.searchNotes(query, folderId);
        } else {
          values = await noteApi.listNotes(
            folderId != null ? Number(folderId) : null,
          );
        }

        setNotes(values);
        setError("");
      } catch (reason) {
        setError(String(reason));
      }
    },
    [searchQuery, selectedFolderId],
  );

  useEffect(() => {
    void reload(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const unlisten = listen<{
      noteId: number;
      color: string;
      updatedAt: string;
    }>("note-color-changed", async (event) => {
      try {
        setNotes((prev) =>
          prev.map((note) =>
            note.id === event.payload.noteId
              ? {
                  ...note,
                  color: event.payload.color,
                  updatedAt: event.payload.updatedAt,
                }
              : note,
          ),
        );
      } catch (error) {
        console.error(error);
        setError(String(error));
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const unlisten = listen<{
      noteId: number;
      title: string;
      updatedAt: string;
    }>("note-title-changed", (event) => {
      try {
        setNotes((prev) => {
          const next = prev.map((note) =>
            note.id === event.payload.noteId
              ? {
                  ...note,
                  title: event.payload.title,
                  updatedAt: event.payload.updatedAt,
                }
              : note,
          );
          return next;
        });
      } catch (error) {
        console.error(error);
        setError(String(error));
      }
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const unlisten = listen<{ noteId: number }>(
      "note-deleted",
      async (event) => {
        try {
          setNotes((prev) =>
            prev.filter((note) => note.id !== event.payload.noteId),
          );
        } catch (error) {
          console.error(error);
          setError(String(error));
        }
      },
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  //이 useEffect가 처음 생성될 때 한번만 렌더링 되서 useRef를 사용하여
  //selectedFolderId와 searchQuery를 참조하도록 변경
  useEffect(() => {
    const unlisten = listen("note-folder-changed", async () => {
      try {
        await reload(searchQueryRef.current, selectedFolderIdRef.current);
      } catch (error) {
        console.error(error);
        setError(String(error));
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  async function create(noteType: NoteType) {
    if (creating !== null) {
      return;
    }

    try {
      setCreating(noteType);
      setError("");

      const title =
        noteType === "text"
          ? "새 텍스트 메모"
          : noteType === "todo"
            ? "새 투두리스트"
            : noteType === "expense"
              ? "새 가계부"
              : "새 사진 메모";

      const note = await noteApi.createNote(
        noteType,
        title,
        "#fff59d",
        selectedFolderId ?? undefined,
      );

      await reload();
      await noteApi.openNoteWindow(note.id);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setCreating(null);
    }
  }

  async function openNote(noteId: number) {
    try {
      setError("");
      await noteApi.openNoteWindow(noteId);
    } catch (reason) {
      setError(String(reason));
    }
  }

  async function goToTrash() {
    try {
      setError("");
      navigate("/trash");
    } catch (reason) {
      setError(String(reason));
    }
  }

  return (
    <div className="min-vh-100 bg-dark text-white d-flex">
      <aside
        className="border-end border-secondary p-3 bg-dark position-fixed"
        style={{
          width: 240,
          height: "100%",
          zIndex: 100,
          minWidth: 240,
          maxWidth: 240,
        }}
      >
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="mt-5 h6 fw-bold mb-0">폴더</h2>

          <button
            onClick={() => navigate("/folder/create")}
            className="btn btn-outline-primary btn-sm"
          >
            +
          </button>
        </div>

        <div className="d-grid gap-2">
          <button
            onClick={() => {
              setSelectedFolderId(null);
              void reload(searchQuery, null);
            }}
            className={`btn text-start ${
              selectedFolderId === null
                ? "btn-primary"
                : "btn-outline-secondary"
            }`}
          >
            전체 메모
          </button>

          {folders.map((folder) => (
            <div
              key={folder.id}
              className="d-flex align-items-center gap-2 mb-1"
            >
              {editingFolderId === folder.id ? (
                <>
                  <input
                    className="form-control form-control-sm"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        await noteApi.renameFolder(
                          folder.id,
                          editingFolderName,
                        );

                        await emit("folders-updated");

                        setEditingFolderId(null);
                        void fetchFolders();
                      }
                    }}
                  />

                  <button
                    className="btn btn-success btn-sm"
                    onClick={async () => {
                      await noteApi.renameFolder(folder.id, editingFolderName);

                      await emit("folders-updated");

                      setEditingFolderId(null);
                      void fetchFolders();
                    }}
                  >
                    ✔
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditingFolderId(null)}
                  >
                    ✖
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={`btn flex-grow-1 text-start ${
                      selectedFolderId === folder.id
                        ? "btn-primary"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => {
                      setSelectedFolderId(folder.id);
                      void reload(searchQuery, folder.id);
                    }}
                  >
                    {folder.name}
                  </button>

                  <button
                    className="btn btn-outline-secondary btn-sm"
                    title="폴더 이름 변경"
                    onClick={() => {
                      setEditingFolderId(folder.id);
                      setEditingFolderName(folder.name);
                    }}
                  >
                    ⚙️
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="d-grid my-2">
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => void goToTrash()}
          >
            휴지통으로 이동
          </button>
        </div>
      </aside>
      <div
        className="min-vh-100 app-shell flex-grow-1"
        style={{ marginLeft: 240 }}
      >
        <nav
          className="navbar navbar-dark bg-dark shadow-sm position-fixed"
          style={{ width: "calc(100% - 240px)", zIndex: 100 }}
        >
          <div className="container-fluid">
            <span className="navbar-brand fw-bold">
              <i className="bi bi-stickies me-2" />
              Sticky Tauri
            </span>
            <div className="d-flex gap-2">
              {createButtons.map(({ type, label, className, icon }) => (
                <button
                  key={type}
                  type="button"
                  className={`btn ${className} btn-sm`}
                  disabled={creating !== null}
                  onClick={() => void create(type)}
                >
                  {creating === type ? (
                    <span className="spinner-border spinner-border-sm me-1" />
                  ) : (
                    <i className={`bi ${icon} me-1`} />
                  )}
                  {label}
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            className="m-3 bg-dark form-control"
            style={
              {
                color: "#adb5bd",
                "--bs-secondary-color": "#adb5bd",
              } as React.CSSProperties
            }
            placeholder="검색할 내용을 입력해주세요."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </nav>

        <main className="container-fluid py-4" style={{ marginTop: 115 }}>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {notes.length === 0 ? (
            <div className="empty-state text-center text-muted">
              <i className="bi bi-stickies display-1" />
              <h2 className="mt-3">메모가 없습니다</h2>
              <p>상단 버튼으로 메모를 만들면 독립 창으로 열립니다.</p>
            </div>
          ) : (
            <div className="memo-grid">
              {notes.map((note) => (
                <div
                  key={note.id}
                  role="button"
                  tabIndex={0}
                  onDoubleClick={() => void openNote(note.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void openNote(note.id);
                    }
                  }}
                >
                  <NoteListCard
                    note={note}
                    query={searchQuery}
                    onDeleted={() => void reload()}
                  />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
