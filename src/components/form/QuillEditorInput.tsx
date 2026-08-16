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
  data: string;
  setData: (v: string) => void;
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
  ({ disabled, data, setData, rows = 6, showToolbar = true }, ref) => {
    const quillRef = useRef<ReactQuill | null>(null);

    const editorWrapRef = useRef<HTMLDivElement | null>(null);

    const savedRangeRef = useRef<{
      index: number;
      length: number;
    } | null>(null);

    const savedPhotoIdsRef = useRef<Set<number>>(new Set());

    const tempPhotoFilesRef = useRef<Map<string, string>>(new Map());

    const [isEmpty, setIsEmpty] = useState(true);

    const [imageCaret, setImageCaret] = useState({
      visible: false,
      left: 0,
      top: 0,
      height: 0,
    });

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
    }, []);

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

    useEffect(() => {
      const editor = quillRef.current?.getEditor();
      const root = editor?.root;
      const wrap = editorWrapRef.current;

      if (!editor || !root || !wrap) return;

      // 이 effect 안에서 다시 조회해야 스코프 문제 없이 사용할 수 있다.
      // showToolbar가 false일 때는 null이며 ResizeObserver 대상에서 제외된다.
      const toolbarContainer = wrap.querySelector<HTMLElement>(".ql-toolbar");

      let rafId = 0;

      const hideImageCaret = () => {
        root.classList.remove("image-caret-active");
        setImageCaret((current) =>
          current.visible ? { ...current, visible: false } : current,
        );
      };

      const getImageIndex = (image: HTMLImageElement): number | null => {
        try {
          // getLeaf(index)로 경계를 추측하지 않고,
          // 실제 img DOM -> Quill blot -> 문서 index 순서로 찾는다.
          const Quill = (ReactQuill as any).Quill;
          const blot = Quill?.find?.(image);

          if (!blot) return null;

          const index = editor.getIndex(blot);
          return Number.isFinite(index) ? index : null;
        } catch {
          return null;
        }
      };

      const findAdjacentImage = (caretIndex: number) => {
        const images = Array.from(
          root.querySelectorAll<HTMLImageElement>("img"),
        );

        for (const image of images) {
          const imageIndex = getImageIndex(image);

          if (imageIndex === null) continue;

          if (caretIndex === imageIndex) {
            return { image, side: "left" as const };
          }

          if (caretIndex === imageIndex + 1) {
            return { image, side: "right" as const };
          }
        }

        return null;
      };

      const updateImageCaretNow = (range = editor.getSelection()) => {
        if (!range || range.length !== 0 || disabled) {
          hideImageCaret();
          return;
        }

        const target = findAdjacentImage(range.index);

        if (!target) {
          hideImageCaret();
          return;
        }

        const imageRect = target.image.getBoundingClientRect();
        const wrapRect = wrap.getBoundingClientRect();

        // 아직 이미지가 로딩되지 않아 높이가 0이면 잠시 숨긴다.
        if (imageRect.height <= 0) {
          hideImageCaret();
          return;
        }

        root.classList.add("image-caret-active");

        setImageCaret({
          visible: true,
          left:
            (target.side === "right" ? imageRect.right : imageRect.left) -
            wrapRect.left,
          top: imageRect.top - wrapRect.top,
          height: imageRect.height,
        });
      };

      const scheduleImageCaretUpdate = (
        range?: { index: number; length: number } | null,
      ) => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          updateImageCaretNow(
            range === undefined ? editor.getSelection() : range,
          );
        });
      };

      const handleSelectionChange = (
        range: { index: number; length: number } | null,
      ) => {
        scheduleImageCaretUpdate(range);
      };

      const handleTextChange = () => {
        scheduleImageCaretUpdate();
      };

      const handleLayoutChange = () => {
        scheduleImageCaretUpdate();
      };

      let beforeContextMenuRange: {
        index: number;
        length: number;
      } | null = null;

      const handleImageMouseDown = (event: MouseEvent) => {
        const target = event.target;

        if (!(target instanceof HTMLImageElement)) return;
        if (!root.contains(target)) return;

        if (event.button === 2) {
          const range = editor.getSelection();

          // 실제 선택 영역이 있을 때만 저장
          beforeContextMenuRange =
            range && range.length > 0
              ? {
                  index: range.index,
                  length: range.length,
                }
              : null;

          // 이미지 우클릭으로 브라우저가 selection을 새로 만드는 것을 방지
          event.preventDefault();

          return;
        }

        // 좌클릭만 이미지 caret 처리
        if (event.button !== 0) return;

        const imageIndex = getImageIndex(target);
        if (imageIndex === null) return;

        const rect = target.getBoundingClientRect();

        const side =
          event.clientX < rect.left + rect.width / 2 ? "left" : "right";

        const nextIndex = side === "left" ? imageIndex : imageIndex + 1;

        event.preventDefault();

        editor.focus();
        editor.setSelection(nextIndex, 0, "user");

        scheduleImageCaretUpdate({
          index: nextIndex,
          length: 0,
        });
      };

      const handleImageContextMenu = (event: MouseEvent) => {
        const target = event.target;

        if (!(target instanceof HTMLImageElement)) return;
        if (!root.contains(target)) return;

        // contextmenu에는 preventDefault 하지 않음
        // → 우클릭 메뉴는 정상적으로 표시

        if (beforeContextMenuRange) {
          const savedRange = beforeContextMenuRange;

          requestAnimationFrame(() => {
            editor.setSelection(savedRange.index, savedRange.length, "silent");

            beforeContextMenuRange = null;
          });
        }
      };

      editor.on("selection-change", handleSelectionChange);
      editor.on("text-change", handleTextChange);
      root.addEventListener("scroll", handleLayoutChange);
      root.addEventListener("load", handleLayoutChange, true);
      root.addEventListener("mousedown", handleImageMouseDown);
      root.addEventListener("contextmenu", handleImageContextMenu);
      window.addEventListener("resize", handleLayoutChange);
      window.addEventListener("scroll", handleLayoutChange, true);

      // 툴바 표시/숨김, 툴바 줄바꿈, 에디터 크기 변화가 생기면
      // 이미지와 custom caret의 상대 위치를 즉시 다시 계산한다.
      const resizeObserver = new ResizeObserver(() => {
        scheduleImageCaretUpdate();
      });

      resizeObserver.observe(wrap);
      resizeObserver.observe(root);

      if (toolbarContainer) {
        resizeObserver.observe(toolbarContainer);
      }

      // showToolbar가 바뀐 직후 브라우저 레이아웃 반영 이후 한 번 더 계산한다.
      scheduleImageCaretUpdate();
      requestAnimationFrame(() => scheduleImageCaretUpdate());

      return () => {
        cancelAnimationFrame(rafId);
        editor.off("selection-change", handleSelectionChange);
        editor.off("text-change", handleTextChange);
        root.removeEventListener("scroll", handleLayoutChange);
        root.removeEventListener("load", handleLayoutChange, true);
        root.removeEventListener("mousedown", handleImageMouseDown);
        root.removeEventListener("contextmenu", handleImageContextMenu);
        window.removeEventListener("resize", handleLayoutChange);
        window.removeEventListener("scroll", handleLayoutChange, true);
        resizeObserver.disconnect();
        root.classList.remove("image-caret-active");
      };
    }, [disabled, showToolbar]);

    const modules = useMemo(
      () => ({
        toolbar: disabled
          ? false
          : {
              container: [
                [{ size: ["small", false, "large", "huge"] }],
                ["bold", "italic", "underline", "strike"],
                [{ color: [] }, { background: [] }],
                [{ list: "ordered" }, { list: "bullet" }],
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

                    editor.setSelection(index + 1, 0, "user");
                  } catch (error) {
                    console.error("사진 선택 실패:", error);
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

        <div
          ref={editorWrapRef}
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
          {imageCaret.visible && (
            <div
              className="quill-image-caret"
              style={{
                left: `${imageCaret.left}px`,
                top: `${imageCaret.top}px`,
                height: `${imageCaret.height}px`,
              }}
            />
          )}

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

.quill-editor-bootstrap .quill-image-caret {
  position: absolute;
  width: 1px;
  background: currentColor;
  pointer-events: none;
  z-index: 10;
  animation: quill-image-caret-blink 1s steps(1) infinite;
}

.quill-editor-bootstrap .ql-editor.image-caret-active {
  caret-color: transparent;
}

@keyframes quill-image-caret-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
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
