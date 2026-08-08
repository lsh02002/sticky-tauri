import { useEffect, useState } from "react";
import { noteApi } from "../../api/noteApi";
import type { NoteSummary } from "../../types/note";

export function TextMemo({
  note,
  onChanged,
}: {
  note: NoteSummary;
  onChanged: () => void;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    noteApi.getText(note.id).then((value) => {      
      setContent(value.content);
      setLoading(false);
    });
  }, [note.id]);

  async function save() {
    await noteApi.updateText(note.id, content);
    onChanged();
  }

  if (loading) return <div className="text-muted">불러오는 중...</div>;

  return (
    <>
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
