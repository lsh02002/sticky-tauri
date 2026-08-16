export type NoteType = "text" | "richText" | "todo" | "expense" | "photo";

export interface NoteSummary {
  id: number;
  noteType: NoteType;
  title: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  folderId: number | null;
  open: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TextNote {
  note: NoteSummary;
  content: string;
}

export interface TodoItem {
  id: number;
  noteId: number;
  content: string;
  completed: boolean;
  position: number;
}

export interface TodoNote {
  note: NoteSummary;
  items: TodoItem[];
}

export interface ExpenseItem {
  id: number;
  noteId: number;
  description: string;
  amount: number;
  kind: "수입" | "지출";
  category: string;
  expenseDate: string;
  position: number;
}

export interface ExpenseNote {
  note: NoteSummary;
  items: ExpenseItem[];
  total: number;
}

export interface PhotoItem {
  id: number;
  noteId: number;
  filePath: string;
  position: number;
}

export interface PhotoNote {
  note: NoteSummary;
  items: PhotoItem[];
}

export interface FolderType {
  id: number;
  name: string;
  parent_id: number;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}