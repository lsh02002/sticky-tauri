use serde::{Deserialize, Serialize};

use super::NoteSummary;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoItem {
    pub id: i64,
    pub note_id: i64,
    pub content: String,
    pub completed: bool,
    pub position: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoNote {
    pub note: NoteSummary,
    pub items: Vec<TodoItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddTodoInput {
    pub note_id: i64,
    pub content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleTodoInput {
    pub item_id: i64,
    pub completed: bool,
}
