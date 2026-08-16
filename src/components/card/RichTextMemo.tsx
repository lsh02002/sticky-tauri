import { useEffect, useState } from "react";
import { noteApi } from "../../api/noteApi";
import QuillEditorInput from "../form/QuillEditorInput";

export function RichTextMemo({
  noteId,
  onChanged,
}: {
  noteId: number;
  onChanged: () => void;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  const [showToolbar, setShowToolbar] = useState(false);

  useEffect(() => {
    noteApi.getRichText(noteId).then((value) => {
      setContent(value.content);
      setLoading(false);
    });
  }, [noteId]);

  async function save() {
    await noteApi.updateRichText(noteId, content);
    onChanged();
  }

  if (loading) return <div className="text-muted">불러오는 중...</div>;

  return (
    <div className="p-3">
      <QuillEditorInput
        name="richmemo"
        title=""
        data={content}
        setData={setContent}
        showToolbar={showToolbar}
      />

      <div className="d-flex gap-2">
        <button
          type="button"
          className={`btn btn-sm ${
            showToolbar ? "btn-secondary" : "btn-outline-secondary"
          }`}
          onClick={() => setShowToolbar((prev) => !prev)}
          title={showToolbar ? "툴바 숨기기" : "툴바 보이기"}
        >
          <i className={`bi ${showToolbar ? "bi-eye-slash" : "bi-eye"} me-1`} />
          툴바 {showToolbar ? "숨기기" : "보이기"}
        </button>

        <button type="button" className="btn btn-dark btn-sm" onClick={save}>
          <i className="bi bi-save me-1" />
          저장
        </button>
      </div>
    </div>
  );
}
