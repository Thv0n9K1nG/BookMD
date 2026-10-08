use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("File already exists: {0}")]
    FileAlreadyExists(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Workspace not open")]
    WorkspaceNotOpen,

    #[error("Image conflict: {0}")]
    ImageConflict(String),

    #[error("Search failed: {0}")]
    SearchFailed(String),

    #[error("Export failed: {0}")]
    ExportFailed(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Serde error: {0}")]
    SerdeError(#[from] serde_json::Error),
}

/// Structured error response for IPC
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub code: String,
    pub message: String,
}

impl From<&AppError> for ErrorResponse {
    fn from(err: &AppError) -> Self {
        let code = match err {
            AppError::FileNotFound(_) => "FILE_NOT_FOUND",
            AppError::FileAlreadyExists(_) => "FILE_ALREADY_EXISTS",
            AppError::PermissionDenied(_) => "PERMISSION_DENIED",
            AppError::InvalidPath(_) => "INVALID_PATH",
            AppError::WorkspaceNotOpen => "WORKSPACE_NOT_OPEN",
            AppError::ImageConflict(_) => "IMAGE_CONFLICT",
            AppError::SearchFailed(_) => "SEARCH_FAILED",
            AppError::ExportFailed(_) => "EXPORT_FAILED",
            AppError::IoError(_) => "IO_ERROR",
            AppError::SerdeError(_) => "SERDE_ERROR",
        };
        ErrorResponse {
            code: code.to_string(),
            message: err.to_string(),
        }
    }
}

// Tauri requires errors to be serializable as strings
impl std::fmt::Display for ErrorResponse {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        let resp = ErrorResponse::from(&err);
        serde_json::to_string(&resp).unwrap_or_else(|_| err.to_string())
    }
}
