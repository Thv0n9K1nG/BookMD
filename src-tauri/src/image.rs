use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageResult {
    pub path: String,
    pub relative_path: String,
    pub filename: String,
    pub markdown_reference: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageSaveOptions {
    pub image_dir: Option<String>,
}

/// Save an image from base64 data, following BookMD naming convention:
/// <path-context>_<markdown-file>_<image-index>.<extension>
pub fn save_image(
    workspace_path: &str,
    markdown_file: &str,
    image_data: &str,
    options: Option<ImageSaveOptions>,
) -> Result<ImageResult, AppError> {
    let workspace = Path::new(workspace_path);
    let md_path = Path::new(markdown_file);

    // Determine path context from markdown relative path
    let path_context = build_path_context(md_path);
    let md_stem = md_path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();

    // Determine image directory
    let image_dir = if let Some(ref opts) = options {
        if let Some(ref dir) = opts.image_dir {
            workspace.join(dir)
        } else {
            default_image_dir(workspace, md_path)
        }
    } else {
        default_image_dir(workspace, md_path)
    };

    // Create image directory if needed
    fs::create_dir_all(&image_dir)?;

    // Detect format from base64 data URI prefix
    let (bytes, extension) = decode_image_data(image_data)?;

    // Determine image index
    let image_index = next_image_index(&image_dir, &path_context, &md_stem);

    // Build filename
    let filename = if path_context.is_empty() {
        format!("{}_{}.{}", md_stem, image_index, extension)
    } else {
        format!("{}_{}_{}.{}", path_context, md_stem, image_index, extension)
    };

    let image_path = image_dir.join(&filename);

    // Conflict check
    if image_path.exists() {
        return Err(AppError::ImageConflict(filename));
    }

    // Save image
    fs::write(&image_path, &bytes)?;

    // Calculate relative markdown reference
    let md_abs = workspace.join(md_path);
    let md_dir = md_abs.parent().unwrap_or(workspace);
    let relative = pathdiff_relative(md_dir, &image_path);

    let markdown_reference = format!("![]({})", relative.replace('\\', "/"));

    Ok(ImageResult {
        path: image_path.to_string_lossy().to_string(),
        relative_path: image_path
            .strip_prefix(workspace)
            .unwrap_or(&image_path)
            .to_string_lossy()
            .replace('\\', "/"),
        filename,
        markdown_reference,
    })
}

/// Rename images owned by a markdown file when it is renamed
pub fn rename_images_for_document(
    workspace_path: &str,
    old_md_path: &str,
    new_md_path: &str,
    image_dir: Option<&str>,
) -> Result<Vec<(String, String)>, AppError> {
    let workspace = Path::new(workspace_path);
    let old_md = Path::new(old_md_path);
    let new_md = Path::new(new_md_path);

    let old_context = build_path_context(old_md);
    let old_stem = old_md.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
    let new_context = build_path_context(new_md);
    let new_stem = new_md.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();

    let img_dir = if let Some(dir) = image_dir {
        workspace.join(dir)
    } else {
        default_image_dir(workspace, old_md)
    };

    if !img_dir.exists() {
        return Ok(Vec::new());
    }

    let old_prefix = if old_context.is_empty() {
        format!("{}_", old_stem)
    } else {
        format!("{}_{}_", old_context, old_stem)
    };

    let mut renames = Vec::new();

    for entry in fs::read_dir(&img_dir)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with(&old_prefix) {
            let suffix = &name[old_prefix.len()..];
            let new_name = if new_context.is_empty() {
                format!("{}_{}", new_stem, suffix)
            } else {
                format!("{}_{}_{}", new_context, new_stem, suffix)
            };

            let new_path = img_dir.join(&new_name);
            if new_path.exists() {
                return Err(AppError::ImageConflict(new_name));
            }

            fs::rename(entry.path(), &new_path)?;
            renames.push((name, new_name));
        }
    }

    Ok(renames)
}

// --- Helper functions ---

fn build_path_context(md_relative_path: &Path) -> String {
    if let Some(parent) = md_relative_path.parent() {
        let parts: Vec<String> = parent
            .components()
            .map(|c| c.as_os_str().to_string_lossy().to_string())
            .collect();
        parts.join("_")
    } else {
        String::new()
    }
}

fn default_image_dir(workspace: &Path, md_path: &Path) -> PathBuf {
    // Default: images/ directory next to the markdown file's parent folder
    let md_abs = workspace.join(md_path);
    let md_dir = md_abs.parent().unwrap_or(workspace);
    md_dir.join("images")
}

fn next_image_index(image_dir: &Path, path_context: &str, md_stem: &str) -> u32 {
    let prefix = if path_context.is_empty() {
        format!("{}_", md_stem)
    } else {
        format!("{}_{}_", path_context, md_stem)
    };

    let mut max_index: u32 = 0;
    if let Ok(entries) = fs::read_dir(image_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with(&prefix) {
                // Extract index from filename
                let after_prefix = &name[prefix.len()..];
                if let Some(dot_pos) = after_prefix.rfind('.') {
                    if let Ok(idx) = after_prefix[..dot_pos].parse::<u32>() {
                        max_index = max_index.max(idx);
                    }
                }
            }
        }
    }
    max_index + 1
}

fn decode_image_data(data: &str) -> Result<(Vec<u8>, String), AppError> {
    let engine = base64::engine::general_purpose::STANDARD;

    // Handle data URI format: data:image/png;base64,xxxxx
    if data.starts_with("data:") {
        let parts: Vec<&str> = data.splitn(2, ',').collect();
        if parts.len() != 2 {
            return Err(AppError::InvalidPath("Invalid image data URI".to_string()));
        }
        let meta = parts[0]; // data:image/png;base64
        let b64 = parts[1];

        let extension = if meta.contains("image/png") {
            "png"
        } else if meta.contains("image/jpeg") || meta.contains("image/jpg") {
            "jpg"
        } else if meta.contains("image/webp") {
            "webp"
        } else if meta.contains("image/gif") {
            "gif"
        } else {
            "png" // fallback
        };

        let bytes = engine.decode(b64).map_err(|e| AppError::InvalidPath(e.to_string()))?;
        Ok((bytes, extension.to_string()))
    } else {
        // Raw base64, assume PNG
        let bytes = engine.decode(data).map_err(|e| AppError::InvalidPath(e.to_string()))?;
        Ok((bytes, "png".to_string()))
    }
}

/// Compute relative path from `from_dir` to `to_path`
fn pathdiff_relative(from_dir: &Path, to_path: &Path) -> String {
    // Normalize both paths
    let from = normalize_path(from_dir);
    let to = normalize_path(to_path);

    let from_parts: Vec<&str> = from.split('/').filter(|s| !s.is_empty()).collect();
    let to_parts: Vec<&str> = to.split('/').filter(|s| !s.is_empty()).collect();

    // Find common prefix length
    let common = from_parts
        .iter()
        .zip(to_parts.iter())
        .take_while(|(a, b)| a == b)
        .count();

    let ups = from_parts.len() - common;
    let mut result = Vec::new();
    for _ in 0..ups {
        result.push("..");
    }
    for part in &to_parts[common..] {
        result.push(part);
    }

    result.join("/")
}

fn normalize_path(p: &Path) -> String {
    p.to_string_lossy().replace('\\', "/")
}
