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
    let base_trimmed = naming_base_dir
        .map(|s| s.trim().replace('\\', "/"))
        .unwrap_or_default();

    // Default: when naming_base_dir is not provided or empty, name according to markdown file directly
    if base_trimmed.is_empty() {
        return (Vec::new(), md_stem);
    }

    // When naming_base_dir is "/" or ".", calculate naming starting from workspace root
    let effective_rel = if base_trimmed == "/" || base_trimmed == "." {
        md_norm.clone()
    } else {
        let base_norm = base_trimmed.trim_matches('/').to_string();
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

/// Strip Windows verbatim / extended-length prefixes (\\?\ and \\.\) and normalize to '/'
pub fn clean_path_string(path: &Path) -> String {
    let mut s = path.to_string_lossy().to_string();
    if s.starts_with(r"\\?\") || s.starts_with(r"//?/") {
        s = s[4..].to_string();
    } else if s.starts_with(r"\\.\") || s.starts_with(r"//./") {
        s = s[4..].to_string();
    }
    s.replace('\\', "/")
}

/// Check if two paths point to the exact same file on disk (case-insensitive on Windows)
pub fn paths_are_same_file(p1: &Path, p2: &Path) -> bool {
    if p1 == p2 {
        return true;
    }
    let s1 = clean_path_string(p1);
    let s2 = clean_path_string(p2);
    if s1.eq_ignore_ascii_case(&s2) {
        return true;
    }
    if let (Ok(c1), Ok(c2)) = (p1.canonicalize(), p2.canonicalize()) {
        let clean1 = clean_path_string(&c1);
        let clean2 = clean_path_string(&c2);
        if clean1.eq_ignore_ascii_case(&clean2) {
            return true;
        }
    }
    false
}

/// Compute relative path from `from_dir` to `to_path` with Windows drive & UNC prefix safety
pub fn pathdiff_relative(from_dir: &Path, to_path: &Path) -> String {
    let from_clean = clean_path_string(from_dir);
    let to_clean = clean_path_string(to_path);

    let from_parts: Vec<&str> = from_clean.split('/').filter(|s| !s.is_empty()).collect();
    let to_parts: Vec<&str> = to_clean.split('/').filter(|s| !s.is_empty()).collect();

    // Check if both paths specify Windows drive letters (e.g. "C:")
    if let (Some(f_first), Some(t_first)) = (from_parts.first(), to_parts.first()) {
        if f_first.ends_with(':') && t_first.ends_with(':') {
            if !f_first.eq_ignore_ascii_case(t_first) {
                // Different drives: cannot be relative, return clean absolute path
                return to_clean;
            }
        }
    }

    // Find common prefix length (case-insensitive for Windows file paths)
    let common = from_parts
        .iter()
        .zip(to_parts.iter())
        .take_while(|(a, b)| a.eq_ignore_ascii_case(b))
        .count();

    let ups = from_parts.len() - common;
    let mut result = Vec::new();
    for _ in 0..ups {
        result.push("..");
    }
    for part in &to_parts[common..] {
        result.push(*part);
    }

    if result.is_empty() {
        ".".to_string()
    } else {
        result.join("/")
    }
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

// ─── Document Image Consolidation & Standardization ──────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsolidateScanItem {
    pub raw_src: String,
    pub decoded_src: String,
    pub resolved_path: Option<String>,
    pub exists: bool,
    pub is_remote: bool,
    pub is_already_in_place: bool,
    pub new_filename: String,
    pub new_relative_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsolidateScanResult {
    pub markdown_file: String,
    pub name_prefix: String,
    pub naming_base_dir_display: String,
    pub target_dir_path: String,
    pub target_dir_display: String,
    pub items: Vec<ConsolidateScanItem>,
    pub valid_count: usize,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsolidateScanOptions {
    pub markdown_file: String,
    pub content: String,
    pub image_dir: Option<String>,
    pub naming_base_dir: Option<String>,
    pub custom_target_dir: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsolidateExecuteOptions {
    pub markdown_file: String,
    pub content: String,
    pub image_dir: Option<String>,
    pub naming_base_dir: Option<String>,
    pub custom_target_dir: Option<String>,
    pub operation: Option<String>, // "copy" (default) or "move"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsolidateExecuteResult {
    pub updated_content: String,
    pub processed_count: usize,
    pub target_dir_path: String,
    pub items: Vec<ConsolidateScanItem>,
}

fn robust_copy_with_retry(src: &Path, dst: &Path) -> Result<(), AppError> {
    let mut attempts = 0;
    loop {
        match fs::copy(src, dst) {
            Ok(_) => return Ok(()),
            Err(e) => {
                attempts += 1;
                if attempts >= 5 {
                    return Err(AppError::IoError(e));
                }
                std::thread::sleep(std::time::Duration::from_millis(60));
            }
        }
    }
}

fn robust_delete_file_with_retry(path: &Path) -> Result<(), AppError> {
    let mut attempts = 0;
    loop {
        match fs::remove_file(path) {
            Ok(_) => return Ok(()),
            Err(e) => {
                attempts += 1;
                if attempts >= 5 {
                    if let Ok(_) = trash::delete(path) {
                        return Ok(());
                    }
                    return Err(AppError::IoError(e));
                }
                std::thread::sleep(std::time::Duration::from_millis(60));
            }
        }
    }
}

fn robust_rename_or_copy_move(src: &Path, dst: &Path) -> Result<(), AppError> {
    match fs::rename(src, dst) {
        Ok(_) => Ok(()),
        Err(_) => {
            robust_copy_with_retry(src, dst)?;
            let _ = robust_delete_file_with_retry(src);
            Ok(())
        }
    }
}

#[derive(Debug, Clone)]
struct ImageRefMatch {
    tag_start: usize,
    src_start: usize,
    src_end: usize,
    raw_src: String,
}

fn find_all_image_references(content: &str) -> Vec<ImageRefMatch> {
    let mut matches = Vec::new();

    // 1. Markdown syntax: ![alt](src "title") or ![alt](src)
    let md_re = regex::Regex::new(r#"!\[[^\]]*\]\((?P<src>[^)\s]+)(?:\s+["'][^"']*["'])?\)"#).unwrap();
    for cap in md_re.captures_iter(content) {
        if let Some(src_match) = cap.name("src") {
            let tag_start = cap.get(0).unwrap().start();
            matches.push(ImageRefMatch {
                tag_start,
                src_start: src_match.start(),
                src_end: src_match.end(),
                raw_src: src_match.as_str().trim().to_string(),
            });
        }
    }

    // 2. HTML syntax: <img ... src="..." ...>
    let html_re = regex::Regex::new(r#"(?i)<img\b[^>]*?\bsrc=["'](?P<src>[^"']+)["'][^>]*?>"#).unwrap();
    for cap in html_re.captures_iter(content) {
        if let Some(src_match) = cap.name("src") {
            let tag_start = cap.get(0).unwrap().start();
            matches.push(ImageRefMatch {
                tag_start,
                src_start: src_match.start(),
                src_end: src_match.end(),
                raw_src: src_match.as_str().trim().to_string(),
            });
        }
    }

    // Sort by position in document (top to bottom)
    matches.sort_by_key(|m| m.tag_start);
    matches
}

pub fn scan_document_images(
    workspace_path: &str,
    options: ConsolidateScanOptions,
) -> Result<ConsolidateScanResult, AppError> {
    let workspace = Path::new(workspace_path);
    let md_path = Path::new(&options.markdown_file);

    let (folders, md_stem) = build_naming_context(md_path, options.naming_base_dir.as_deref());
    let name_prefix = if folders.is_empty() {
        md_stem.clone()
    } else {
        format!("{}-{}", folders.join("-"), md_stem)
    };

    let naming_base_dir_display = match options.naming_base_dir.as_deref() {
        Some(s) if !s.trim().is_empty() => {
            let trimmed = s.trim();
            if trimmed == "/" || trimmed == "." {
                "Thư mục gốc Workspace (/)".to_string()
            } else {
                format!("Thư mục ({})", trimmed)
            }
        }
        _ => "Mặc định (theo tên file Markdown đang viết)".to_string(),
    };

    // Determine target directory
    let target_dir = if let Some(ref custom) = options.custom_target_dir {
        let trimmed = custom.trim().replace('\\', "/");
        if Path::new(&trimmed).is_absolute() {
            PathBuf::from(&trimmed)
        } else {
            workspace.join(trimmed)
        }
    } else {
        resolve_image_dir(workspace, md_path, options.image_dir.as_deref())
    };

    let target_dir_path = clean_path_string(&target_dir);
    let target_dir_display = if target_dir.starts_with(workspace) {
        target_dir
            .strip_prefix(workspace)
            .unwrap_or(&target_dir)
            .to_string_lossy()
            .replace('\\', "/")
    } else {
        target_dir_path.clone()
    };

    let md_abs = workspace.join(md_path);
    let md_dir = md_abs.parent().unwrap_or(workspace);

    let all_matches = find_all_image_references(&options.content);

    let mut items = Vec::new();
    let mut assigned_canonical: std::collections::HashMap<String, (String, String)> = std::collections::HashMap::new();
    let mut valid_counter = 0;

    for m in &all_matches {
        let raw_src = m.raw_src.clone();
        let clean = raw_src.trim();
        let is_remote = clean.starts_with("http://")
            || clean.starts_with("https://")
            || clean.starts_with("data:")
            || clean.starts_with("blob:")
            || clean.starts_with("asset:")
            || clean.starts_with("tauri:");

        let decoded_src = clean.replace("%20", " ");

        let mut resolved_path = None;
        let mut exists = false;
        let mut canon_key = String::new();

        if !is_remote {
            let candidate = if Path::new(&decoded_src).is_absolute() {
                PathBuf::from(&decoded_src)
            } else if decoded_src.starts_with('/') || decoded_src.starts_with('\\') {
                workspace.join(decoded_src.trim_start_matches(|c| c == '/' || c == '\\'))
            } else {
                md_dir.join(&decoded_src)
            };

            if candidate.exists() && candidate.is_file() {
                resolved_path = Some(clean_path_string(&candidate));
                let canon = candidate.canonicalize().unwrap_or_else(|_| candidate.clone());
                canon_key = clean_path_string(&canon).to_lowercase();
                exists = true;
            } else {
                // Try workspace root fallback
                let root_try = workspace.join(decoded_src.trim_start_matches(|c| c == '/' || c == '\\'));
                if root_try.exists() && root_try.is_file() {
                    resolved_path = Some(clean_path_string(&root_try));
                    let canon = root_try.canonicalize().unwrap_or_else(|_| root_try.clone());
                    canon_key = clean_path_string(&canon).to_lowercase();
                    exists = true;
                }
            }
        }

        let mut is_already_in_place = false;
        let mut new_filename = String::new();
        let mut new_relative_path = String::new();

        if exists && !is_remote {
            if let Some((existing_fname, existing_rel)) = assigned_canonical.get(&canon_key) {
                // Duplicate reference to the SAME image on disk: reuse the already assigned filename and relative path!
                new_filename = existing_fname.clone();
                new_relative_path = existing_rel.clone();
                let target_file_path = target_dir.join(&new_filename);
                if let Some(ref res_p) = resolved_path {
                    if paths_are_same_file(Path::new(res_p), &target_file_path) {
                        is_already_in_place = true;
                    }
                }
            } else {
                valid_counter += 1;
                let ext = resolved_path
                    .as_ref()
                    .and_then(|p| Path::new(p).extension().and_then(|e| e.to_str()))
                    .unwrap_or("png")
                    .to_lowercase();

                new_filename = format!("{}_{}.{}", name_prefix, valid_counter, ext);
                let target_file_path = target_dir.join(&new_filename);
                new_relative_path = pathdiff_relative(md_dir, &target_file_path).replace('\\', "/");

                if let Some(ref res_p) = resolved_path {
                    if paths_are_same_file(Path::new(res_p), &target_file_path) {
                        is_already_in_place = true;
                    }
                }

                assigned_canonical.insert(canon_key.clone(), (new_filename.clone(), new_relative_path.clone()));
            }
        }

        items.push(ConsolidateScanItem {
            raw_src,
            decoded_src,
            resolved_path,
            exists,
            is_remote,
            is_already_in_place,
            new_filename,
            new_relative_path,
        });
    }

    let valid_count = valid_counter;

    Ok(ConsolidateScanResult {
        markdown_file: options.markdown_file,
        name_prefix,
        naming_base_dir_display,
        target_dir_path,
        target_dir_display,
        items,
        valid_count,
    })
}

pub fn execute_consolidate_images(
    workspace_path: &str,
    options: ConsolidateExecuteOptions,
) -> Result<ConsolidateExecuteResult, AppError> {
    let scan_opts = ConsolidateScanOptions {
        markdown_file: options.markdown_file.clone(),
        content: options.content.clone(),
        image_dir: options.image_dir.clone(),
        naming_base_dir: options.naming_base_dir.clone(),
        custom_target_dir: options.custom_target_dir.clone(),
    };

    let scan = scan_document_images(workspace_path, scan_opts)?;
    let target_dir = Path::new(&scan.target_dir_path);

    if scan.valid_count > 0 && !target_dir.exists() {
        fs::create_dir_all(target_dir)?;
    }

    // Default operation is "move" (unless explicitly set to "copy")
    let is_move = options
        .operation
        .as_deref()
        .map(|op| !op.eq_ignore_ascii_case("copy"))
        .unwrap_or(true);

    // 1. Collect unique disk tasks: (canonical_src_path) -> (src_path, target_filename, target_file_path)
    let mut unique_tasks: Vec<(PathBuf, String, PathBuf)> = Vec::new();
    let mut seen_task_keys: std::collections::HashSet<String> = std::collections::HashSet::new();

    for item in &scan.items {
        if item.exists && !item.is_remote && !item.new_filename.is_empty() {
            if let Some(ref src_str) = item.resolved_path {
                let src_path = PathBuf::from(src_str);
                let target_file = target_dir.join(&item.new_filename);
                let task_key = clean_path_string(&src_path.canonicalize().unwrap_or_else(|_| src_path.clone())).to_lowercase();
                if seen_task_keys.insert(task_key) {
                    unique_tasks.push((src_path, item.new_filename.clone(), target_file));
                }
            }
        }
    }

    // 2. Perform disk operations using Two-Phase Staging to prevent overwrite collisions
    let tasks_needing_disk_op: Vec<&(PathBuf, String, PathBuf)> = unique_tasks
        .iter()
        .filter(|(src, _, dst)| !paths_are_same_file(src, dst))
        .collect();

    if !tasks_needing_disk_op.is_empty() {
        // Create staging directory inside target_dir
        let stage_dir = target_dir.join(format!(".bmd_staging_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&stage_dir)?;

        let mut staged_files: Vec<(PathBuf, PathBuf)> = Vec::new();
        // (temp_staged_path, final_target_path)

        // Phase 1: Move/copy all source files into stage_dir
        for (idx, (src_path, target_fname, target_path)) in tasks_needing_disk_op.iter().enumerate() {
            let temp_staged = stage_dir.join(format!("stage_{}_{}", idx, target_fname));
            let same_dir = src_path
                .parent()
                .map(|p| paths_are_same_file(p, target_dir))
                .unwrap_or(false);

            if is_move && same_dir {
                // Move within same directory: rename into staging folder
                robust_rename_or_copy_move(src_path, &temp_staged)?;
            } else if is_move {
                // Move across directories: copy to staging folder, delete source
                robust_copy_with_retry(src_path, &temp_staged)?;
                let _ = robust_delete_file_with_retry(src_path);
            } else {
                // Copy mode: copy to staging folder, keep source
                robust_copy_with_retry(src_path, &temp_staged)?;
            }
            staged_files.push((temp_staged, target_path.clone()));
        }

        // Phase 2: Move all staged files to their final destinations
        for (temp_staged, final_target) in &staged_files {
            if final_target.exists() {
                let _ = robust_delete_file_with_retry(final_target);
            }
            robust_rename_or_copy_move(temp_staged, final_target)?;
        }

        // Clean up staging directory
        let _ = fs::remove_dir_all(&stage_dir);
    }

    let processed_count = unique_tasks.len();

    // 3. Update Markdown content without cascading collisions
    let all_matches = find_all_image_references(&options.content);
    let mut updated_content = options.content.clone();

    // Iterate matches in REVERSE order (from bottom of document to top)
    for (idx, m) in all_matches.iter().enumerate().rev() {
        if let Some(item) = scan.items.get(idx) {
            if item.exists && !item.is_remote && !item.new_relative_path.is_empty() {
                if m.src_start <= m.src_end && m.src_end <= updated_content.len() {
                    updated_content.replace_range(m.src_start..m.src_end, &item.new_relative_path);
                }
            }
        }
    }

    Ok(ConsolidateExecuteResult {
        updated_content,
        processed_count,
        target_dir_path: scan.target_dir_path,
        items: scan.items,
    })
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

        // Default: naming_base_dir is None -> image named after markdown file directly
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

        assert_eq!(res.filename, "image_1.png");
        assert_eq!(res.relative_path, "img/image_1.png");
        assert_eq!(res.markdown_reference, "![](../../img/image_1.png)");

        assert!(Path::new(&res.path).exists());

        // Test with naming_base_dir = "/" (root workspace)
        let res_ws = save_image(
            ws_str,
            "TryHackMe/Docker/image.md",
            base64_1px_png,
            Some(ImageSaveOptions {
                image_dir: Some("img".to_string()),
                naming_base_dir: Some("/".to_string()),
                reference_type: Some("relative".to_string()),
            }),
        )
        .expect("save_image should succeed with root workspace naming_base_dir");

        assert_eq!(res_ws.filename, "TryHackMe-Docker-image_1.png");

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

        assert_eq!(res.filename, "image_1.png");
        assert_eq!(res.relative_path, "TryHackMe/Docker/images/image_1.png");
        assert_eq!(res.doc_relative_path, "images/image_1.png");
        assert_eq!(res.markdown_reference, "![](images/image_1.png)");

        assert!(Path::new(&res.path).exists());
        assert!(temp_dir.join("TryHackMe/Docker/images/image_1.png").exists());

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

    #[test]
    fn test_consolidate_images_scan_and_execute() {
        let temp_dir = std::env::temp_dir().join(format!("bookmd_test_consolidate_{}", uuid::Uuid::new_v4()));
        let ws_str = temp_dir.to_str().unwrap();

        // Create doc dir and scattered images
        let doc_dir = temp_dir.join("guides");
        let scattered1 = temp_dir.join("assets").join("images");
        let scattered2 = temp_dir.join("temp_photos");
        fs::create_dir_all(&doc_dir).unwrap();
        fs::create_dir_all(&scattered1).unwrap();
        fs::create_dir_all(&scattered2).unwrap();

        let img1 = scattered1.join("screen.png");
        let img2 = scattered2.join("diagram.jpg");
        fs::write(&img1, b"fake png").unwrap();
        fs::write(&img2, b"fake jpg").unwrap();

        let content = format!(
            "# Note\n\n![Image 1](../assets/images/screen.png)\n<img src='../temp_photos/diagram.jpg' alt='Image 2' width='300'/>\n![Remote](https://example.com/logo.png)\n![Missing](not_found.png)"
        );

        // 1. Scan
        let scan_res = scan_document_images(
            ws_str,
            ConsolidateScanOptions {
                markdown_file: "guides/note.md".to_string(),
                content: content.clone(),
                image_dir: Some("images".to_string()),
                naming_base_dir: None,
                custom_target_dir: None,
            },
        ).unwrap();

        assert_eq!(scan_res.name_prefix, "note");
        assert_eq!(scan_res.valid_count, 2);
        assert_eq!(scan_res.items.len(), 4);

        // First item (screen.png)
        assert_eq!(scan_res.items[0].exists, true);
        assert_eq!(scan_res.items[0].new_filename, "note_1.png");
        assert_eq!(scan_res.items[0].new_relative_path, "images/note_1.png");

        // Second item (diagram.jpg)
        assert_eq!(scan_res.items[1].exists, true);
        assert_eq!(scan_res.items[1].new_filename, "note_2.jpg");
        assert_eq!(scan_res.items[1].new_relative_path, "images/note_2.jpg");

        // Remote item
        assert_eq!(scan_res.items[2].is_remote, true);
        assert_eq!(scan_res.items[2].exists, false);

        // Missing item
        assert_eq!(scan_res.items[3].exists, false);

        // 2. Execute
        let exec_res = execute_consolidate_images(
            ws_str,
            ConsolidateExecuteOptions {
                markdown_file: "guides/note.md".to_string(),
                content,
                image_dir: Some("images".to_string()),
                naming_base_dir: None,
                custom_target_dir: None,
                operation: Some("copy".to_string()),
            },
        ).unwrap();

        assert_eq!(exec_res.processed_count, 2);
        let target_dir = doc_dir.join("images");
        assert!(target_dir.join("note_1.png").exists());
        assert!(target_dir.join("note_2.jpg").exists());

        // Check updated content
        assert!(exec_res.updated_content.contains("![Image 1](images/note_1.png)"));
        assert!(exec_res.updated_content.contains("src='images/note_2.jpg'"));
        assert!(exec_res.updated_content.contains("https://example.com/logo.png"));
        assert!(exec_res.updated_content.contains("not_found.png"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_pathdiff_with_unc_and_windows_drive() {
        let from_unc = Path::new(r"\\?\C:\Users\hongo\Downloads\test\test\a");
        let to_normal = Path::new(r"C:\Users\hongo\Downloads\test\test\a\images\a_1.png");
        let rel = pathdiff_relative(from_unc, to_normal);
        assert_eq!(rel, "images/a_1.png");

        let from_lower = Path::new(r"c:\Users\hongo\docs");
        let to_upper = Path::new(r"C:\Users\hongo\docs\images\pic.png");
        let rel2 = pathdiff_relative(from_lower, to_upper);
        assert_eq!(rel2, "images/pic.png");
    }

    #[test]
    fn test_consolidate_permutation_move_and_duplicates() {
        let temp_dir = std::env::temp_dir().join(format!("bookmd_test_perm_{}", uuid::Uuid::new_v4()));
        let ws_str = temp_dir.to_str().unwrap();

        let doc_dir = temp_dir.join("docs");
        let images_dir = doc_dir.join("images");
        fs::create_dir_all(&images_dir).unwrap();

        // 3 images currently in images/: note_3.png, note_1.png, note_2.png
        let img1 = images_dir.join("note_1.png");
        let img2 = images_dir.join("note_2.png");
        let img3 = images_dir.join("note_3.png");

        fs::write(&img1, b"CONTENT OF OLD NOTE_1").unwrap();
        fs::write(&img2, b"CONTENT OF OLD NOTE_2").unwrap();
        fs::write(&img3, b"CONTENT OF OLD NOTE_3").unwrap();

        // Document references them in permutation order: 3, then 1, then 2, plus duplicate 1!
        let content = format!(
            "# Test Permutation\n\n![Third](images/note_3.png)\n![First](images/note_1.png)\n![Second](images/note_2.png)\n![First Again](images/note_1.png)\n"
        );

        // 1. Scan:
        // note_3 -> note_1.png
        // note_1 -> note_2.png
        // note_2 -> note_3.png
        // note_1 (duplicate) -> note_2.png!
        let scan = scan_document_images(
            ws_str,
            ConsolidateScanOptions {
                markdown_file: "docs/note.md".to_string(),
                content: content.clone(),
                image_dir: Some("images".to_string()),
                naming_base_dir: None,
                custom_target_dir: None,
            },
        ).unwrap();

        assert_eq!(scan.valid_count, 3); // 3 unique valid files
        assert_eq!(scan.items.len(), 4); // 4 references in doc

        assert_eq!(scan.items[0].new_filename, "note_1.png");
        assert_eq!(scan.items[1].new_filename, "note_2.png");
        assert_eq!(scan.items[2].new_filename, "note_3.png");
        // Duplicate reference reuses note_2.png
        assert_eq!(scan.items[3].new_filename, "note_2.png");

        // 2. Execute with move = true
        let exec = execute_consolidate_images(
            ws_str,
            ConsolidateExecuteOptions {
                markdown_file: "docs/note.md".to_string(),
                content: content.clone(),
                image_dir: Some("images".to_string()),
                naming_base_dir: None,
                custom_target_dir: None,
                operation: Some("move".to_string()),
            },
        ).unwrap();

        // Check updated Markdown:
        assert!(exec.updated_content.contains("![Third](images/note_1.png)"));
        assert!(exec.updated_content.contains("![First](images/note_2.png)"));
        assert!(exec.updated_content.contains("![Second](images/note_3.png)"));
        assert!(exec.updated_content.contains("![First Again](images/note_2.png)"));

        // Verify content integrity of physical files on disk:
        // note_1.png MUST have old note_3's content!
        let c1 = fs::read_to_string(images_dir.join("note_1.png")).unwrap();
        assert_eq!(c1, "CONTENT OF OLD NOTE_3");

        // note_2.png MUST have old note_1's content!
        let c2 = fs::read_to_string(images_dir.join("note_2.png")).unwrap();
        assert_eq!(c2, "CONTENT OF OLD NOTE_1");

        // note_3.png MUST have old note_2's content!
        let c3 = fs::read_to_string(images_dir.join("note_3.png")).unwrap();
        assert_eq!(c3, "CONTENT OF OLD NOTE_2");

        // 3. Execute a SECOND TIME on the updated content:
        // Must be stable (already in place), zero corruption!
        let exec_second = execute_consolidate_images(
            ws_str,
            ConsolidateExecuteOptions {
                markdown_file: "docs/note.md".to_string(),
                content: exec.updated_content.clone(),
                image_dir: Some("images".to_string()),
                naming_base_dir: None,
                custom_target_dir: None,
                operation: Some("move".to_string()),
            },
        ).unwrap();

        assert_eq!(exec_second.updated_content, exec.updated_content);
        assert_eq!(fs::read_to_string(images_dir.join("note_1.png")).unwrap(), "CONTENT OF OLD NOTE_3");
        assert_eq!(fs::read_to_string(images_dir.join("note_2.png")).unwrap(), "CONTENT OF OLD NOTE_1");
        assert_eq!(fs::read_to_string(images_dir.join("note_3.png")).unwrap(), "CONTENT OF OLD NOTE_2");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_consolidate_on_user_tmp_directory() {
        let tmp_root = Path::new(r"C:\Users\hongo\tmp");
        if !tmp_root.exists() {
            return;
        }

        let test_folder = tmp_root.join(format!("bookmd_test_{}", uuid::Uuid::new_v4()));
        let doc_dir = test_folder.join("nested").join("docs");
        let images_dir = doc_dir.join("images");
        fs::create_dir_all(&images_dir).unwrap();

        let img_a = images_dir.join("a_3.png");
        let img_b = images_dir.join("a_1.png");
        let img_c = images_dir.join("a_2.png");

        fs::write(&img_a, b"IMG_A_DATA_ORIGINAL_3").unwrap();
        fs::write(&img_b, b"IMG_B_DATA_ORIGINAL_1").unwrap();
        fs::write(&img_c, b"IMG_C_DATA_ORIGINAL_2").unwrap();

        let md_content = "# Doc\n\n![A](images/a_3.png)\n![B](images/a_1.png)\n![C](images/a_2.png)\n![B duplicate](images/a_1.png)\n";
        let md_file_path = doc_dir.join("a.md");
        fs::write(&md_file_path, md_content).unwrap();

        let ws_str = test_folder.to_str().unwrap();

        // Scan
        let scan = scan_document_images(
            ws_str,
            ConsolidateScanOptions {
                markdown_file: "nested/docs/a.md".to_string(),
                content: md_content.to_string(),
                image_dir: Some("images".to_string()),
                naming_base_dir: None,
                custom_target_dir: None,
            },
        ).unwrap();

        assert_eq!(scan.valid_count, 3);
        assert_eq!(scan.items.len(), 4);
        assert_eq!(scan.items[0].new_filename, "a_1.png");
        assert_eq!(scan.items[1].new_filename, "a_2.png");
        assert_eq!(scan.items[2].new_filename, "a_3.png");
        assert_eq!(scan.items[3].new_filename, "a_2.png"); // duplicate reuses a_2.png

        // Execute move
        let exec = execute_consolidate_images(
            ws_str,
            ConsolidateExecuteOptions {
                markdown_file: "nested/docs/a.md".to_string(),
                content: md_content.to_string(),
                image_dir: Some("images".to_string()),
                naming_base_dir: None,
                custom_target_dir: None,
                operation: Some("move".to_string()),
            },
        ).unwrap();

        assert_eq!(fs::read_to_string(images_dir.join("a_1.png")).unwrap(), "IMG_A_DATA_ORIGINAL_3");
        assert_eq!(fs::read_to_string(images_dir.join("a_2.png")).unwrap(), "IMG_B_DATA_ORIGINAL_1");
        assert_eq!(fs::read_to_string(images_dir.join("a_3.png")).unwrap(), "IMG_C_DATA_ORIGINAL_2");

        assert!(exec.updated_content.contains("![A](images/a_1.png)"));
        assert!(exec.updated_content.contains("![B](images/a_2.png)"));
        assert!(exec.updated_content.contains("![C](images/a_3.png)"));
        assert!(exec.updated_content.contains("![B duplicate](images/a_2.png)"));

        // Clean up test folder
        let _ = fs::remove_dir_all(&test_folder);
    }
}
