import { useEffect, useState } from "react";
import { noteApi } from "../../api/noteApi";
import { emit } from "@tauri-apps/api/event";
import type { NoteSummary } from "../../types/note";

export function TextMemo({
  note,
  onChanged,
}: {
  note: NoteSummary;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    noteApi.getText(note.id).then((value) => {
      setTitle(value.note.title);
      setContent(value.content);
      setLoading(false);
    });
  }, [note.id]);

  async function save() {
    await noteApi.updateText(note.id, title, content);

    await emit("note-title-changed", {
      noteId: note.id,
      title,
    });
    onChanged();
  }

  if (loading) return <div className="text-muted">불러오는 중...</div>;

  return (
    <>
      <input
        className="form-control form-control-sm mb-2"
        value={title}
        onChange={async (e) => setTitle(e.target.value)}
      />
      <textarea
        className="form-control memo-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button className="btn btn-dark btn-sm mt-2" onClick={save}>
        <i className="bi bi-save me-1" />
        저장
      </button>
    </>
  );
}
