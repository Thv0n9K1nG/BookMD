use serde::{Deserialize, Serialize};
use std::process::Command;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub file: String,
    pub line: u32,
    pub column: Option<u32>,
    pub matched_text: String,
    pub context: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchOptions {
    pub case_sensitive: Option<bool>,
    pub whole_word: Option<bool>,
    pub regex: Option<bool>,
    pub file_pattern: Option<String>,
}

/// ripgrep JSON output structures
#[derive(Debug, Deserialize)]
struct RgMessage {
    #[serde(rename = "type")]
    msg_type: String,
    data: Option<RgData>,
}

#[derive(Debug, Deserialize)]
struct RgData {
    path: Option<RgPath>,
    lines: Option<RgText>,
    line_number: Option<u32>,
    submatches: Option<Vec<RgSubmatch>>,
}

#[derive(Debug, Deserialize)]
struct RgPath {
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RgText {
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RgSubmatch {
    #[serde(rename = "match")]
    match_text: RgText,
    start: usize,
}

/// Search workspace using ripgrep
pub fn search_workspace(
    workspace_path: &str,
    pattern: &str,
    options: Option<SearchOptions>,
) -> Result<Vec<SearchResult>, AppError> {
    let mut cmd = Command::new("rg");
    cmd.arg("--json")
        .arg("--max-count=100")
        .arg("--max-columns=500");

    if let Some(ref opts) = options {
        if opts.case_sensitive == Some(false) {
            cmd.arg("-i");
        }
        if opts.whole_word == Some(true) {
            cmd.arg("-w");
        }
        if opts.regex != Some(true) {
            cmd.arg("--fixed-strings");
        }
        if let Some(ref fp) = opts.file_pattern {
            cmd.arg("-g").arg(fp);
        }
    } else {
        cmd.arg("--fixed-strings");
    }

    cmd.arg(pattern).arg(workspace_path);

    let output = cmd.output().map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            AppError::SearchFailed("ripgrep (rg) not found. Please install ripgrep.".to_string())
        } else {
            AppError::SearchFailed(e.to_string())
        }
    })?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut results: Vec<SearchResult> = Vec::new();
    let workspace = std::path::Path::new(workspace_path);

    for line in stdout.lines() {
        if let Ok(msg) = serde_json::from_str::<RgMessage>(line) {
            if msg.msg_type == "match" {
                if let Some(data) = msg.data {
                    let file = data
                        .path
                        .and_then(|p| p.text)
                        .unwrap_or_default();
                    let file_rel = std::path::Path::new(&file)
                        .strip_prefix(workspace)
                        .map(|p| p.to_string_lossy().replace('\\', "/"))
                        .unwrap_or(file);
                    let context = data
                        .lines
                        .and_then(|l| l.text)
                        .unwrap_or_default()
                        .trim()
                        .to_string();
                    let line_num = data.line_number.unwrap_or(0);
                    let (matched_text, column) = if let Some(subs) = data.submatches {
                        if let Some(first) = subs.first() {
                            (
                                first.match_text.text.clone().unwrap_or_default(),
                                Some(first.start as u32),
                            )
                        } else {
                            (String::new(), None)
                        }
                    } else {
                        (String::new(), None)
                    };

                    results.push(SearchResult {
                        file: file_rel,
                        line: line_num,
                        column,
                        matched_text,
                        context,
                    });
                }
            }
        }
    }

    Ok(results)
}
