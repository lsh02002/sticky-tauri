import { useEffect, useState } from "react";
import { noteApi } from "../../api/noteApi";
import type { TodoItem } from "../../types/note";
import { confirm } from "@tauri-apps/plugin-dialog";

export function TodoMemo({ noteId }: { noteId: number }) {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  async function reload() {    
    try {
      setError("");
      setItems((await noteApi.getTodo(noteId)).items);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    void reload();
  }, [noteId]);

  async function add() {
    if (!content.trim()) return;

    try {
      setError("");
      await noteApi.addTodo(noteId, content);
      setContent("");
      await reload();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="p-3">
      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      <div className="input-group input-group-sm mb-2">
        <div className="w-100 d-flex">
          <input
            className="form-control"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void add()}
            placeholder="할 일 입력"
          />
          <button className="btn btn-dark" onClick={add}>
            <i className="bi bi-plus-lg" />
          </button>
        </div>
      </div>
      <div className="list-group list-group-flush">
        {items.map((item) => (
          <div
            className="list-group-item bg-transparent px-0 d-flex align-items-center gap-2"
            key={item.id}
          >
            <input
              className="form-check-input mt-0"
              type="checkbox"
              checked={item.completed}
              onChange={async (e) => {
                await noteApi.toggleTodo(item.id, e.target.checked);
                await reload();
              }}
            />
            <span
              className={`flex-grow-1 ${item.completed ? "text-decoration-line-through text-muted" : ""}`}
            >
              {item.content}
            </span>
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={async () => {
                const confirmed =
                  await confirm("정말로 할 일을 삭제하시겠습니까?");
                if (!confirmed) return;

                await noteApi.deleteTodo(item.id);
                await reload();
              }}
            >
              <i className="bi bi-x" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
