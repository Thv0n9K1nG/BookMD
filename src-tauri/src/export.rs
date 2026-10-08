use crate::error::AppError;

/// Export markdown content to PDF using HTML rendering
/// Uses Tauri's webview print capability for consistent preview-to-PDF output
pub fn export_pdf(
    workspace_path: &str,
    markdown_file: &str,
    html_content: &str,
    destination: &str,
) -> Result<String, AppError> {
    let dest_path = std::path::Path::new(destination);
    
    // Create parent directory if needed
    if let Some(parent) = dest_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    // Build a standalone HTML document with embedded CSS for export
    let full_html = build_export_html(html_content);
    
    // Write HTML to temp file, then we'll use the frontend to trigger print
    let temp_html_path = std::path::Path::new(workspace_path)
        .join(".bookmd_export_temp.html");
    std::fs::write(&temp_html_path, &full_html)?;

    Ok(temp_html_path.to_string_lossy().to_string())
}

/// Clean up temporary export files
pub fn cleanup_export(workspace_path: &str) -> Result<(), AppError> {
    let temp_path = std::path::Path::new(workspace_path)
        .join(".bookmd_export_temp.html");
    if temp_path.exists() {
        std::fs::remove_file(&temp_path)?;
    }
    Ok(())
}

fn build_export_html(content: &str) -> String {
    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #1a1a2e;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 20px;
}}
h1, h2, h3, h4, h5, h6 {{ color: #16213e; margin-top: 1.5em; }}
h1 {{ font-size: 2em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }}
h2 {{ font-size: 1.5em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.2em; }}
code {{
    background: #f1f5f9;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}}
pre {{
    background: #1e293b;
    color: #e2e8f0;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
}}
pre code {{
    background: none;
    color: inherit;
    padding: 0;
}}
blockquote {{
    border-left: 4px solid #6366f1;
    margin: 1em 0;
    padding: 0.5em 1em;
    background: #f8fafc;
    color: #475569;
}}
table {{
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
}}
th, td {{
    border: 1px solid #e2e8f0;
    padding: 8px 12px;
    text-align: left;
}}
th {{ background: #f1f5f9; font-weight: 600; }}
img {{ max-width: 100%; height: auto; border-radius: 4px; }}
a {{ color: #6366f1; }}
hr {{ border: none; border-top: 1px solid #e2e8f0; margin: 2em 0; }}
</style>
</head>
<body>
{content}
</body>
</html>"#,
        content = content
    )
}
