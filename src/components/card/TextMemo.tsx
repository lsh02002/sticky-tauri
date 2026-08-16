import { useEffect, useState } from "react";
import { noteApi } from "../../api/noteApi";

export function TextMemo({
  noteId,
  onChanged,
}: {
  noteId: number;
  onChanged: () => void;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    noteApi
      .getText(noteId)
      .then((value) => {
        setContent(value.content);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, [noteId]);

  async function save() {
    try {
      setError("");
      await noteApi.updateText(noteId, content);
      onChanged();
    } catch (e) {
      setError(String(e));
    }
  }

  if (loading) return <div className="text-muted">불러오는 중...</div>;

  return (
    <>
      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}
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
