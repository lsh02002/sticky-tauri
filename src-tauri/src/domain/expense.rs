use serde::{Deserialize, Serialize};

use super::NoteSummary;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseItem {
    pub id: i64,
    pub note_id: i64,
    pub description: String,
    pub amount: i64,
    pub kind: String,
    pub category: String,
    pub expense_date: String,
    pub position: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseNote {
    pub note: NoteSummary,
    pub items: Vec<ExpenseItem>,
    pub total: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddExpenseInput {
    pub note_id: i64,
    pub description: String,
    pub amount: i64,
    pub kind: String,
    pub category: String,
    pub expense_date: String,
}
