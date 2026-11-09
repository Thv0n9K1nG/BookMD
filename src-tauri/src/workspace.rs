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

/// Helper to determine if a directory or file should be skipped from workspace tree & search
pub fn is_ignored_entry(name: &str) -> bool {
    if name.starts_with('.') {
        return true;
    }
    matches!(
        name.to_lowercase().as_str(),
        "node_modules"
            | "target"
            | "dist"
            | "build"
            | "out"
            | "bin"
            | "obj"
            | "venv"
            | ".venv"
            | "env"
            | "__pycache__"
            | ".pytest_cache"
            | "vendor"
            | ".gradle"
            | ".idea"
            | ".vscode"
            | "pkg"
            | ".turbo"
            | ".next"
            | ".nuxt"
            | ".cache"
            | "bower_components"
            | ".cargo"
            | ".rustup"
    )
}

/// Read direct children entries of a single directory
pub fn read_dir_entries(dir: &Path, root: &Path) -> Result<Vec<FileEntry>, AppError> {
    if !dir.exists() || !dir.is_dir() {
        return Ok(Vec::new());
    }

    let mut entries: Vec<FileEntry> = Vec::new();
    let mut read_dir: Vec<_> = fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .collect();
    read_dir.sort_by_key(|e| e.file_name());

    for entry in read_dir {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if is_ignored_entry(&name) {
            continue;
        }

        let relative = path
            .strip_prefix(root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");

        if path.is_dir() {
            entries.push(FileEntry {
                name,
                relative_path: relative,
                kind: FileKind::Directory,
                children: None,
            });
        } else {
            entries.push(FileEntry {
                name,
                relative_path: relative,
                kind: FileKind::File,
                children: None,
            });
        }

        // Safety limit per folder to prevent UI lockup in abnormal folders
        if entries.len() >= 2000 {
            break;
        }
    }

    // Sort: directories first, then files alphabetically
    entries.sort_by(|a, b| {
        match (&a.kind, &b.kind) {
            (FileKind::Directory, FileKind::File) => std::cmp::Ordering::Less,
            (FileKind::File, FileKind::Directory) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

/// Read directory entries for on-demand lazy expansion
pub fn read_directory(workspace_path: &str, relative_path: &str) -> Result<Vec<FileEntry>, AppError> {
    let root = Path::new(workspace_path);
    if !root.exists() {
        return Err(AppError::WorkspaceNotOpen);
    }
    let target = if relative_path.is_empty() || relative_path == "." {
        root.to_path_buf()
    } else {
        root.join(relative_path)
    };
    read_dir_entries(&target, root)
}

/// Build file tree with safe depth limit (default depth = 1)
pub fn get_file_tree(workspace_path: &str) -> Result<Vec<FileEntry>, AppError> {
    let root = Path::new(workspace_path);
    if !root.exists() {
        return Err(AppError::WorkspaceNotOpen);
    }
    build_tree(root, root, 0, 1)
}

fn build_tree(
    dir: &Path,
    root: &Path,
    current_depth: usize,
    max_depth: usize,
) -> Result<Vec<FileEntry>, AppError> {
    let mut entries = read_dir_entries(dir, root)?;

    if current_depth < max_depth {
        for entry in &mut entries {
            if entry.kind == FileKind::Directory {
                let sub_path = root.join(&entry.relative_path);
                if sub_path.is_dir() {
                    let children = build_tree(&sub_path, root, current_depth + 1, max_depth)?;
                    entry.children = Some(children);
                }
            }
        }
    }

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_ignored_entry() {
        assert!(is_ignored_entry(".git"));
        assert!(is_ignored_entry("node_modules"));
        assert!(is_ignored_entry("target"));
        assert!(is_ignored_entry("dist"));
        assert!(is_ignored_entry(".vscode"));
        assert!(is_ignored_entry("venv"));
        assert!(!is_ignored_entry("src"));
        assert!(!is_ignored_entry("README.md"));
        assert!(!is_ignored_entry("notes"));
    }

    #[test]
    fn test_get_file_tree_bounded_depth_and_lazy_read() {
        let temp = std::env::temp_dir().join(format!("bookmd_tree_test_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(temp.join("level1/level2/level3"));
        fs::write(temp.join("README.md"), "hello").unwrap();
        fs::write(temp.join("level1/note.md"), "level1").unwrap();
        fs::write(temp.join("level1/level2/deep.md"), "deep").unwrap();

        let tree = get_file_tree(&temp.to_string_lossy()).unwrap();
        assert!(!tree.is_empty());
        let l1 = tree.iter().find(|e| e.name == "level1").unwrap();
        assert_eq!(l1.kind, FileKind::Directory);
        // Level 1 children are present
        let l1_children = l1.children.as_ref().unwrap();
        let l2 = l1_children.iter().find(|e| e.name == "level2").unwrap();
        // Level 2 directory has children deferred (None)
        assert!(l2.children.is_none());

        // Test on-demand reading of level2
        let l2_entries = read_directory(&temp.to_string_lossy(), "level1/level2").unwrap();
        assert!(l2_entries.iter().any(|e| e.name == "deep.md"));

        let _ = fs::remove_dir_all(&temp);
    }

    #[test]
    fn test_scan_user_nt213_project_speed() {
        let path = r#"C:\Users\hongo\Documents\NT213\PROJECT"#;
        if std::path::Path::new(path).exists() {
            let start = std::time::Instant::now();
            let tree = get_file_tree(path).unwrap();
            let elapsed = start.elapsed();
            println!("Scanned NT213/PROJECT in {:?}", elapsed);
            assert!(elapsed.as_millis() < 500, "Should take under 500ms, took {:?}", elapsed);
            assert!(!tree.is_empty());
        }
    }
}
