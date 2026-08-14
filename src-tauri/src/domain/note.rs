use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NoteType {
    Text,
    Todo,
    Expense,
    Photo,
}

impl NoteType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Text => "text",
            Self::Todo => "todo",
            Self::Expense => "expense",
            Self::Photo => "photo",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteSummary {
    pub id: i64,
    pub note_type: String,
    pub title: String,
    pub color: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub folder_id: Option<i64>,
    pub open: bool,
    pub is_deleted: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextNote {
    pub note: NoteSummary,
    pub content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNoteInput {
    pub note_type: NoteType,
    pub title: String,
    pub color: Option<String>,
    pub folder_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTextNoteInput {
    pub note_id: i64,
    pub content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNoteColorInput {
    pub note_id: i64,
    pub color: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetDeletedNoteInput {
    pub note_id: i64,
    pub is_deleted: bool,
}
