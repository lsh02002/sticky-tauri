import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { noteApi } from "../../api/noteApi";

export default function NewFolderPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  function goBack() {
    sessionStorage.setItem("fromTrash", "true");
    navigate(-1);
  }

  const handleCreate = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      // showToast("폴더 이름을 입력해주세요.");
      return;
    }

    try {
      setLoading(true);

      await noteApi.createFolder(trimmedName);
      goBack();
    } catch (error) {
      console.error(error);
      // showToast("폴더 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-dark text-white d-flex flex-column">
      <header className="d-flex align-items-center justify-content-between border-bottom border-secondary px-4 py-3">
        <h1 className="h4 fw-bold mb-0">새 폴더</h1>
      </header>

      <main className="flex-grow-1 p-4">
        <div className="card bg-black text-white border-secondary">
          <div className="card-body">
            <label className="form-label">폴더 이름</label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-control bg-dark text-white border-secondary mb-3"
              placeholder="폴더 이름을 입력하세요"
              autoFocus
            />

            <div className="d-flex justify-content-end gap-2">
              <button
                onClick={() => navigate(-1)}
                className="btn btn-outline-secondary"
                disabled={loading}
              >
                취소
              </button>

              <button
                onClick={handleCreate}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "생성 중..." : "생성"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
