import type { MouseEvent, ReactNode } from "react";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { NoteSummary } from "../../types/note";
import { noteApi } from "../../api/noteApi";
import { confirm } from "@tauri-apps/plugin-dialog";
import { emit } from "@tauri-apps/api/event";

const typeLabel = {
  text: "텍스트",
  todo: "투두",
  expense: "가계부",
  photo: "사진",
} as const;

const typeIcon = {
  text: "bi-file-text",
  todo: "bi-check2-square",
  expense: "bi-wallet2",
  photo: "bi-image",
} as const;

export function NoteListCard({
  note,
  query,
  onDeleted,
}: {
  note: NoteSummary;
  query: string;
  onDeleted: () => void;
}) {
  async function open() {
    if (!note.isDeleted) {
      await noteApi.openNoteWindow(note.id);
    }
  }

  async function remove(event: MouseEvent) {
    event.stopPropagation();
    if (
      !(await confirm("메모를 삭제할까요?", {
        title: "메모 삭제",
        kind: "warning",
      }))
    )
      return;
    await noteApi.setDeletedNote(note.id, true);

    await emit("note-deleted", { noteId: note.id });
    onDeleted();
  }

  function highlightText(text: string, query: string): ReactNode {
    const trimmed = query.trim();

    if (!trimmed) {
      return text;
    }

    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(`(${escaped})`, "gi");

    return text
      .split(regex)
      .map((part, index) =>
        regex.test(part) ? <mark key={index}>{part}</mark> : part,
      );
  }

  return (
    <article
      className="card note-list-card border-0 shadow-sm"
      style={{ backgroundColor: note.color }}
      role="button"
      tabIndex={0}
      onClick={() => void open()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") void open();
      }}
    >
      <div className="card-body d-flex flex-column">
        <div className="d-flex align-items-center gap-2 mb-3">
          <span className="note-type-icon">
            <i className={`bi ${typeIcon[note.noteType]}`} />
          </span>
          <span className="badge text-bg-dark">{typeLabel[note.noteType]}</span>
          <button
            className="btn btn-link text-danger p-0 ms-auto"
            onClick={(event) => void remove(event)}
            title="삭제"
          >
            <i className="bi bi-trash" />
          </button>
        </div>
        <h5 className="text-truncate mb-2">
          {highlightText(note.title, query)}
        </h5>
        <p className="small text-body-secondary mb-3">독립 창으로 열기</p>
        <button
          className="btn btn-dark btn-sm mt-auto"
          onClick={(event) => {
            event.stopPropagation();
            void open();
          }}
        >
          <i className="bi bi-box-arrow-up-right me-1" />
          메모 열기
        </button>
      </div>
    </article>
  );
}
