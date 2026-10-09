use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceInfo {
    pub path: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub relative_path: String,
    pub kind: FileKind,
    pub children: Option<Vec<FileEntry>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FileKind {
    File,
    Directory,
}

/// Open a workspace directory and return info
pub fn open_workspace(path: &str) -> Result<WorkspaceInfo, AppError> {
    let p = Path::new(path);
    if !p.exists() {
        return Err(AppError::FileNotFound(path.to_string()));
    }
    if !p.is_dir() {
        return Err(AppError::InvalidPath("Not a directory".to_string()));
    }
    let name = p
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string());
    Ok(WorkspaceInfo {
        path: p.canonicalize()?.to_string_lossy().to_string(),
        name,
    })
}

/// Build file tree recursively from workspace root
pub fn get_file_tree(workspace_path: &str) -> Result<Vec<FileEntry>, AppError> {
    let root = Path::new(workspace_path);
    if !root.exists() {
        return Err(AppError::WorkspaceNotOpen);
    }
    build_tree(root, root)
}

fn build_tree(dir: &Path, root: &Path) -> Result<Vec<FileEntry>, AppError> {
    let mut entries: Vec<FileEntry> = Vec::new();
    let mut read_dir: Vec<_> = fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .collect();
    read_dir.sort_by_key(|e| e.file_name());

    for entry in read_dir {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/dirs and node_modules
        if name.starts_with('.') || name == "node_modules" {
            continue;
        }

        let relative = path
            .strip_prefix(root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");

        if path.is_dir() {
            let children = build_tree(&path, root)?;
            entries.push(FileEntry {
                name,
                relative_path: relative,
                kind: FileKind::Directory,
                children: Some(children),
            });
        } else {
            entries.push(FileEntry {
                name,
                relative_path: relative,
                kind: FileKind::File,
                children: None,
            });
        }
    }

    // Sort: directories first, then files
    entries.sort_by(|a, b| {
        match (&a.kind, &b.kind) {
            (FileKind::Directory, FileKind::File) => std::cmp::Ordering::Less,
            (FileKind::File, FileKind::Directory) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

/// Read file content
pub fn read_file(workspace_path: &str, relative_path: &str) -> Result<String, AppError> {
    let full_path = Path::new(workspace_path).join(relative_path);
    if !full_path.exists() {
        return Err(AppError::FileNotFound(relative_path.to_string()));
    }
    Ok(fs::read_to_string(&full_path)?)
}

/// Write content to file
pub fn write_file(workspace_path: &str, relative_path: &str, content: &str) -> Result<(), AppError> {
    let full_path = Path::new(workspace_path).join(relative_path);
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&full_path, content)?;
    Ok(())
}

/// Create a new file or directory
pub fn create_entry(workspace_path: &str, relative_path: &str, kind: &str) -> Result<FileEntry, AppError> {
    let full_path = Path::new(workspace_path).join(relative_path);
    if full_path.exists() {
        return Err(AppError::FileAlreadyExists(relative_path.to_string()));
    }

    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let name = full_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    match kind {
        "directory" => {
            fs::create_dir_all(&full_path)?;
            Ok(FileEntry {
                name,
                relative_path: relative_path.to_string(),
                kind: FileKind::Directory,
                children: Some(Vec::new()),
            })
        }
        _ => {
            fs::write(&full_path, "")?;
            Ok(FileEntry {
                name,
                relative_path: relative_path.to_string(),
                kind: FileKind::File,
                children: None,
            })
        }
    }
}

/// Rename a file or directory with conflict detection
pub fn rename_entry(workspace_path: &str, source: &str, destination: &str) -> Result<(), AppError> {
    let src = Path::new(workspace_path).join(source);
    let dst = Path::new(workspace_path).join(destination);

    if !src.exists() {
        return Err(AppError::FileNotFound(source.to_string()));
    }
    if dst.exists() {
        return Err(AppError::FileAlreadyExists(destination.to_string()));
    }
    if let Some(parent) = dst.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::rename(&src, &dst)?;
    Ok(())
}

/// Delete a file or directory (move to trash for safety)
pub fn delete_entry(workspace_path: &str, relative_path: &str) -> Result<(), AppError> {
    let full_path = Path::new(workspace_path).join(relative_path);
    if !full_path.exists() {
        return Err(AppError::FileNotFound(relative_path.to_string()));
    }
    trash::delete(&full_path).map_err(|e| AppError::IoError(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;
    Ok(())
}
