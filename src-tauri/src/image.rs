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
    pub doc_relative_path: String,
    pub filename: String,
    pub markdown_reference: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageSaveOptions {
    pub image_dir: Option<String>,
    pub naming_base_dir: Option<String>,
    pub reference_type: Option<String>,
}

/// Save an image from base64 data, following BookMD naming convention:
/// <folder>-<folder>-...-<markdown-stem>_<image-index>.<extension>
pub fn save_image(
    workspace_path: &str,
    markdown_file: &str,
    image_data: &str,
    options: Option<ImageSaveOptions>,
) -> Result<ImageResult, AppError> {
    let workspace = Path::new(workspace_path);
    let md_path = Path::new(markdown_file);

    let naming_base_dir = options.as_ref().and_then(|o| o.naming_base_dir.as_deref());
    let reference_type = options
        .as_ref()
        .and_then(|o| o.reference_type.as_deref())
        .unwrap_or("relative");

    // Determine naming context from markdown relative path and naming base dir
    let (folders, md_stem) = build_naming_context(md_path, naming_base_dir);
    let name_prefix = if folders.is_empty() {
        md_stem
    } else {
        format!("{}-{}", folders.join("-"), md_stem)
    };

    // Determine image directory
    let image_dir = resolve_image_dir(
        workspace,
        md_path,
        options.as_ref().and_then(|o| o.image_dir.as_deref()),
    );

    // Create image directory if needed
    fs::create_dir_all(&image_dir)?;

    // Detect format from base64 data URI prefix
    let (bytes, extension) = decode_image_data(image_data)?;

    // Determine image index with target prefix "<name_prefix>_"
    let image_index = next_image_index(&image_dir, &name_prefix);

    // Build filename: <folders-joined-by-hyphen>-<md_stem>_<image_index>.<extension>
    let filename = format!("{}_{}.{}", name_prefix, image_index, extension);

    let image_path = image_dir.join(&filename);

    // Conflict check
    if image_path.exists() {
        return Err(AppError::ImageConflict(filename));
    }

    // Save image
    fs::write(&image_path, &bytes)?;

    // Calculate relative markdown reference from current document
    let md_abs = workspace.join(md_path);
    let md_dir = md_abs.parent().unwrap_or(workspace);
    let doc_relative_path = pathdiff_relative(md_dir, &image_path).replace('\\', "/");

    let is_absolute = reference_type.eq_ignore_ascii_case("absolute");
    let ref_src = if is_absolute {
        image_path.to_string_lossy().replace('\\', "/")
    } else {
        doc_relative_path.clone()
    };

    let markdown_reference = format!("![]({})", ref_src);

    Ok(ImageResult {
        path: image_path.to_string_lossy().replace('\\', "/"),
        relative_path: image_path
            .strip_prefix(workspace)
            .unwrap_or(&image_path)
            .to_string_lossy()
            .replace('\\', "/"),
        doc_relative_path,
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
    naming_base_dir: Option<&str>,
) -> Result<Vec<(String, String)>, AppError> {
    let workspace = Path::new(workspace_path);
    let old_md = Path::new(old_md_path);
    let new_md = Path::new(new_md_path);

    let (old_folders, old_stem) = build_naming_context(old_md, naming_base_dir);
    let old_prefix = if old_folders.is_empty() {
        format!("{}_", old_stem)
    } else {
        format!("{}-{}_", old_folders.join("-"), old_stem)
    };

    let (new_folders, new_stem) = build_naming_context(new_md, naming_base_dir);
    let new_prefix = if new_folders.is_empty() {
        format!("{}_", new_stem)
    } else {
        format!("{}-{}_", new_folders.join("-"), new_stem)
    };

    let img_dir = resolve_image_dir(workspace, old_md, image_dir);

    if !img_dir.exists() {
        return Ok(Vec::new());
    }

    let mut renames = Vec::new();

    for entry in fs::read_dir(&img_dir)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with(&old_prefix) {
            let suffix = &name[old_prefix.len()..];
            let new_name = format!("{}{}", new_prefix, suffix);

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

fn build_naming_context(
    md_relative_path: &Path,
    naming_base_dir: Option<&str>,
) -> (Vec<String>, String) {
    let md_stem = md_relative_path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();

    let md_norm = md_relative_path.to_string_lossy().replace('\\', "/");
    let effective_rel = if let Some(base) = naming_base_dir {
        let base_norm = base.trim().replace('\\', "/").trim_matches('/').to_string();
        if !base_norm.is_empty() {
            let base_prefix = format!("{}/", base_norm);
            if md_norm.starts_with(&base_prefix) {
                md_norm[base_prefix.len()..].to_string()
            } else if md_norm == base_norm {
                md_norm.clone()
            } else {
                md_norm.clone()
            }
        } else {
            md_norm.clone()
        }
    } else {
        md_norm.clone()
    };

    let p = Path::new(&effective_rel);
    let folders: Vec<String> = if let Some(parent) = p.parent() {
        parent
            .components()
            .map(|c| c.as_os_str().to_string_lossy().to_string())
            .filter(|s| !s.is_empty() && s != ".")
            .collect()
    } else {
        Vec::new()
    };

    (folders, md_stem)
}

fn resolve_image_dir(workspace: &Path, md_path: &Path, image_dir_option: Option<&str>) -> PathBuf {
    if let Some(dir) = image_dir_option {
        let trimmed = dir.trim().replace('\\', "/");
        let clean = trimmed.trim_matches('/');
        if clean.is_empty() || clean == "images" || clean == "." {
            default_image_dir(workspace, md_path)
        } else if trimmed.starts_with("./") {
            let md_abs = workspace.join(md_path);
            let md_dir = md_abs.parent().unwrap_or(workspace);
            md_dir.join(clean)
        } else {
            workspace.join(clean)
        }
    } else {
        default_image_dir(workspace, md_path)
    }
}

fn default_image_dir(workspace: &Path, md_path: &Path) -> PathBuf {
    // Default: images/ directory next to the markdown file's parent folder
    let md_abs = workspace.join(md_path);
    let md_dir = md_abs.parent().unwrap_or(workspace);
    md_dir.join("images")
}

fn next_image_index(image_dir: &Path, name_prefix: &str) -> u32 {
    let target_prefix = format!("{}_", name_prefix);

    let mut max_index: u32 = 0;
    if let Ok(entries) = fs::read_dir(image_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with(&target_prefix) {
                // Extract index from filename
                let after_prefix = &name[target_prefix.len()..];
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

/// Read an image from disk and return as a data URI (data:image/...;base64,...)
pub fn read_image_data_uri(
    workspace_path: &str,
    markdown_file: &str,
    image_src: &str,
) -> Result<String, AppError> {
    let workspace = Path::new(workspace_path);
    let md_path = Path::new(markdown_file);
    let src_clean = image_src.trim();

    // Check if image_src is absolute
    let image_path = if Path::new(src_clean).is_absolute() {
        PathBuf::from(src_clean)
    } else {
        let md_abs = workspace.join(md_path);
        let md_dir = md_abs.parent().unwrap_or(workspace);
        if src_clean.starts_with('/') || src_clean.starts_with('\\') {
            workspace.join(src_clean.trim_start_matches(|c| c == '/' || c == '\\'))
        } else {
            md_dir.join(src_clean)
        }
    };

    if !image_path.exists() {
        // Also try relative to workspace root if not found in doc dir
        let root_try = workspace.join(src_clean.trim_start_matches(|c| c == '/' || c == '\\'));
        if root_try.exists() {
            return read_file_as_data_uri(&root_try);
        }
        return Err(AppError::InvalidPath(format!("Image not found: {:?}", image_path)));
    }

    read_file_as_data_uri(&image_path)
}

fn read_file_as_data_uri(path: &Path) -> Result<String, AppError> {
    let bytes = fs::read(path)?;
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("png")
        .to_lowercase();

    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        "bmp" => "image/bmp",
        _ => "image/png",
    };

    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_pathdiff_relative() {
        let from = Path::new("C:/PROJECT/BookMD/TryHackMe/Docker");
        let to = Path::new("C:/PROJECT/BookMD/img/TryHackMe_Docker_image_1.png");
        let rel = pathdiff_relative(from, to);
        assert_eq!(rel, "../../img/TryHackMe_Docker_image_1.png");

        let from_root = Path::new("C:/PROJECT/BookMD");
        let to_img = Path::new("C:/PROJECT/BookMD/img/Notes_1.png");
        let rel_root = pathdiff_relative(from_root, to_img);
        assert_eq!(rel_root, "img/Notes_1.png");
    }

    #[test]
    fn test_save_image_with_custom_dir() {
        let temp_dir = std::env::temp_dir().join(format!("bookmd_test_{}", uuid::Uuid::new_v4()));
        let ws_str = temp_dir.to_str().unwrap();

        let base64_1px_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

        let res = save_image(
            ws_str,
            "TryHackMe/Docker/image.md",
            base64_1px_png,
            Some(ImageSaveOptions {
                image_dir: Some("img".to_string()),
                naming_base_dir: None,
                reference_type: Some("relative".to_string()),
            }),
        )
        .expect("save_image should succeed with custom image_dir");

        assert_eq!(res.filename, "TryHackMe-Docker-image_1.png");
        assert_eq!(res.relative_path, "img/TryHackMe-Docker-image_1.png");
        assert_eq!(res.markdown_reference, "![](../../img/TryHackMe-Docker-image_1.png)");

        assert!(Path::new(&res.path).exists());

        // Test with naming_base_dir = "TryHackMe"
        let res2 = save_image(
            ws_str,
            "TryHackMe/Docker/image.md",
            base64_1px_png,
            Some(ImageSaveOptions {
                image_dir: Some("img".to_string()),
                naming_base_dir: Some("TryHackMe".to_string()),
                reference_type: Some("relative".to_string()),
            }),
        )
        .expect("save_image should succeed with naming_base_dir");

        assert_eq!(res2.filename, "Docker-image_1.png");

        // Test with reference_type = "absolute"
        let res3 = save_image(
            ws_str,
            "TryHackMe/Docker/image.md",
            base64_1px_png,
            Some(ImageSaveOptions {
                image_dir: Some("img".to_string()),
                naming_base_dir: Some("TryHackMe".to_string()),
                reference_type: Some("absolute".to_string()),
            }),
        )
        .expect("save_image should succeed with absolute reference");

        assert_eq!(res3.filename, "Docker-image_2.png");
        assert_eq!(res3.markdown_reference, format!("![]({})", res3.path));

        // Test with markdown file directly at workspace root
        let res_root = save_image(
            ws_str,
            "root_note.md",
            base64_1px_png,
            Some(ImageSaveOptions {
                image_dir: Some("img".to_string()),
                naming_base_dir: None,
                reference_type: Some("relative".to_string()),
            }),
        )
        .expect("save_image root file should succeed");
        assert_eq!(res_root.filename, "root_note_1.png");
        assert_eq!(res_root.markdown_reference, "![](img/root_note_1.png)");

        // Cleanup
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_save_image_default_in_md_folder() {
        let temp_dir = std::env::temp_dir().join(format!("bookmd_test_{}", uuid::Uuid::new_v4()));
        let ws_str = temp_dir.to_str().unwrap();

        let base64_1px_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

        // When image_dir is "images" or None, save into <folder-of-md>/images/
        let res = save_image(
            ws_str,
            "TryHackMe/Docker/image.md",
            base64_1px_png,
            Some(ImageSaveOptions {
                image_dir: Some("images".to_string()),
                naming_base_dir: None,
                reference_type: Some("relative".to_string()),
            }),
        )
        .expect("save_image should succeed with default images/ dir");

        assert_eq!(res.filename, "TryHackMe-Docker-image_1.png");
        assert_eq!(res.relative_path, "TryHackMe/Docker/images/TryHackMe-Docker-image_1.png");
        assert_eq!(res.doc_relative_path, "images/TryHackMe-Docker-image_1.png");
        assert_eq!(res.markdown_reference, "![](images/TryHackMe-Docker-image_1.png)");

        assert!(Path::new(&res.path).exists());
        assert!(temp_dir.join("TryHackMe/Docker/images/TryHackMe-Docker-image_1.png").exists());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_decode_image_data() {
        let raw = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        let (bytes, ext) = decode_image_data(raw).unwrap();
        assert_eq!(ext, "png");
        assert!(!bytes.is_empty());

        let data_uri = format!("data:image/png;base64,{}", raw);
        let (bytes2, ext2) = decode_image_data(&data_uri).unwrap();
        assert_eq!(ext2, "png");
        assert_eq!(bytes, bytes2);
    }

    #[test]
    fn test_read_image_data_uri() {
        let temp_dir = std::env::temp_dir().join(format!("bookmd_test_{}", uuid::Uuid::new_v4()));
        let ws_str = temp_dir.to_str().unwrap();

        let base64_1px_png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

        let res = save_image(
            ws_str,
            "docs/test.md",
            base64_1px_png,
            Some(ImageSaveOptions {
                image_dir: Some("img".to_string()),
                naming_base_dir: None,
                reference_type: None,
            }),
        )
        .unwrap();

        // Read via relative path from doc
        let data_uri = read_image_data_uri(ws_str, "docs/test.md", &format!("../img/{}", res.filename)).unwrap();
        assert!(data_uri.starts_with("data:image/png;base64,"));

        // Read via workspace-relative path
        let data_uri2 = read_image_data_uri(ws_str, "docs/test.md", &format!("img/{}", res.filename)).unwrap();
        assert!(data_uri2.starts_with("data:image/png;base64,"));

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
