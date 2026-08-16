import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const QuillEditorInput = ({
  disabled,
  name,
  title,
  data,
  setData,
  rows = 6,
  showToolbar = true,
}: {
  disabled?: boolean;
  name: string;
  title: string;
  data: string;
  setData: (v: string) => void;
  rows?: number;
  showToolbar?: boolean;
}) => {
  const quillRef = useRef<ReactQuill | null>(null);

  // 툴바 클릭으로 selection이 null이 되기 전에
  // 마지막으로 선택했던 영역을 저장
  const savedRangeRef = useRef<{
    index: number;
    length: number;
  } | null>(null);

  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const editor = quillRef.current?.getEditor();
    const root = editor?.root;

    if (!editor || !root) return;

    const toolbar = editor.getModule("toolbar") as {
      container?: HTMLElement;
    };

    const toolbarContainer = toolbar?.container;

    const handleCompositionStart = () => {
      setIsEmpty(false);
    };

    const handleCompositionEnd = () => {
      const text = editor.getText().trim();
      setIsEmpty(text.length === 0);
    };

    const handleToolbarMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (
        target.closest(".ql-color") ||
        target.closest(".ql-background") ||
        target.closest(".ql-picker-options")
      ) {
        e.preventDefault();
      }
    };

    root.addEventListener("compositionstart", handleCompositionStart);
    root.addEventListener("compositionend", handleCompositionEnd);

    toolbarContainer?.addEventListener("mousedown", handleToolbarMouseDown);

    return () => {
      root.removeEventListener("compositionstart", handleCompositionStart);

      root.removeEventListener("compositionend", handleCompositionEnd);

      toolbarContainer?.removeEventListener(
        "mousedown",
        handleToolbarMouseDown,
      );
    };
  }, []);

  const modules = useMemo(
    () => ({
      toolbar: disabled
        ? false
        : {
            container: [
              ["bold", "italic", "underline", "strike"],
              [{ color: [] }, { background: [] }],
              [{ list: "ordered" }, { list: "bullet" }],
              ["blockquote", "link"],
              ["clean"],
            ],

            handlers: {
              /**
               * 글자색
               */
              color: (value: string | false) => {
                const editor = quillRef.current?.getEditor();
                const range = savedRangeRef.current;

                if (!editor) return;

                if (range) {
                  // picker 클릭 전에 선택했던 범위를 복구
                  editor.setSelection(range.index, range.length, "silent");

                  editor.format("color", value || false, "user");

                  // 포맷 적용 후에도 선택 영역 유지
                  editor.setSelection(range.index, range.length, "silent");
                } else {
                  editor.format("color", value || false, "user");
                }
              },

              /**
               * 배경색
               */
              background: (value: string | false) => {
                const editor = quillRef.current?.getEditor();
                const range = savedRangeRef.current;

                if (!editor) return;

                if (range) {
                  editor.setSelection(range.index, range.length, "silent");

                  editor.format("background", value || false, "user");

                  editor.setSelection(range.index, range.length, "silent");
                } else {
                  editor.format("background", value || false, "user");
                }
              },
            },
          },
    }),
    [disabled],
  );

  return (
    <div className="w-100 mb-3">
      <style>{quillStyles}</style>

      <label htmlFor={name} className="form-label fw-semibold">
        {title}
      </label>

      <div
        className={`w-100 quill-editor-bootstrap ${
          disabled ? "is-disabled" : ""
        } ${!showToolbar ? "toolbar-hidden" : ""}`}
        style={
          {
            ["--quill-min-height" as any]: `${Math.max(rows, 1) * 24 + 24}px`,
            ["--quill-min-height-mobile" as any]: `${Math.max(rows, 1) * 24 + 32}px`,
            position: "relative",
          } as React.CSSProperties
        }
      >
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={data}
          onChange={(value, _delta, _source, editor) => {
            setData(value);
            setIsEmpty(editor.getText().trim().length === 0);
          }}
          readOnly={disabled}
          placeholder={isEmpty ? `${title}을(를) 입력하세요` : ""}
          modules={modules}
        />
      </div>
    </div>
  );
};

export default QuillEditorInput;

/* ===================== CSS (Bootstrap 기반) ===================== */

const quillStyles = `
.quill-editor-bootstrap {
  width: 100%;
  min-width: 0;
}

.quill-editor-bootstrap .ql-toolbar {
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-bottom: none;
  border-radius: 0.375rem 0.375rem 0 0;
  background: rgba(255, 255, 255, 0.55);
  display: flex;
  flex-wrap: wrap;
  row-gap: 8px;
  column-gap: 4px;
  padding: 8px 10px;
  white-space: normal;
}

.quill-editor-bootstrap.is-disabled .ql-toolbar {
  background: var(--bs-tertiary-bg, #f8f9fa);
}

.quill-editor-bootstrap .ql-toolbar .ql-formats {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  margin-right: 8px;
  margin-bottom: 0;
}

.quill-editor-bootstrap .ql-container {
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 0 0 0.375rem 0.375rem;
  background: rgba(255, 255, 255, 0.55);
  color: var(--bs-body-color, #212529);
  line-height: 1.5;
  font-size: 0.95rem;
}

.quill-editor-bootstrap.is-disabled .ql-container {
  border-radius: 0.375rem;
  background: var(--bs-tertiary-bg, #f8f9fa);
}

.quill-editor-bootstrap .ql-editor {
  min-height: var(--quill-min-height, 216px);
  padding: 12px 14px;
  word-break: break-word;
  overflow-wrap: anywhere;  
}

.quill-editor-bootstrap .ql-editor.ql-blank::before {
  color: var(--bs-secondary-color, #6c757d);
  font-style: normal;
}

.quill-editor-bootstrap .ql-container:focus-within,
.quill-editor-bootstrap .ql-toolbar:focus-within {  
}

.quill-editor-bootstrap .ql-container:focus-within {  
  box-shadow: none;  
}

.quill-editor-bootstrap .ql-disabled .ql-editor {
  color: var(--bs-secondary-color, #6c757d);
  cursor: not-allowed;
}

.quill-editor-bootstrap.toolbar-hidden .ql-toolbar {
  display: none;
}

.quill-editor-bootstrap.toolbar-hidden .ql-container {
  border-radius: 0.375rem;
  border-top: 1px solid var(--bs-border-color, #dee2e6);
}

@media (max-width: 640px) {
  .quill-editor-bootstrap .ql-toolbar {
    padding: 6px 8px;
    row-gap: 6px;
  }

  .quill-editor-bootstrap .ql-toolbar button,
  .quill-editor-bootstrap .ql-toolbar .ql-picker {
    flex-shrink: 0;
  }

  .quill-editor-bootstrap .ql-editor {
    font-size: 16px;
    min-height: var(--quill-min-height-mobile, 224px);
  }
}
`;
