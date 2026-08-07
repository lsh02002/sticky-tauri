/// <reference types="vite/client" />

interface TauriNoteWindowData {
  noteId: number;
  windowLabel: string;
}

interface Window {
  __TAURI_NOTE_WINDOW__?: TauriNoteWindowData;
}
