use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::Path;
use std::sync::mpsc;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileChangeEvent {
    pub kind: String,
    pub paths: Vec<String>,
}

/// Start watching a workspace directory for filesystem changes
pub fn start_watcher(
    app_handle: AppHandle,
    workspace_path: String,
) -> Result<RecommendedWatcher, String> {
    let (tx, rx) = mpsc::channel();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let _ = tx.send(event);
            }
        },
        Config::default(),
    )
    .map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(&workspace_path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    // Spawn a thread to handle events and emit to frontend
    let handle = app_handle.clone();
    std::thread::spawn(move || {
        while let Ok(event) = rx.recv() {
            let kind = match event.kind {
                EventKind::Create(_) => "create",
                EventKind::Modify(_) => "modify",
                EventKind::Remove(_) => "remove",
                _ => continue,
            };

            let ws_path = Path::new(&workspace_path);
            let paths: Vec<String> = event
                .paths
                .iter()
                .filter_map(|p| {
                    p.strip_prefix(ws_path)
                        .ok()
                        .map(|rel| rel.to_string_lossy().replace('\\', "/"))
                })
                .collect();

            if !paths.is_empty() {
                let change = FileChangeEvent {
                    kind: kind.to_string(),
                    paths,
                };
                let _ = handle.emit("fs-change", &change);
            }
        }
    });

    Ok(watcher)
}
