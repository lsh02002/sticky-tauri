import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import { noteApi } from "../../api/noteApi";
import type { NoteSummary, PhotoItem, PhotoNote } from "../../types/note";

export function PhotoMemo({ note }: { note: NoteSummary }) {
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadPhotos();
  }, [note.id]);

  async function loadPhotos() {
    try {
      setLoading(true);
      setError("");

      const value: PhotoNote = await noteApi.listPhotos(note.id);
      setItems(value.items);
    } catch (error) {
      console.error(error);
      setError("사진을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function selectAndAddPhoto() {
    try {
      setAdding(true);
      setError("");

      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "이미지",
            extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp"],
          },
        ],
      });

      // 사용자가 취소한 경우
      if (!selected) return;

      // multiple: false이면 문자열 경로가 반환됨
      const filePath = selected;

      await noteApi.addPhoto(note.id, filePath);
      await loadPhotos();
    } catch (error) {
      console.error(error);
      setError("사진을 추가하지 못했습니다.");
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return <div className="text-muted">불러오는 중...</div>;
  }

  return (
    <div>
      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      <button
        type="button"
        className="btn btn-dark btn-sm mb-3"
        disabled={adding}
        onClick={() => void selectAndAddPhoto()}
      >
        <i className="bi bi-image me-1" />
        {adding ? "추가 중..." : "사진 선택"}
      </button>

      {items.length === 0 ? (
        <div className="text-muted text-center py-4">
          등록된 사진이 없습니다.
        </div>
      ) : (
        <div className="row g-2">
          {[...items]
            .sort((a, b) => a.position - b.position)
            .map((item) => (
              <div key={item.id}>
                <div className="card h-100">
                  <img
                    className="card-img-top"
                    src={convertFileSrc(item.filePath)}
                    alt={`사진 ${item.position + 1}`}
                    style={{
                      width: "100%",
                      height: 180,
                      objectFit: "cover",
                    }}
                  />

                  <div className="card-body p-2">
                    <div
                      className="small text-muted text-truncate"
                      title={item.filePath}
                    >
                      {item.filePath}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
