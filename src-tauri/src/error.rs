use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("데이터베이스 오류: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("입력 오류: {0}")]
    Validation(String),

    #[error("데이터를 찾을 수 없습니다: {0}")]
    NotFound(String),

    #[error("메모 타입이 일치하지 않습니다. 예상: {expected}, 실제: {actual}")]
    InvalidNoteType { expected: String, actual: String },

    #[error("데이터베이스 잠금에 실패했습니다.")]
    Lock,

    #[error("애플리케이션 오류: {0}")]
    Internal(String),
}

impl From<AppError> for String {
    fn from(value: AppError) -> Self {
        value.to_string()
    }
}

pub type AppResult<T> = Result<T, AppError>;
