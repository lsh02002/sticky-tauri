use tauri::State;

use crate::{
    domain::{
        AddExpenseInput, AddPhotoInput, AddTodoInput, CreateNoteInput, ExpenseItem, ExpenseNote,
        NoteSummary, PhotoItem, PhotoNote, TextNote, TodoItem, TodoNote, ToggleTodoInput,
        UpdateNoteColorInput, UpdateTextNoteInput, SetDeletedNoteInput, CreateFolderRequest,
        Folder,
    },
    service::NoteService,
    AppState,
};

#[tauri::command]
pub async fn create_folder(state: State<'_, AppState>, input: CreateFolderRequest) -> Result<Folder, String> {
    let db = state.connection()?;
    NoteService::create_folder(&db, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_folders(state: State<'_, AppState>, folder_id: Option<i64>) -> Result<Vec<Folder>, String> {
    let db = state.connection()?;
    NoteService::list_folders(&db, folder_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_folder(state: State<'_, AppState>, note_id: i64, folder_id: Option<i64>) -> Result<(), String> {
    let db = state.connection()?;
    NoteService::set_folder(&db, note_id, folder_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_folder(state: State<'_, AppState>, folder_id: i64, new_name: String) -> Result<(), String> {
    let db = state.connection()?;
    NoteService::rename_folder(&db, folder_id, &new_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_note(state: State<'_, AppState>, input: CreateNoteInput) -> Result<NoteSummary, String> {
    let mut db = state.connection()?;
    NoteService::create_note(&mut db, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_notes(state: State<'_, AppState>, folder_id: Option<i64>) -> Result<Vec<NoteSummary>, String> {
    let db: std::sync::MutexGuard<'_, rusqlite::Connection> = state.connection()?;
    NoteService::list_notes(&db, folder_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_open_notes(state: State<'_, AppState>) -> Result<Vec<NoteSummary>, String> {
    let db = state.connection()?;
    NoteService::list_open(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_deleted_notes(state: State<'_, AppState>) -> Result<Vec<NoteSummary>, String> {
    let db = state.connection()?;
    NoteService::list_deleted_notes(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_notes(state: State<'_, AppState>, query: String, folder_id: Option<i64>) -> Result<Vec<NoteSummary>, String> {
    let db = state.connection()?;
    NoteService::search_notes(&db, &query, folder_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_deleted_note(state: State<'_, AppState>, input: SetDeletedNoteInput) -> Result<(), String> {
    let db = state.connection()?;
    NoteService::set_is_deleted(&db, input.note_id, input.is_deleted).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_text_note(state: State<'_, AppState>, note_id: i64) -> Result<TextNote, String> {
    let db = state.connection()?;
    NoteService::get_text(&db, note_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_text_note(state: State<'_, AppState>, input: UpdateTextNoteInput) -> Result<(), String> {
    let db = state.connection()?;
    NoteService::update_text(&db, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_todo_note(state: State<'_, AppState>, note_id: i64) -> Result<TodoNote, String> {
    let db = state.connection()?;
    NoteService::get_todo(&db, note_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_todo_item(state: State<'_, AppState>, input: AddTodoInput) -> Result<TodoItem, String> {
    let db = state.connection()?;
    NoteService::add_todo(&db, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_todo_item(state: State<'_, AppState>, input: ToggleTodoInput) -> Result<(), String> {
    let db = state.connection()?;
    NoteService::toggle_todo(&db, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_todo_item(state: State<'_, AppState>, item_id: i64) -> Result<(), String> {
    let db = state.connection()?;
    NoteService::delete_todo(&db, item_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_expense_note(state: State<'_, AppState>, note_id: i64) -> Result<ExpenseNote, String> {
    let db = state.connection()?;
    NoteService::get_expense(&db, note_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_expense_item(state: State<'_, AppState>, input: AddExpenseInput) -> Result<ExpenseItem, String> {
    let db = state.connection()?;
    NoteService::add_expense(&db, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_expense_item(state: State<'_, AppState>, item_id: i64) -> Result<(), String> {
    let db = state.connection()?;
    NoteService::delete_expense(&db, item_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_photo(state: State<'_, AppState>, input: AddPhotoInput) -> Result<PhotoItem, String> {
    let db = state.connection()?;
    NoteService::add_photo(&db, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_photos(state: State<'_, AppState>, note_id: i64) -> Result<PhotoNote, String> {
    let db = state.connection()?;
    NoteService::list_photos(&db, note_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_photo(state: State<'_, AppState>, photo_id: i64) -> Result<(), String> {
    let db = state.connection()?;
    NoteService::delete_photo(&db, photo_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_note_color(state: State<'_, AppState>, input: UpdateNoteColorInput) -> Result<(), String> {
    let db = state.connection()?;
    NoteService::update_color(&db, input).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_note(state: State<'_, AppState>, note_id: i64) -> Result<(), String> {
    let db = state.connection()?;
    NoteService::delete(&db, note_id).map_err(|e| e.to_string())
}
