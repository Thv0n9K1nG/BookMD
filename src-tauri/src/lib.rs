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
) -> Result<image::ImageResult, String> {
    let ws = get_workspace(&state)?;
    image::save_image(&ws, &markdown_file, &image_data, options).map_err(String::from)
}

#[tauri::command]
fn image_rename_for_document(
    old_path: String,
    new_path: String,
    image_dir: Option<String>,
    state: State<AppState>,
) -> Result<Vec<(String, String)>, String> {
    let ws = get_workspace(&state)?;
    image::rename_images_for_document(&ws, &old_path, &new_path, image_dir.as_deref())
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

// ─── App Entry Point ────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
            image_rename_for_document,
            export_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
