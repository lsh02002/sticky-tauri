use rusqlite::{params, Connection, OptionalExtension, Row};
use crate::{
    domain::{ExpenseItem, NoteSummary, PhotoItem, TodoItem, Folder, CreateFolderRequest},
    error::{AppError, AppResult},
};

pub struct SqliteNoteRepository;

impl SqliteNoteRepository {
    pub fn initialize(connection: &Connection) -> AppResult<()> {
        connection.execute_batch(
            r#"
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;

            CREATE TABLE IF NOT EXISTS folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,                
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', '+9 hours')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', '+9 hours'))
            );

            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                note_type TEXT NOT NULL CHECK(note_type IN ('text', 'todo', 'expense', 'photo')),
                title TEXT NOT NULL DEFAULT '',
                color TEXT NOT NULL DEFAULT '#fff59d',
                x REAL NOT NULL DEFAULT 40,
                y REAL NOT NULL DEFAULT 40,
                width REAL NOT NULL DEFAULT 320,
                height REAL NOT NULL DEFAULT 280,
                folder_id INTEGER,
                open INTEGER NOT NULL DEFAULT 0,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', '+9 hours')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', '+9 hours')),
                FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS text_notes (
                note_id INTEGER PRIMARY KEY,
                content TEXT NOT NULL DEFAULT '',
                FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS todo_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                note_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                position INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS expense_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                note_id INTEGER NOT NULL,
                description TEXT NOT NULL,
                amount INTEGER NOT NULL,
                kind TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT '',
                expense_date TEXT NOT NULL,
                position INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS photo_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                note_id INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                position INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
            );
            "#,
        )?;
        Ok(())
    }

    pub fn create_folder(connection: &Connection, req: CreateFolderRequest) -> AppResult<Folder> {
        connection.execute(
            r#"
            INSERT INTO folders (name)
            VALUES (?1)
            "#,
            params![req.name],
        )?;

        let id = connection.last_insert_rowid();

        let folder = connection.query_row(
            "SELECT * FROM folders WHERE id = ?1",
            params![id],
            |row| {
                Ok(Folder {
                    id: row.get("id")?,
                    name: row.get("name")?,                    
                    sort_order: row.get("sort_order")?,
                    created_at: row.get("created_at")?,
                    updated_at: row.get("updated_at")?,
                })
            },
        )?;

        Ok(folder)
    }

    pub fn find_all_folders(connection: &Connection) -> AppResult<Vec<Folder>> {
        let mut stmt = connection.prepare(
            r#"
            SELECT *
            FROM folders            
            ORDER BY sort_order ASC, name ASC
            "#,
        )?;

        let folders = stmt
            .query_map([], |row| {
                Ok(Folder {
                    id: row.get("id")?,
                    name: row.get("name")?,                    
                    sort_order: row.get("sort_order")?,
                    created_at: row.get("created_at")?,
                    updated_at: row.get("updated_at")?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(folders)
    }

    pub fn set_folder(connection: &Connection, note_id: i64, folder_id: Option<i64>) -> AppResult<()> {
        let changed = connection.execute(
            "UPDATE notes SET folder_id = ?1, updated_at = datetime('now', '+9 hours') WHERE id = ?2",
            params![folder_id, note_id],
        )?;
        if changed == 0 {
            return Err(AppError::NotFound("메모".into()));
        }
        Ok(())
    }

    pub fn rename_folder(connection: &Connection, folder_id: i64, new_name: &str) -> AppResult<()> {
        let changed = connection.execute(
            "UPDATE folders SET name = ?1, updated_at = datetime('now', '+9 hours') WHERE id = ?2",
            params![new_name, folder_id],
        )?;
        if changed == 0 {
            return Err(AppError::NotFound("폴더".into()));
        }
        Ok(())
    }

    fn row_to_note(row: &Row<'_>) -> rusqlite::Result<NoteSummary> {
        Ok(NoteSummary {
            id: row.get("id")?,
            note_type: row.get("note_type")?,
            title: row.get("title")?,
            color: row.get("color")?,
            x: row.get("x")?,
            y: row.get("y")?,
            width: row.get("width")?,
            height: row.get("height")?,
            folder_id: row.get("folder_id")?,
            open: row.get("open")?,
            is_deleted: row.get("is_deleted")?, // Assuming is_deleted is not stored in the database yet
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }

    pub fn create_note(connection: &Connection, note_type: &str, title: &str, color: &str, folder_id: Option<i64>) -> AppResult<i64> {        
        connection.execute(
            "INSERT INTO notes (note_type, title, color, folder_id) VALUES (?1, ?2, ?3, ?4)",
            params![note_type, title, color, folder_id],
        )?;
        
        Ok(connection.last_insert_rowid())
    }

    pub fn create_text_detail(connection: &Connection, note_id: i64) -> AppResult<()> {
        connection.execute(
            "INSERT INTO text_notes (note_id, content) VALUES (?1, '')",
            params![note_id],
        )?;
        Ok(())
    }

    pub fn set_open(connection: &Connection, note_id: i64, open: bool) -> AppResult<()> {
        connection.execute(
            "UPDATE notes SET open = ?1 WHERE id = ?2",
            params![open, note_id],
        )?;
        Ok(())
    }

    pub fn set_is_deleted(connection: &Connection, note_id: i64, is_deleted: bool) -> AppResult<()> {
        connection.execute(
            "UPDATE notes SET is_deleted = ?1, updated_at = datetime('now', '+9 hours') WHERE id = ?2",
            params![is_deleted, note_id],
        )?;
        Ok(())
    }

    pub fn update_note_position_size(connection: &Connection, note_id: i64, x: f64, y: f64, width: f64, height: f64) -> AppResult<()> {
        let changed = connection.execute(
            "UPDATE notes SET x = ?1, y = ?2, width = ?3, height = ?4, updated_at = datetime('now', '+9 hours') WHERE id = ?5",
            params![x, y, width, height, note_id],
        )?;
        if changed == 0 {
            return Err(AppError::NotFound("메모".into()));
        }
        Ok(())
    }

    pub fn update_title(connection: &Connection, note_id: i64, title: &str) -> AppResult<bool> {
        let current_title: String = connection.query_row(
            "SELECT title FROM notes WHERE id = ?1",
            [note_id],
            |row| row.get(0),
        )?;

        if title == current_title {
            return Ok(false); // No changes needed
        }

        let changed = connection.execute(
            "UPDATE notes
            SET title = ?1,
                updated_at = datetime('now', '+9 hours')
            WHERE id = ?2",
            params![title, note_id],
        )?;

        if changed == 0 {
            return Err(AppError::NotFound("메모".into()));
        }

        Ok(true)
    }

    pub fn list_notes(connection: &Connection, folder_id: Option<i64>) -> AppResult<Vec<NoteSummary>> {
        let mut stmt = connection.prepare(
            "SELECT id, note_type, title, color, x, y, width, height, folder_id, open, is_deleted, created_at, updated_at
             FROM notes WHERE is_deleted = 0 AND (?1 IS NULL OR folder_id = ?1) ORDER BY updated_at DESC, id DESC",
        )?;
        let values = stmt
            .query_map([folder_id], Self::row_to_note)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(values)
    }

    pub fn list_open_notes(connection: &Connection) -> AppResult<Vec<NoteSummary>> {
        let mut stmt = connection.prepare(
            "SELECT id, note_type, title, color, x, y, width, height, folder_id, open, is_deleted, created_at, updated_at
            FROM notes
            WHERE open = 1 AND is_deleted = 0
            ORDER BY updated_at DESC, id DESC",
        )?;

        let values = stmt
            .query_map([], Self::row_to_note)?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(values)
    }

    pub fn list_deleted_notes(connection: &Connection) -> AppResult<Vec<NoteSummary>> {
        let mut stmt = connection.prepare(
            "SELECT id, note_type, title, color, x, y, width, height, folder_id, open, is_deleted, created_at, updated_at
             FROM notes WHERE is_deleted = 1 ORDER BY updated_at DESC, id DESC",
        )?;
        let values = stmt
            .query_map([], Self::row_to_note)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(values)
    }

    pub fn search_notes(connection: &Connection, query: &str, folder_id: Option<i64>) -> AppResult<Vec<NoteSummary>> {
        let mut stmt = connection.prepare(
            "SELECT id, note_type, title, color, x, y, width, height, folder_id, open, is_deleted, created_at, updated_at
             FROM notes WHERE is_deleted = 0 AND (title LIKE ?1 OR updated_at LIKE ?1)
             AND (?2 IS NULL OR folder_id = ?2)
             ORDER BY updated_at DESC, id DESC",
        )?;
        let values = stmt
            .query_map(params![format!("%{}%", query), folder_id], Self::row_to_note)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(values)
    }

    pub fn find_note(connection: &Connection, note_id: i64) -> AppResult<Option<NoteSummary>> {
        Ok(connection
            .query_row(
                "SELECT id, note_type, title, color, x, y, width, height, folder_id, open, is_deleted, created_at, updated_at
                 FROM notes WHERE id = ?1",
                params![note_id],
                Self::row_to_note,
            )
            .optional()?)
    }

    pub fn find_note_type(connection: &Connection, note_id: i64) -> AppResult<Option<String>> {
        Ok(connection
            .query_row(
                "SELECT note_type FROM notes WHERE id = ?1",
                params![note_id],
                |row| row.get(0),
            )
            .optional()?)
    }

    pub fn get_text_content(connection: &Connection, note_id: i64) -> AppResult<String> {
        Ok(connection.query_row(
            "SELECT content FROM text_notes WHERE note_id = ?1",
            params![note_id],
            |row| row.get(0),
        )?)
    }

    pub fn update_text(connection: &mut Connection, note_id: i64, content: &str) -> AppResult<()> {        
        let tx = connection.transaction()?;

        let changed = tx.execute(
            "UPDATE text_notes
            SET content = ?1
            WHERE note_id = ?2
            AND content != ?1",
            params![content, note_id],
        )?;

        if changed > 0 {
            tx.execute(
                "UPDATE notes
                SET updated_at = datetime('now', '+9 hours')
                WHERE id = ?1",
                params![note_id],
            )?;
        }

        tx.commit()?;

        Ok(())
    }

    pub fn list_todos(connection: &Connection, note_id: i64) -> AppResult<Vec<TodoItem>> {
        let mut stmt = connection.prepare(
            "SELECT id, note_id, content, completed, position FROM todo_items
             WHERE note_id = ?1 ORDER BY position, id",
        )?;
        let rows = stmt.query_map(params![note_id], |row| {
            Ok(TodoItem {
                id: row.get(0)?,
                note_id: row.get(1)?,
                content: row.get(2)?,
                completed: row.get::<_, i64>(3)? != 0,
                position: row.get(4)?,
            })
        })?;

        let items = rows.collect::<Result<Vec<_>, _>>()?;

        Ok(items)
    }

    pub fn add_todo(connection: &Connection, note_id: i64, content: &str) -> AppResult<TodoItem> {
        let position: i64 = connection.query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM todo_items WHERE note_id = ?1",
            params![note_id],
            |row| row.get(0),
        )?;
        connection.execute(
            "INSERT INTO todo_items (note_id, content, position) VALUES (?1, ?2, ?3)",
            params![note_id, content, position],
        )?;
        let id = connection.last_insert_rowid();
        Ok(TodoItem {
            id,
            note_id,
            content: content.to_string(),
            completed: false,
            position,
        })
    }

    pub fn toggle_todo(connection: &Connection, item_id: i64, completed: bool) -> AppResult<()> {
        let changed = connection.execute(
            "UPDATE todo_items SET completed = ?1 WHERE id = ?2",
            params![completed as i64, item_id],
        )?;
        if changed == 0 {
            return Err(AppError::NotFound("투두 항목".into()));
        }
        Ok(())
    }

    pub fn delete_todo(connection: &Connection, item_id: i64) -> AppResult<()> {
        let changed =
            connection.execute("DELETE FROM todo_items WHERE id = ?1", params![item_id])?;
        if changed == 0 {
            return Err(AppError::NotFound("투두 항목".into()));
        }
        Ok(())
    }

    pub fn list_expenses(connection: &Connection, note_id: i64) -> AppResult<Vec<ExpenseItem>> {
        let mut stmt = connection.prepare(
            "SELECT id, note_id, description, amount, kind, category, expense_date, position
             FROM expense_items WHERE note_id = ?1 ORDER BY expense_date DESC, position, id DESC",
        )?;
        let rows = stmt.query_map(params![note_id], |row| {
            Ok(ExpenseItem {
                id: row.get(0)?,
                note_id: row.get(1)?,
                description: row.get(2)?,
                amount: row.get(3)?,
                kind: row.get(4)?,
                category: row.get(5)?,
                expense_date: row.get(6)?,
                position: row.get(7)?,
            })
        })?;

        let items = rows.collect::<Result<Vec<_>, _>>()?;

        Ok(items)
    }

    pub fn add_expense(connection: &Connection, note_id: i64, description: &str, amount: i64, kind: &str, category: &str, expense_date: &str) -> AppResult<ExpenseItem> {
        let position: i64 = connection.query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM expense_items WHERE note_id = ?1",
            params![note_id],
            |row| row.get(0),
        )?;
        connection.execute(
            "INSERT INTO expense_items (note_id, description, amount, kind, category, expense_date, position)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![note_id, description, amount, kind, category, expense_date, position],
        )?;
        Ok(ExpenseItem {
            id: connection.last_insert_rowid(),
            note_id,
            description: description.into(),
            amount,
            kind: kind.into(),
            category: category.into(),
            expense_date: expense_date.into(),
            position,
        })
    }

    pub fn delete_expense(connection: &Connection, item_id: i64) -> AppResult<()> {
        let changed =
            connection.execute("DELETE FROM expense_items WHERE id = ?1", params![item_id])?;
        if changed == 0 {
            return Err(AppError::NotFound("가계부 항목".into()));
        }
        Ok(())
    }

    pub fn add_photo(connection: &Connection, note_id: i64, file_path: &str) -> AppResult<PhotoItem> {
        let position: i64 = connection.query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM photo_items WHERE note_id = ?1",
            params![note_id],
            |row| row.get(0),
        )?;
        connection.execute(
            "INSERT INTO photo_items (note_id, file_path, position) VALUES (?1, ?2, ?3)",
            params![note_id, file_path, position],
        )?;
        Ok(PhotoItem {
            id: connection.last_insert_rowid(),
            note_id,
            file_path: file_path.into(),
            position,
        })
    }

    pub fn list_photos(connection: &Connection, note_id: i64) -> AppResult<Vec<PhotoItem>> {
        let mut stmt = connection.prepare(
            "SELECT id, file_path, position FROM photo_items WHERE note_id = ?1 ORDER BY position, id",
        )?;
        let rows = stmt.query_map(params![note_id], |row| {
            Ok(PhotoItem {
                id: row.get(0)?,
                note_id,
                file_path: row.get(1)?,
                position: row.get(2)?,
            })
        })?;

        let items = rows.collect::<Result<Vec<_>, _>>()?;

        Ok(items)
    }

    pub fn delete_photo(connection: &Connection, photo_id: i64) -> AppResult<()> {
        let changed =
            connection.execute("DELETE FROM photo_items WHERE id = ?1", params![photo_id])?;
        if changed == 0 {
            return Err(AppError::NotFound("사진".into()));
        }
        Ok(())
    }

    pub fn update_color(connection: &Connection, note_id: i64, color: &str) -> AppResult<()> {
        let changed = connection.execute(
            "UPDATE notes SET color = ?1, updated_at = datetime('now', '+9 hours') WHERE id = ?2",
            params![color, note_id],
        )?;
        if changed == 0 {
            return Err(AppError::NotFound("메모".into()));
        }
        Ok(())
    }

    pub fn delete_note(connection: &Connection, note_id: i64) -> AppResult<()> {
        let changed = connection.execute("DELETE FROM notes WHERE id = ?1", params![note_id])?;
        if changed == 0 {
            return Err(AppError::NotFound("메모".into()));
        }
        Ok(())
    }
}
