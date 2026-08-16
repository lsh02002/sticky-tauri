import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export type PendingRichTextPhoto = {
  tempId: string;
  filePath: string;
};

export type RichTextPhotoSavePayload = {
  content: string;
  addedPhotos: PendingRichTextPhoto[];
  deletedPhotoIds: number[];
};

export type QuillEditorInputRef = {
  getSavePayload: () => RichTextPhotoSavePayload;
  markSaved: (content: string) => void;
};

type QuillEditorInputProps = {
  disabled?: boolean;
  name: string;
  title: string;
  data: string;
  setData: (v: string) => void;

  noteId: number;

  rows?: number;
  showToolbar?: boolean;
};

const getPhotoIdFromSrc = (src: string | null): number | null => {
  if (!src) return null;

  const match = src.match(/#photoId=(\d+)/);

  if (!match) return null;

  const photoId = Number(match[1]);

  if (!Number.isFinite(photoId) || photoId <= 0) {
    return null;
  }

  return photoId;
};

const getTempPhotoIdFromSrc = (src: string | null): string | null => {
  if (!src) return null;

  const match = src.match(/#tempPhotoId=([^#]+)/);

  if (!match) return null;

  return decodeURIComponent(match[1]);
};

const getPhotoIdsFromHtml = (html: string): Set<number> => {
  const result = new Set<number>();

  if (!html) return result;

  const parser = new DOMParser();

  const document = parser.parseFromString(html, "text/html");

  document.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    const photoId = getPhotoIdFromSrc(image.getAttribute("src"));

    if (photoId) {
      result.add(photoId);
    }
  });

  return result;
};

const QuillEditorInput = forwardRef<QuillEditorInputRef, QuillEditorInputProps>(
  (
    {
      disabled,
      name,
      title,
      data,
      setData,
      noteId,
      rows = 6,
      showToolbar = true,
    },
    ref,
  ) => {
    const quillRef = useRef<ReactQuill | null>(null);

    const savedRangeRef = useRef<{
      index: number;
      length: number;
    } | null>(null);

    const savedPhotoIdsRef = useRef<Set<number>>(new Set());

    const tempPhotoFilesRef = useRef<Map<string, string>>(new Map());

    const [isEmpty, setIsEmpty] = useState(true);

    const getCurrentPhotos = () => {
      const editor = quillRef.current?.getEditor();

      const photoIds = new Set<number>();

      const tempIds = new Set<string>();

      if (!editor) {
        return {
          photoIds,
          tempIds,
        };
      }

      editor.root.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
        const src = image.getAttribute("src");

        const photoId = getPhotoIdFromSrc(src);

        const tempId = getTempPhotoIdFromSrc(src);

        if (photoId) {
          photoIds.add(photoId);
        }

        if (tempId) {
          tempIds.add(tempId);
        }
      });

      return {
        photoIds,
        tempIds,
      };
    };

    useImperativeHandle(
      ref,
      () => ({
        getSavePayload: () => {
          const editor = quillRef.current?.getEditor();

          const content = editor?.root.innerHTML ?? data;

          const { photoIds: currentPhotoIds, tempIds: currentTempIds } =
            getCurrentPhotos();

          const addedPhotos: PendingRichTextPhoto[] = [];

          for (const tempId of currentTempIds) {
            const filePath = tempPhotoFilesRef.current.get(tempId);

            if (!filePath) continue;

            addedPhotos.push({
              tempId,
              filePath,
            });
          }

          const deletedPhotoIds: number[] = [];

          for (const photoId of savedPhotoIdsRef.current) {
            if (!currentPhotoIds.has(photoId)) {
              deletedPhotoIds.push(photoId);
            }
          }

          return {
            content,
            addedPhotos,
            deletedPhotoIds,
          };
        },

        markSaved: (content: string) => {
          setData(content);

          savedPhotoIdsRef.current = getPhotoIdsFromHtml(content);

          tempPhotoFilesRef.current.clear();
        },
      }),
      [data, setData],
    );

    useEffect(() => {
      savedPhotoIdsRef.current = getPhotoIdsFromHtml(data);

      tempPhotoFilesRef.current.clear();
    }, [noteId]);

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
          target.closest(".ql-size") ||
          target.closest(".ql-image") ||
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
                [
                  {
                    size: ["small", false, "large", "huge"],
                  },
                ],

                ["bold", "italic", "underline", "strike"],

                [
                  {
                    color: [],
                  },
                  {
                    background: [],
                  },
                ],

                [
                  {
                    list: "ordered",
                  },
                  {
                    list: "bullet",
                  },
                ],

                ["blockquote", "link", "image"],

                ["clean"],
              ],

              handlers: {
                color: (value: string | false) => {
                  const editor = quillRef.current?.getEditor();

                  const range = savedRangeRef.current;

                  if (!editor) return;

                  if (range) {
                    editor.setSelection(range.index, range.length, "silent");

                    editor.format("color", value || false, "user");

                    editor.setSelection(range.index, range.length, "silent");
                  } else {
                    editor.format("color", value || false, "user");
                  }
                },

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

                image: async () => {
                  const editor = quillRef.current?.getEditor();

                  if (!editor) return;

                  try {
                    const filePath = await open({
                      multiple: false,

                      directory: false,

                      filters: [
                        {
                          name: "Image",

                          extensions: [
                            "png",
                            "jpg",
                            "jpeg",
                            "gif",
                            "webp",
                            "bmp",
                          ],
                        },
                      ],
                    });

                    if (!filePath || typeof filePath !== "string") {
                      return;
                    }

                    const tempId = crypto.randomUUID();

                    tempPhotoFilesRef.current.set(tempId, filePath);

                    const range =
                      savedRangeRef.current ?? editor.getSelection(true);

                    const index = range?.index ?? editor.getLength() - 1;

                    const imageUrl = convertFileSrc(filePath);

                    const tempImageUrl = `${imageUrl}#tempPhotoId=${encodeURIComponent(
                      tempId,
                    )}`;

                    editor.insertEmbed(index, "image", tempImageUrl, "user");

                    editor.setSelection(index + 1, 0, "silent");
                  } catch (error) {
                    console.error("사진 선택 실패:", error);
                  }
                },
              },
            },
      }),
      [disabled, noteId],
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

              ["--quill-min-height-mobile" as any]: `${
                Math.max(rows, 1) * 24 + 32
              }px`,

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
            placeholder={isEmpty ? `내용을(를) 입력하세요` : ""}
            modules={modules}
          />
        </div>
      </div>
    );
  },
);

QuillEditorInput.displayName = "QuillEditorInput";

export default QuillEditorInput;

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

.quill-editor-bootstrap .ql-editor img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 8px 0;
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
    min-height:
      var(--quill-min-height-mobile, 224px);
  }
}
`;
