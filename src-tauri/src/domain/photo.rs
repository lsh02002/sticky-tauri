use serde::{Deserialize, Serialize};

use super::NoteSummary;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhotoItem {
    pub id: i64,
    pub note_id: i64,
    pub file_path: String,
    pub position: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhotoNote {
    pub note: NoteSummary,
    pub items: Vec<PhotoItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddPhotoInput {
    pub note_id: i64,
    pub file_path: String,
}
