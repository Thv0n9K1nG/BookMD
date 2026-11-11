use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use crate::workspace::is_ignored_entry;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupOptions {
    pub source_path: String,
    pub destination_folder: String,
    pub conflict_strategy: Option<String>, // "auto_rename", "timestamp", "overwrite"
    pub skip_ignored: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BackupResult {
    pub success: bool,
    pub source_path: String,
    pub destination_path: String,
    pub destination_name: String,
    pub files_copied: u64,
    pub is_directory: bool,
}

pub fn get_timestamp_suffix() -> String {
    let now = std::time::SystemTime::now();
    let since_epoch = now
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let secs = since_epoch;
    let days = (secs / 86400) as i64;
    let time_of_day = (secs % 86400) as u32;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u32;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = (yoe as i64) + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };

    format!("{:04}{:02}{:02}_{:02}{:02}{:02}", y, m, d, hours, minutes, seconds)
}

fn copy_dir_all(
    src: &Path,
    dst: &Path,
    skip_ignored: bool,
    files_copied: &mut u64,
) -> Result<(), String> {
    if !dst.exists() {
        fs::create_dir_all(dst).map_err(|e| format!("Failed to create directory {:?}: {}", dst, e))?;
    }

    let entries = fs::read_dir(src).map_err(|e| format!("Failed to read directory {:?}: {}", src, e))?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let ft = entry.file_type().map_err(|e| e.to_string())?;
        let file_name = entry.file_name();
        let name_str = file_name.to_string_lossy();

        if skip_ignored && is_ignored_entry(&name_str) {
            continue;
        }

        let from_path = entry.path();
        let to_path = dst.join(&file_name);

        if ft.is_dir() {
            copy_dir_all(&from_path, &to_path, skip_ignored, files_copied)?;
        } else if ft.is_file() {
            fs::copy(&from_path, &to_path)
                .map_err(|e| format!("Failed to copy file {:?} to {:?}: {}", from_path, to_path, e))?;
            *files_copied += 1;
        }
    }

    Ok(())
}

pub fn execute_backup(
    workspace_root: Option<&str>,
    options: BackupOptions,
) -> Result<BackupResult, String> {
    let source = if Path::new(&options.source_path).is_absolute() {
        PathBuf::from(&options.source_path)
    } else if let Some(ws) = workspace_root {
        Path::new(ws).join(&options.source_path)
    } else {
        PathBuf::from(&options.source_path)
    };

    if !source.exists() {
        return Err(format!("Đường dẫn nguồn không tồn tại: {}", source.display()));
    }

    let dest_dir = PathBuf::from(&options.destination_folder);
    if !dest_dir.exists() {
        fs::create_dir_all(&dest_dir)
            .map_err(|e| format!("Không thể tạo thư mục lưu trữ sao lưu: {}", e))?;
    }

    // Safety guard against recursive copy: destination cannot be inside source directory
    if source.is_dir() {
        if let (Ok(canon_src), Ok(canon_dst)) = (source.canonicalize(), dest_dir.canonicalize()) {
            if canon_dst.starts_with(&canon_src) {
                return Err("Thư mục sao lưu không được nằm bên trong thư mục nguồn cần sao lưu (tránh đệ quy lặp vô tận).".to_string());
            }
        }
    }

    let is_dir = source.is_dir();
    let item_name = source
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "backup_item".to_string());

    let stem = if is_dir {
        item_name.clone()
    } else {
        source
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| item_name.clone())
    };

    let ext = if is_dir {
        None
    } else {
        source
            .extension()
            .map(|e| e.to_string_lossy().to_string())
    };

    let strategy = options.conflict_strategy.unwrap_or_else(|| "auto_rename".to_string());

    let mut target_name = item_name.clone();
    let mut target_path = dest_dir.join(&target_name);

    if target_path.exists() {
        match strategy.as_str() {
            "overwrite" => {
                // target_path remains unchanged
            }
            "timestamp" => {
                let ts = get_timestamp_suffix();
                let candidate_name = if is_dir {
                    format!("{}_{}", item_name, ts)
                } else {
                    match &ext {
                        Some(e) if !e.is_empty() => format!("{}_{}.{}", stem, ts, e),
                        _ => format!("{}_{}", stem, ts),
                    }
                };
                target_name = candidate_name;
                target_path = dest_dir.join(&target_name);
            }
            _ => {
                // "auto_rename" (default numeric increment: (1), (2), ...)
                let mut counter = 1;
                loop {
                    let candidate_name = if is_dir {
                        format!("{} ({})", item_name, counter)
                    } else {
                        match &ext {
                            Some(e) if !e.is_empty() => format!("{} ({}).{}", stem, counter, e),
                            _ => format!("{} ({})", stem, counter),
                        }
                    };
                    let candidate_path = dest_dir.join(&candidate_name);
                    if !candidate_path.exists() {
                        target_name = candidate_name;
                        target_path = candidate_path;
                        break;
                    }
                    counter += 1;
                }
            }
        }
    }

    let mut files_copied = 0u64;
    let skip_ignored = options.skip_ignored.unwrap_or(true);

    if is_dir {
        copy_dir_all(&source, &target_path, skip_ignored, &mut files_copied)?;
    } else {
        fs::copy(&source, &target_path)
            .map_err(|e| format!("Không thể sao chép file: {}", e))?;
        files_copied = 1;
    }

    Ok(BackupResult {
        success: true,
        source_path: source.to_string_lossy().to_string(),
        destination_path: target_path.to_string_lossy().to_string(),
        destination_name: target_name,
        files_copied,
        is_directory: is_dir,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backup_single_file_with_auto_rename() {
        let temp_dir = std::env::temp_dir().join(format!("bookmd_test_backup_file_{}", uuid::Uuid::new_v4()));
        let src_dir = temp_dir.join("src");
        let dst_dir = temp_dir.join("dst");
        fs::create_dir_all(&src_dir).unwrap();
        fs::create_dir_all(&dst_dir).unwrap();

        let src_file = src_dir.join("my_note.md");
        fs::write(&src_file, "# Test Content").unwrap();

        // 1st Backup -> my_note.md
        let res1 = execute_backup(
            None,
            BackupOptions {
                source_path: src_file.to_string_lossy().to_string(),
                destination_folder: dst_dir.to_string_lossy().to_string(),
                conflict_strategy: Some("auto_rename".to_string()),
                skip_ignored: Some(true),
            },
        ).unwrap();
        assert_eq!(res1.destination_name, "my_note.md");
        assert_eq!(res1.files_copied, 1);
        assert!(dst_dir.join("my_note.md").exists());

        // 2nd Backup -> my_note (1).md
        let res2 = execute_backup(
            None,
            BackupOptions {
                source_path: src_file.to_string_lossy().to_string(),
                destination_folder: dst_dir.to_string_lossy().to_string(),
                conflict_strategy: Some("auto_rename".to_string()),
                skip_ignored: Some(true),
            },
        ).unwrap();
        assert_eq!(res2.destination_name, "my_note (1).md");
        assert!(dst_dir.join("my_note (1).md").exists());

        // 3rd Backup -> my_note (2).md
        let res3 = execute_backup(
            None,
            BackupOptions {
                source_path: src_file.to_string_lossy().to_string(),
                destination_folder: dst_dir.to_string_lossy().to_string(),
                conflict_strategy: Some("auto_rename".to_string()),
                skip_ignored: Some(true),
            },
        ).unwrap();
        assert_eq!(res3.destination_name, "my_note (2).md");
        assert!(dst_dir.join("my_note (2).md").exists());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_backup_directory_with_auto_rename_and_skip_ignored() {
        let temp_dir = std::env::temp_dir().join(format!("bookmd_test_backup_dir_{}", uuid::Uuid::new_v4()));
        let src_dir = temp_dir.join("MyWorkspace");
        let dst_dir = temp_dir.join("backup_vault");
        fs::create_dir_all(src_dir.join("sub")).unwrap();
        fs::create_dir_all(src_dir.join("node_modules")).unwrap();
        fs::create_dir_all(&dst_dir).unwrap();

        fs::write(src_dir.join("readme.md"), "# Readme").unwrap();
        fs::write(src_dir.join("sub").join("nested.md"), "# Nested").unwrap();
        fs::write(src_dir.join("node_modules").join("heavy.js"), "// heavy code").unwrap();

        // 1st Backup of directory -> MyWorkspace (should copy 2 files, skipping node_modules)
        let res1 = execute_backup(
            None,
            BackupOptions {
                source_path: src_dir.to_string_lossy().to_string(),
                destination_folder: dst_dir.to_string_lossy().to_string(),
                conflict_strategy: Some("auto_rename".to_string()),
                skip_ignored: Some(true),
            },
        ).unwrap();
        assert_eq!(res1.destination_name, "MyWorkspace");
        assert_eq!(res1.files_copied, 2);
        assert!(dst_dir.join("MyWorkspace").join("readme.md").exists());
        assert!(dst_dir.join("MyWorkspace").join("sub").join("nested.md").exists());
        assert!(!dst_dir.join("MyWorkspace").join("node_modules").exists());

        // 2nd Backup of directory -> MyWorkspace (1)
        let res2 = execute_backup(
            None,
            BackupOptions {
                source_path: src_dir.to_string_lossy().to_string(),
                destination_folder: dst_dir.to_string_lossy().to_string(),
                conflict_strategy: Some("auto_rename".to_string()),
                skip_ignored: Some(true),
            },
        ).unwrap();
        assert_eq!(res2.destination_name, "MyWorkspace (1)");
        assert!(dst_dir.join("MyWorkspace (1)").join("readme.md").exists());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_backup_recursive_guard() {
        let temp_dir = std::env::temp_dir().join(format!("bookmd_test_backup_recur_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();
        let nested_dst = temp_dir.join("sub_backup");

        let res = execute_backup(
            None,
            BackupOptions {
                source_path: temp_dir.to_string_lossy().to_string(),
                destination_folder: nested_dst.to_string_lossy().to_string(),
                conflict_strategy: Some("auto_rename".to_string()),
                skip_ignored: Some(true),
            },
        );
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("tránh đệ quy"));

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
