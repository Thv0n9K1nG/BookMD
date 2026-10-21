mod error;
mod export;
mod image;
mod search;
mod watcher;
mod workspace;

use notify::RecommendedWatcher;
use std::sync::Mutex;
use tauri::State;

use search::SearchOptions;
use image::ImageSaveOptions;

/// Application state
pub struct AppState {
    pub workspace_path: Mutex<Option<String>>,
    pub watcher: Mutex<Option<RecommendedWatcher>>,
}

fn get_workspace(state: &State<AppState>) -> Result<String, String> {
    state
        .workspace_path
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| {
            serde_json::to_string(&error::ErrorResponse {
                code: "WORKSPACE_NOT_OPEN".to_string(),
                message: "No workspace is currently open".to_string(),
            })
            .unwrap()
        })
}

// ─── Workspace Commands ────────────────────────────────────────

#[tauri::command]
fn workspace_open(
    path: String,
    state: State<AppState>,
    app_handle: tauri::AppHandle,
) -> Result<workspace::WorkspaceInfo, String> {
    let info = workspace::open_workspace(&path).map_err(String::from)?;

    // Store workspace path
    *state.workspace_path.lock().unwrap() = Some(info.path.clone());

    // Allow workspace directory in asset protocol scope
    use tauri::Manager;
    let _ = app_handle.asset_protocol_scope().allow_directory(&info.path, true);

    // Start file watcher
    match watcher::start_watcher(app_handle, info.path.clone()) {
        Ok(w) => {
            *state.watcher.lock().unwrap() = Some(w);
        }
        Err(e) => eprintln!("Warning: Could not start file watcher: {}", e),
    }

    Ok(info)
}

#[tauri::command]
fn workspace_tree(state: State<AppState>) -> Result<Vec<workspace::FileEntry>, String> {
    let ws = get_workspace(&state)?;
    workspace::get_file_tree(&ws).map_err(String::from)
}

// ─── File Commands ────────────────────────────────────────────

#[tauri::command]
fn file_read(relative_path: String, state: State<AppState>) -> Result<String, String> {
    let ws = get_workspace(&state)?;
    workspace::read_file(&ws, &relative_path).map_err(String::from)
}

#[tauri::command]
fn file_write(
    relative_path: String,
    content: String,
    state: State<AppState>,
) -> Result<(), String> {
    let ws = get_workspace(&state)?;
    workspace::write_file(&ws, &relative_path, &content).map_err(String::from)
}

#[tauri::command]
fn file_create(
    relative_path: String,
    kind: String,
    state: State<AppState>,
) -> Result<workspace::FileEntry, String> {
    let ws = get_workspace(&state)?;
    workspace::create_entry(&ws, &relative_path, &kind).map_err(String::from)
}

#[tauri::command]
fn file_rename(
    source: String,
    destination: String,
    state: State<AppState>,
) -> Result<(), String> {
    let ws = get_workspace(&state)?;
    workspace::rename_entry(&ws, &source, &destination).map_err(String::from)
}

#[tauri::command]
fn file_delete(relative_path: String, state: State<AppState>) -> Result<(), String> {
    let ws = get_workspace(&state)?;
    workspace::delete_entry(&ws, &relative_path).map_err(String::from)
}

// ─── Search Commands ────────────────────────────────────────────

#[tauri::command]
fn search_query(
    pattern: String,
    options: Option<SearchOptions>,
    state: State<AppState>,
) -> Result<Vec<search::SearchResult>, String> {
    let ws = get_workspace(&state)?;
    search::search_workspace(&ws, &pattern, options).map_err(String::from)
}

// ─── Image Commands ────────────────────────────────────────────

#[tauri::command]
fn image_save(
    markdown_file: String,
    image_data: String,
    options: Option<ImageSaveOptions>,
    state: State<AppState>,
    app_handle: tauri::AppHandle,
) -> Result<image::ImageResult, String> {
    let ws = get_workspace(&state)?;
    let res = image::save_image(&ws, &markdown_file, &image_data, options).map_err(String::from)?;
    use tauri::Manager;
    let _ = app_handle.asset_protocol_scope().allow_file(&res.path);
    Ok(res)
}

#[tauri::command]
fn image_read_data(
    image_src: String,
    markdown_file: String,
    state: State<AppState>,
) -> Result<String, String> {
    let ws = get_workspace(&state)?;
    image::read_image_data_uri(&ws, &markdown_file, &image_src).map_err(String::from)
}

#[tauri::command]
fn image_rename_for_document(
    old_path: String,
    new_path: String,
    image_dir: Option<String>,
    naming_base_dir: Option<String>,
    state: State<AppState>,
) -> Result<Vec<(String, String)>, String> {
    let ws = get_workspace(&state)?;
    image::rename_images_for_document(
        &ws,
        &old_path,
        &new_path,
        image_dir.as_deref(),
        naming_base_dir.as_deref(),
    )
    .map_err(String::from)
}

// ─── Export Commands ────────────────────────────────────────────

#[tauri::command]
fn export_pdf(
    markdown_file: String,
    html_content: String,
    destination: String,
    state: State<AppState>,
) -> Result<String, String> {
    let ws = get_workspace(&state)?;
    export::export_pdf(&ws, &markdown_file, &html_content, &destination).map_err(String::from)
}

// ─── CLI & Launch Path Handling ─────────────────────────────────

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenTargetResult {
    pub workspace_path: String,
    pub relative_file_path: Option<String>,
    pub file_name: Option<String>,
    pub is_file: bool,
}

pub fn find_target_path_from_args<I, S>(args: I) -> Option<String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    for arg in args.into_iter().skip(1) {
        let s = arg.as_ref();
        if s.starts_with('-') {
            continue;
        }
        let p = std::path::Path::new(s);
        if p.exists() {
            if let Ok(canonical) = p.canonicalize() {
                let canonical_str = canonical.to_string_lossy().to_string();
                let clean = canonical_str.strip_prefix(r"\\?\").unwrap_or(&canonical_str).to_string();
                return Some(clean);
            }
            return Some(s.to_string());
        } else if s.ends_with(".md") || s.ends_with(".markdown") || s.ends_with(".txt") {
            return Some(s.to_string());
        }
    }
    None
}

#[tauri::command]
fn get_cli_launch_path() -> Option<String> {
    find_target_path_from_args(std::env::args())
}

#[tauri::command]
fn resolve_path_target(path: String) -> Result<OpenTargetResult, String> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Err(format!("Đường dẫn không tồn tại: {}", path));
    }
    let canonical = p.canonicalize().map_err(|e| e.to_string())?;
    let canonical_str = canonical.to_string_lossy().to_string();
    let clean_str = canonical_str.strip_prefix(r"\\?\").unwrap_or(&canonical_str).to_string();
    let clean_path = std::path::Path::new(&clean_str);

    if clean_path.is_file() {
        let parent = clean_path
            .parent()
            .ok_or_else(|| "Không tìm thấy thư mục cha".to_string())?;
        let parent_str = parent.to_string_lossy().to_string();
        let file_name = clean_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string());
        Ok(OpenTargetResult {
            workspace_path: parent_str,
            relative_file_path: file_name.clone(),
            file_name,
            is_file: true,
        })
    } else {
        Ok(OpenTargetResult {
            workspace_path: clean_str,
            relative_file_path: None,
            file_name: None,
            is_file: false,
        })
    }
}

// ─── App Entry Point ────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            use tauri::{Emitter, Manager};
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            if let Some(target) = find_target_path_from_args(&argv) {
                let _ = app.emit("open-path-requested", target);
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            workspace_path: Mutex::new(None),
            watcher: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            workspace_open,
            workspace_tree,
            file_read,
            file_write,
            file_create,
            file_rename,
            file_delete,
            search_query,
            image_save,
            image_read_data,
            image_rename_for_document,
            export_pdf,
            get_cli_launch_path,
            resolve_path_target,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
