import { useEffect, useRef, useState } from "react";
import { noteApi } from "../../api/noteApi";

import QuillEditorInput, {
  QuillEditorInputRef,
} from "../form/QuillEditorInput";

export function RichTextMemo({
  noteId,
  onChanged,
}: {
  noteId: number;
  onChanged: () => void;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showToolbar, setShowToolbar] = useState(false);

  const editorRef = useRef<QuillEditorInputRef | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    noteApi
      .getRichText(noteId)
      .then((value) => {
        if (cancelled) return;

        setContent(value.content ?? "");
      })
      .catch((error) => {
        if (cancelled) return;

        console.error("리치텍스트 불러오기 실패:", error);
      })
      .finally(() => {
        if (cancelled) return;

        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [noteId]);

  async function save() {
    if (saving) return;

    const payload = editorRef.current?.getSavePayload();

    if (!payload) {
      console.error("QuillEditorInput 저장 데이터를 가져올 수 없습니다.");
      return;
    }

    try {
      setSaving(true);

      const result = await noteApi.addRichTextWithPhotos(
        noteId,
        payload.content,
        payload.addedPhotos,
        payload.deletedPhotoIds,
      );

      const savedContent = result.content ?? payload.content;

      setContent(savedContent);

      editorRef.current?.markSaved(savedContent);

      onChanged();
    } catch (error) {
      console.error("리치텍스트 저장 실패:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-muted">불러오는 중...</div>;
  }

  return (
    <div className="p-3">
      <QuillEditorInput
        ref={editorRef}
        name="richmemo"
        title=""
        noteId={noteId}
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

        <button
          type="button"
          className="btn btn-dark btn-sm"
          onClick={save}
          disabled={saving}
        >
          {saving ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-1"
                aria-hidden="true"
              />
              저장 중...
            </>
          ) : (
            <>
              <i className="bi bi-save me-1" />
              저장
            </>
          )}
        </button>
      </div>
    </div>
  );
}
