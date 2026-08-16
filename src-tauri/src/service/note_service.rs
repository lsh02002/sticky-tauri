use crate::domain::{AddRichTextWithPhotosInput, CreateFolderRequest, Folder, RichTextContent};
use crate::repository::SqliteNoteRepository;
use rusqlite::Connection;

use crate::{
    domain::{
        AddExpenseInput, AddPhotoInput, AddTodoInput, CreateNoteInput, ExpenseItem, ExpenseNote,
        NoteSummary, PhotoItem, PhotoNote, TextNote, TodoItem, TodoNote, ToggleTodoInput,
        UpdateNoteColorInput, UpdateTextNoteInput,
    },
    error::{AppError, AppResult},
};

pub struct NoteService;

impl NoteService {
    pub fn create_folder(connection: &Connection, req: CreateFolderRequest) -> AppResult<Folder> {
        SqliteNoteRepository::create_folder(connection, req)
    }

    pub fn list_folders(connection: &Connection) -> AppResult<Vec<Folder>> {
        SqliteNoteRepository::find_all_folders(connection)
    }

    pub fn set_folder(
        connection: &Connection,
        note_id: i64,
        folder_id: Option<i64>,
    ) -> AppResult<()> {
        SqliteNoteRepository::set_folder(connection, note_id, folder_id)
    }

    pub fn rename_folder(connection: &Connection, folder_id: i64, new_name: &str) -> AppResult<()> {
        SqliteNoteRepository::rename_folder(connection, folder_id, new_name)
    }

    fn require_type(connection: &Connection, note_id: i64, expected: &str) -> AppResult<()> {
        match SqliteNoteRepository::find_note_type(connection, note_id)? {
            None => Err(AppError::NotFound("메모".into())),
            Some(actual) if actual == expected => Ok(()),
            Some(actual) => Err(AppError::InvalidNoteType {
                expected: expected.into(),
                actual,
            }),
        }?; // Add this line to propagate the result

        Ok(())
    }

    pub fn create_note(connection: &Connection, input: CreateNoteInput) -> AppResult<NoteSummary> {
        if input.title.trim().is_empty() {
            return Err(AppError::Validation("제목을 입력해주세요.".into()));
        }
        let note_type = input.note_type.as_str();
        let color = input.color.unwrap_or_else(|| "#fff59d".into());
        let folder_id = input.folder_id;
        let id = SqliteNoteRepository::create_note(
            connection,
            note_type,
            input.title.trim(),
            &color,
            folder_id,
        )?;
        if note_type == "text" {
            SqliteNoteRepository::create_text_detail(connection, id)?;
        } else if note_type == "richText" {
            SqliteNoteRepository::create_rich_text_detail(connection, id)?;
        }
        SqliteNoteRepository::find_note(connection, id)?
            .ok_or_else(|| AppError::NotFound("생성된 메모".into()))
    }

    pub fn list_notes(
        connection: &Connection,
        folder_id: Option<i64>,
    ) -> AppResult<Vec<NoteSummary>> {
        SqliteNoteRepository::list_notes(connection, folder_id)
    }

    pub fn list_open(connection: &Connection) -> AppResult<Vec<NoteSummary>> {
        SqliteNoteRepository::list_open_notes(connection)
    }

    pub fn list_deleted_notes(connection: &Connection) -> AppResult<Vec<NoteSummary>> {
        SqliteNoteRepository::list_deleted_notes(connection)
    }

    pub fn search_notes(
        connection: &Connection,
        query: &str,
        folder_id: Option<i64>,
    ) -> AppResult<Vec<NoteSummary>> {
        SqliteNoteRepository::search_notes(connection, query, folder_id)
    }

    pub fn find(connection: &Connection, note_id: i64) -> AppResult<NoteSummary> {
        SqliteNoteRepository::find_note(connection, note_id)?
            .ok_or_else(|| AppError::NotFound("메모".into()))
    }

    pub fn set_open(connection: &Connection, note_id: i64, open: bool) -> AppResult<()> {
        SqliteNoteRepository::set_open(connection, note_id, open)
    }

    pub fn set_is_deleted(
        connection: &Connection,
        note_id: i64,
        is_deleted: bool,
    ) -> AppResult<()> {
        SqliteNoteRepository::set_is_deleted(connection, note_id, is_deleted)
    }

    pub fn update_note_position_size(
        connection: &Connection,
        note_id: i64,
        x: f64,
        y: f64,
        width: f64,
        height: f64,
    ) -> AppResult<()> {
        SqliteNoteRepository::update_note_position_size(connection, note_id, x, y, width, height)
    }

    pub fn update_title(connection: &Connection, note_id: i64, title: &str) -> AppResult<bool> {
        if title.trim().is_empty() {
            return Err(AppError::Validation("제목을 입력해주세요.".into()));
        }
        SqliteNoteRepository::update_title(connection, note_id, title.trim())
    }

    pub fn update_color(connection: &Connection, input: UpdateNoteColorInput) -> AppResult<()> {
        if !input.color.starts_with('#') {
            return Err(AppError::Validation("색상은 HEX 형식이어야 합니다.".into()));
        }
        SqliteNoteRepository::update_color(connection, input.note_id, &input.color)
    }

    pub fn delete(connection: &Connection, note_id: i64) -> AppResult<()> {
        SqliteNoteRepository::delete_note(connection, note_id)
    }

    pub fn get_text(connection: &Connection, note_id: i64) -> AppResult<TextNote> {
        Self::require_type(connection, note_id, "text")?;
        let note = SqliteNoteRepository::find_note(connection, note_id)?
            .ok_or_else(|| AppError::NotFound("메모".into()))?;
        let content = SqliteNoteRepository::get_text_content(connection, note_id)?;
        Ok(TextNote { note, content })
    }

    pub fn update_text(connection: &mut Connection, input: UpdateTextNoteInput) -> AppResult<()> {
        Self::require_type(connection, input.note_id, "text")?;
        SqliteNoteRepository::update_text(connection, input.note_id, &input.content)
    }

    pub fn get_rich_text(connection: &Connection, note_id: i64) -> AppResult<TextNote> {
        Self::require_type(connection, note_id, "richText")?;
        let note = SqliteNoteRepository::find_note(connection, note_id)?
            .ok_or_else(|| AppError::NotFound("메모".into()))?;
        let content = SqliteNoteRepository::get_rich_text_content(connection, note_id)?;
        Ok(TextNote { note, content })
    }

    pub fn update_rich_text(
        connection: &mut Connection,
        input: UpdateTextNoteInput,
    ) -> AppResult<()> {
        Self::require_type(connection, input.note_id, "richText")?;
        SqliteNoteRepository::update_rich_text(connection, input.note_id, &input.content)
    }

    pub fn get_todo(connection: &Connection, note_id: i64) -> AppResult<TodoNote> {
        Self::require_type(connection, note_id, "todo")?;
        let note = SqliteNoteRepository::find_note(connection, note_id)?
            .ok_or_else(|| AppError::NotFound("메모".into()))?;
        Ok(TodoNote {
            note,
            items: SqliteNoteRepository::list_todos(connection, note_id)?,
        })
    }

    pub fn add_todo(connection: &Connection, input: AddTodoInput) -> AppResult<TodoItem> {
        Self::require_type(connection, input.note_id, "todo")?;
        if input.content.trim().is_empty() {
            return Err(AppError::Validation("할 일을 입력해주세요.".into()));
        }
        SqliteNoteRepository::add_todo(connection, input.note_id, input.content.trim())
    }

    pub fn toggle_todo(connection: &Connection, input: ToggleTodoInput) -> AppResult<()> {
        SqliteNoteRepository::toggle_todo(connection, input.item_id, input.completed)
    }

    pub fn delete_todo(connection: &Connection, item_id: i64) -> AppResult<()> {
        SqliteNoteRepository::delete_todo(connection, item_id)
    }

    pub fn get_expense(connection: &Connection, note_id: i64) -> AppResult<ExpenseNote> {
        Self::require_type(connection, note_id, "expense")?;

        let note = SqliteNoteRepository::find_note(connection, note_id)?
            .ok_or_else(|| AppError::NotFound("메모".into()))?;

        let items = SqliteNoteRepository::list_expenses(connection, note_id)?;

        let total = items
            .iter()
            .map(|item| match item.kind.as_str() {
                "수입" => item.amount,
                "지출" => -item.amount,
                _ => 0, // 또는 에러 처리
            })
            .sum();

        Ok(ExpenseNote { note, items, total })
    }

    pub fn add_expense(connection: &Connection, input: AddExpenseInput) -> AppResult<ExpenseItem> {
        Self::require_type(connection, input.note_id, "expense")?;
        if input.description.trim().is_empty() {
            return Err(AppError::Validation("사용 내역을 입력해주세요.".into()));
        }
        if input.amount <= 0 {
            return Err(AppError::Validation("금액은 0보다 커야 합니다.".into()));
        }
        SqliteNoteRepository::add_expense(
            connection,
            input.note_id,
            input.description.trim(),
            input.amount,
            input.kind.trim(),
            input.category.trim(),
            input.expense_date.trim(),
        )
    }

    pub fn delete_expense(connection: &Connection, item_id: i64) -> AppResult<()> {
        SqliteNoteRepository::delete_expense(connection, item_id)
    }

    pub fn add_photo(connection: &Connection, input: AddPhotoInput) -> AppResult<PhotoItem> {
        Self::require_type(connection, input.note_id, "photo")?;
        if input.file_path.trim().is_empty() {
            return Err(AppError::Validation("파일 경로를 입력해주세요.".into()));
        }
        SqliteNoteRepository::add_photo(connection, input.note_id, input.file_path.trim())
    }

    pub fn add_rich_text_with_photos(
    connection: &mut Connection,
    input: AddRichTextWithPhotosInput,
    ) -> AppResult<RichTextContent> {
        Self::require_type(
            connection,
            input.note_id,
            "richText",
        )?;

        let mut content = input.content;

        // 1. 새 사진 추가
        for added_photo in input.added_photos {
            let file_path = added_photo.file_path.trim();

            if file_path.is_empty() {
                return Err(AppError::Validation(
                    "파일 경로를 입력해주세요.".into(),
                ));
            }

            let photo =
                SqliteNoteRepository::add_photo(
                    connection,
                    input.note_id,
                    file_path,
                )?;

            content = content.replace(
                &format!(
                    "#tempPhotoId={}",
                    added_photo.temp_id,
                ),
                &format!(
                    "#photoId={}",
                    photo.id,
                ),
            );
        }

        // 2. 삭제된 사진 제거
        for photo_id in input.deleted_photo_ids {
            SqliteNoteRepository::delete_photo(
                connection,
                photo_id,
            )?;
        }

        // 3. RichText 저장
            SqliteNoteRepository::update_rich_text(
                connection,
                input.note_id,
                &content,
            )?;

        Ok(RichTextContent {
            content,
        })
    }

    pub fn list_photos(connection: &Connection, note_id: i64) -> AppResult<PhotoNote> {
        Self::require_type(connection, note_id, "photo")?;
        let note = SqliteNoteRepository::find_note(connection, note_id)?
            .ok_or_else(|| AppError::NotFound("메모".into()))?;
        let items = SqliteNoteRepository::list_photos(connection, note_id)?;
        Ok(PhotoNote { note, items })
    }

    pub fn delete_photo(connection: &Connection, photo_id: i64) -> AppResult<()> {
        SqliteNoteRepository::delete_photo(connection, photo_id)
    }

    pub fn delete_rich_text_photo(connection: &Connection, photo_id: i64) -> AppResult<()> {
        SqliteNoteRepository::delete_photo(connection, photo_id)
    }
}
