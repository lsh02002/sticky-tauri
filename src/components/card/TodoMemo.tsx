import { useEffect, useState } from "react";
import { noteApi } from "../../api/noteApi";
import type { TodoItem, NoteSummary } from "../../types/note";

export function TodoMemo({ note }: { note: NoteSummary }) {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [content, setContent] = useState("");

  async function reload() {
    setItems((await noteApi.getTodo(note.id)).items);
  }
  useEffect(() => {
    void reload();
  }, [note.id]);

  async function add() {
    if (!content.trim()) return;
    await noteApi.addTodo(note.id, content);
    setContent("");
    await reload();
  }

  return (
    <>
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
                await noteApi.deleteTodo(item.id);
                await reload();
              }}
            >
              <i className="bi bi-x" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
