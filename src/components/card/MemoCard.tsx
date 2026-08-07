import type { NoteSummary } from "../../types/note";
import { noteApi } from "../../api/noteApi";
import { TextMemo } from "./TextMemo";
import { TodoMemo } from "./TodoMemo";
import { ExpenseMemo } from "./ExpenseMemo";
import { confirm } from "@tauri-apps/plugin-dialog";

const colors = ["#fff59d", "#ffccbc", "#c8e6c9", "#bbdefb", "#e1bee7"];

export function MemoCard({
  note,
  onChanged,
}: {
  note: NoteSummary;
  onChanged: () => void;
}) {
  return (
    <article
      className="card sticky-card border-0 shadow-sm"
      style={{ backgroundColor: note.color }}
    >
      <div className="card-header bg-transparent border-0 d-flex align-items-center gap-2">
        <span className="badge text-bg-dark">{note.noteType}</span>
        <strong className="text-truncate flex-grow-1">{note.title}</strong>
        <div className="dropdown">
          <button
            className="btn btn-sm btn-link text-dark p-0"
            data-bs-toggle="dropdown"
          >
            <i className="bi bi-three-dots-vertical" />
          </button>
          <div className="dropdown-menu dropdown-menu-end p-2">
            <div className="d-flex gap-1 mb-2">
              {colors.map((color) => (
                <button
                  key={color}
                  className="color-button"
                  style={{ backgroundColor: color }}
                  onClick={async () => {
                    await noteApi.updateColor(note.id, color);
                    onChanged();
                  }}
                />
              ))}
            </div>
            <button
              className="dropdown-item text-danger"
              onClick={async () => {
                if (
                  await confirm("메모를 삭제할까요?", {
                    title: "메모 삭제",
                    kind: "warning",
                  })
                ) {
                  await noteApi.setDeletedNote(note.id, true);
                  onChanged();
                }
              }}
            >
              <i className="bi bi-trash me-2" />
              삭제
            </button>
          </div>
        </div>
      </div>
      <div className="card-body pt-1">
        {note.noteType === "text" && (
          <TextMemo note={note} onChanged={onChanged} />
        )}
        {note.noteType === "todo" && <TodoMemo noteId={note.id} />}
        {note.noteType === "expense" && <ExpenseMemo noteId={note.id} />}
      </div>
    </article>
  );
}
