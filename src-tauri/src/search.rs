use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub file: String,
    pub line: u32,
    pub column: Option<u32>,
    pub match_length: Option<u32>,
    pub matched_text: String,
    pub line_content: String,
    pub line_before: Option<String>,
    pub line_after: Option<String>,
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

/// Search workspace files natively in Rust (fast, reliable, zero external dependencies)
pub fn search_workspace(
    workspace_path: &str,
    pattern: &str,
    options: Option<SearchOptions>,
) -> Result<Vec<SearchResult>, AppError> {
    let query = pattern.trim();
    if query.is_empty() {
        return Ok(Vec::new());
    }

    let root = Path::new(workspace_path);
    if !root.exists() {
        return Err(AppError::WorkspaceNotOpen);
    }

    let is_regex = options.as_ref().and_then(|o| o.regex).unwrap_or(false);
    let whole_word = options.as_ref().and_then(|o| o.whole_word).unwrap_or(false);
    let case_sensitive = options.as_ref().and_then(|o| o.case_sensitive).unwrap_or(false);
    let file_pattern = options.as_ref().and_then(|o| o.file_pattern.clone());

    let regex_pattern = if is_regex {
        if whole_word {
            format!(r"\b(?:{})\b", query)
        } else {
            query.to_string()
        }
    } else {
        let escaped = regex::escape(query);
        if whole_word {
            format!(r"\b{}\b", escaped)
        } else {
            escaped
        }
    };

    let re = match regex::RegexBuilder::new(&regex_pattern)
        .case_insensitive(!case_sensitive)
        .build()
    {
        Ok(r) => r,
        Err(e) => return Err(AppError::SearchFailed(format!("Invalid search pattern: {}", e))),
    };

    let mut results: Vec<SearchResult> = Vec::new();
    let max_results = 500;

    // Common binary extensions to skip reading
    let binary_extensions = [
        "png", "jpg", "jpeg", "gif", "ico", "webp", "bmp", "tiff", "svg",
        "pdf", "exe", "dll", "so", "dylib", "zip", "tar", "gz", "7z", "rar",
        "woff", "woff2", "ttf", "eot", "mp3", "mp4", "wav", "avi", "mov",
    ];

    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            if e.file_type().is_dir() {
                // Ignore heavy or hidden folders
                !(name.starts_with('.')
                    || name == "node_modules"
                    || name == "target"
                    || name == "dist"
                    || name == "build")
            } else {
                !name.starts_with('.')
            }
        })
    {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();

        // Skip binary files
        if let Some(ext) = path.extension().and_then(|ext| ext.to_str()) {
            let ext_lower = ext.to_lowercase();
            if binary_extensions.contains(&ext_lower.as_str()) {
                continue;
            }
        }

        // Check optional file pattern
        if let Some(ref fp) = file_pattern {
            let filename = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if !filename.to_lowercase().contains(&fp.to_lowercase()) {
                continue;
            }
        }

        // Compute relative path from workspace root
        let rel_path = match path.strip_prefix(root) {
            Ok(p) => p.to_string_lossy().replace('\\', "/"),
            Err(_) => path.to_string_lossy().replace('\\', "/"),
        };

        // Read file content
        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue, // Skip unreadable/non-utf8 files
        };

        let lines: Vec<&str> = content.lines().collect();
        for (idx, &line) in lines.iter().enumerate() {
            if let Some(mat) = re.find(line) {
                let line_num = (idx + 1) as u32;
                let col = (mat.start() + 1) as u32;
                let match_len = (mat.end() - mat.start()) as u32;
                let matched_text = mat.as_str().to_string();
                let line_content = line.to_string();

                let line_before = if idx > 0 {
                    Some(lines[idx - 1].to_string())
                } else {
                    None
                };

                let line_after = if idx + 1 < lines.len() {
                    Some(lines[idx + 1].to_string())
                } else {
                    None
                };

                results.push(SearchResult {
                    file: rel_path.clone(),
                    line: line_num,
                    column: Some(col),
                    match_length: Some(match_len),
                    matched_text,
                    line_content: line_content.clone(),
                    line_before,
                    line_after,
                    context: line_content,
                });

                if results.len() >= max_results {
                    return Ok(results);
                }
            }
        }
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_search_workspace_native_with_context() {
        let temp_dir = std::env::temp_dir().join(format!("bookmd_search_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        let file1_path = temp_dir.join("test.md");
        let mut file1 = File::create(&file1_path).unwrap();
        writeln!(file1, "Line 1 introduction").unwrap();
        writeln!(file1, "Line 2 target pattern here").unwrap();
        writeln!(file1, "Line 3 conclusion").unwrap();

        let results = search_workspace(
            &temp_dir.to_string_lossy(),
            "target pattern",
            None,
        ).unwrap();

        assert_eq!(results.len(), 1);
        let res = &results[0];
        assert_eq!(res.line, 2);
        assert_eq!(res.matched_text, "target pattern");
        assert_eq!(res.line_content, "Line 2 target pattern here");
        assert_eq!(res.line_before, Some("Line 1 introduction".to_string()));
        assert_eq!(res.line_after, Some("Line 3 conclusion".to_string()));

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
