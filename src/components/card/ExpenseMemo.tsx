import { useEffect, useState } from "react";
import { noteApi } from "../../api/noteApi";
import type { ExpenseNote, NoteSummary } from "../../types/note";
import { confirm } from "@tauri-apps/plugin-dialog";

export function ExpenseMemo({ note }: { note: NoteSummary }) {
  const [data, setData] = useState<ExpenseNote | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"수입" | "지출">("지출");
  const [category, setCategory] = useState("식비");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  async function reload() {
    setData(await noteApi.getExpense(note.id));
  }
  useEffect(() => {
    void reload();
  }, [note.id]);

  async function add() {
    const parsed = Number(amount);
    if (!description.trim() || !Number.isInteger(parsed) || parsed <= 0) return;
    await noteApi.addExpense({
      noteId: note.id,
      description,
      amount: parsed,
      kind,
      category,
      expenseDate: date,
    });
    setDescription("");
    setAmount("");
    await reload();
  }

  return (
    <>
      <div className="row g-1 mb-2">
        <div className="col-7">
          <input
            className="form-control form-control-sm"
            placeholder="내역"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="col-6">
          <select
            className="form-select form-select-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value as "수입" | "지출")}
          >
            <option value="수입">수입</option>
            <option value="지출">지출</option>
          </select>
        </div>
        <div className="col-5">
          <input
            className="form-control form-control-sm"
            placeholder="금액"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="col-6">
          <select
            className="form-select form-select-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {kind === "지출" ? (
              <>
                <option>식비</option>
                <option>교통</option>
                <option>생활</option>
                <option>쇼핑</option>
                <option>기타</option>
              </>
            ) : (
              <>
                <option>월급</option>
                <option>용돈</option>
                <option>기타</option>
              </>
            )}
          </select>
        </div>
        <div className="col-6">
          <input
            className="form-control form-control-sm"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <button className="btn btn-dark btn-sm w-100 mb-2" onClick={add}>
        항목 추가
      </button>
      <div className="small expense-list">
        {data?.items.map((item) => (
          <div className="d-flex flex-column my-1" key={item.id}>
            <div className="d-flex align-items-center p-0">
              <span className="flex-grow-1">
                {item.description}{" "}
                <span className="badge text-bg-light">{item.category}</span>
              </span>
              {item.kind === "수입" ? (
                <strong className="me-2 text-success">
                  {item.amount.toLocaleString()}원
                </strong>
              ) : (
                <strong className="me-2 text-danger">
                  {item.amount.toLocaleString()}원
                </strong>
              )}
              <button
                className="btn btn-link text-danger p-0"
                onClick={async () => {
                  const confirmed =
                    await confirm("정말로 항목을 삭제하시겠습니까?");
                  if (!confirmed) return;

                  await noteApi.deleteExpense(item.id);
                  await reload();
                }}
              >
                <i className="bi bi-trash" />
              </button>
            </div>
            <span className="text-muted small mb-1">{item.expenseDate}</span>
          </div>
        ))}
        <h6 className="text-end fw-bold pt-2">
          합계 {data?.total.toLocaleString() ?? 0}원
        </h6>
      </div>
    </>
  );
}
