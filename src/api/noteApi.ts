import { invoke } from "@tauri-apps/api/core";
import type {
  ExpenseItem,
  ExpenseNote,
  NoteSummary,
  NoteType,
  TextNote,
  TodoItem,
  TodoNote,
  PhotoNote,
  FolderType,
} from "../types/note";

export const noteApi = {
  createFolder(name: string) {
    return invoke<FolderType>("create_folder", { input: { name } });
  },
  listFolders() {
    return invoke<FolderType[]>("list_folders");
  },
  setFolder(noteId: number, folderId: number) {
    return invoke<void>("set_folder", { noteId, folderId });
  },
  renameFolder(folderId: number, newName: string) {
    return invoke<void>("rename_folder", { folderId, newName });
  },
  createNote(noteType: NoteType, title: string, color?: string, folderId?: number) {
    return invoke<NoteSummary>("create_note", {
      input: { noteType, title, color, folderId },
    });
  },
  setDeletedNote(noteId: number, isDeleted: boolean) {
    return invoke<void>("set_deleted_note", { input: { noteId, isDeleted } });
  },
  searchNotes(query: string, folderId: number | null) {
    return invoke<NoteSummary[]>("search_notes", { query, folderId });
  },
  listNotes(folderId: number | null) {
    return invoke<NoteSummary[]>("list_notes", { folderId });
  },
  listOpenNotes() {
    return invoke<NoteSummary[]>("list_open_notes");
  },
  listDeletedNotes() {
    return invoke<NoteSummary[]>("list_deleted_notes");
  },
  restoreDeletedNote(noteId: number) {
    return invoke<void>("set_deleted_note", {
      input: { noteId, isDeleted: false },
    });
  },
  getText(noteId: number) {
    return invoke<TextNote>("get_text_note", { noteId });
  },
  updateText(noteId: number, content: string) {
    return invoke<void>("update_text_note", {
      input: { noteId, content },
    });
  },
  getRichText(noteId: number) {
    return invoke<TextNote>("get_rich_text_note", { noteId });
  },
  updateRichText(noteId: number, content: string) {
    return invoke<void>("update_rich_text_note", {
      input: { noteId, content },
    });
  },
  updateTitle(noteId: number, title: string) {
    return invoke<boolean>("update_note_title", { noteId, title });
  },
  getTodo(noteId: number) {
    return invoke<TodoNote>("get_todo_note", { noteId });
  },
  addTodo(noteId: number, content: string) {
    return invoke<TodoItem>("add_todo_item", { input: { noteId, content } });
  },
  toggleTodo(itemId: number, completed: boolean) {
    return invoke<void>("toggle_todo_item", { input: { itemId, completed } });
  },
  deleteTodo(itemId: number) {
    return invoke<void>("delete_todo_item", { itemId });
  },
  getExpense(noteId: number) {
    return invoke<ExpenseNote>("get_expense_note", { noteId });
  },
  addExpense(input: {
    noteId: number;
    description: string;
    amount: number;
    kind: string;
    category: string;
    expenseDate: string;
  }) {
    return invoke<ExpenseItem>("add_expense_item", { input });
  },
  deleteExpense(itemId: number) {
    return invoke<void>("delete_expense_item", { itemId });
  },
  updateColor(noteId: number, color: string) {
    return invoke<void>("update_note_color", { input: { noteId, color } });
  },
  delete(noteId: number) {
    return invoke<void>("delete_note", { noteId });
  },
  addPhoto(noteId: number, filePath: string) {
    return invoke<void>("add_photo", { input: { noteId, filePath } });
  },
  listPhotos(noteId: number) {
    return invoke<PhotoNote>("list_photos", { noteId });
  },
  deletePhoto(photoId: number) {
    return invoke<void>("delete_photo", { photoId });
  },
  openManagerWindow() {
    return invoke<void>("open_manager_window");
  },
  openNoteWindow(noteId: number) {
    return invoke<void>("open_note_window", { noteId });
  },
};
