# Release Notes — BookMD v0.1.15

**BookMD v0.1.15** brings critical hardening, atomic staging, and path normalization to the **Document Image Consolidation & Standardization Tool**. This release resolves permutation/cyclic renaming collisions, cascading text replacements, duplicate reference deduplication, and Windows OS Error 32 sharing violations.

---

## 🚀 Key Highlights & What's New

### 🛡️ 1. Two-Phase Staged Atomic Renaming (Zero Data Loss)
- **Eliminating Permutation & Cycle Overwrite Collisions**: When reordering images inside a document (e.g., `note_3.png` -> `1`, `note_1.png` -> `2`, `note_2.png` -> `3`), direct in-place operations previously overwrote target files before their original content could be processed.
- **Isolated Staging Area**: BookMD now stages all unique source images into an isolated temporary folder (`.bmd_staging_<uuid>`) before relocating them to their final standardized filenames. This mathematical guarantee completely eliminates in-place file collisions.
- **Move by Default**: Changed default operation mode from Copy to **Move (Di chuyển)** to prevent duplicate file clutter and prevent disk space exhaustion.

### 🔍 2. Reverse-Offset Markdown Text Replacement (Zero Cascading Clashes)
- **Exact Span Slicing**: Replaced naive sequential string `.replace()` with exact reverse-order byte offset replacement (`replace_range`).
- **No More Identical Index Bugs**: Previously, replacing `note_3.png` with `note_1.png` caused subsequent passes to inadvertently replace the newly placed `note_1.png` again, leading to catastrophic `3 3 3` or `1` cascades. With reverse-span slicing from document bottom to top, earlier character positions remain completely stable and untouched.

### 🔄 3. Smart Deduplication for Repeated Image References
- **Unified Naming for Shared Assets**: When an image is referenced multiple times in the same document (e.g., a diagram or logo appearing in multiple sections), BookMD assigns the exact same standardized target filename to every occurrence without incrementing the numeric sequence counter or generating redundant copies on disk.

### 🪟 4. Windows Path Normalization & OS Error 32 Fixes
- **UNC Extended Path (`\\?\`) Stripping**: Fixed path difference calculations where Windows canonical paths prepended with `\\?\` generated erroneous relative paths like `../../../../../../C:/...`. All relative links now resolve to clean paths like `images/note_1.png`.
- **Self-Copy Sharing Violation Prevention**: Added `paths_are_same_file` check to bypass redundant file I/O when an image is already in place with the target name, preventing Windows `ERROR_SHARING_VIOLATION (os error 32)`.
- **Retry Backoff Mechanism**: Added automatic retries for file locks and transient filesystem delays.

---

# Release Notes — BookMD v0.1.14

**BookMD v0.1.14** introduces the **Document Image Consolidation & Standardization Tool (`ConsolidateImagesModal`)**, resolving scattered and inconsistently named images in Markdown documents by gathering them into a standardized folder with uniform sequential naming (`<stem>_1.png`, `<stem>_2.png`, etc.) and automatically synchronizing the document's references in real-time.

---

## 🚀 Key Highlights & What's New

### 🖼️ 1. Document Image Consolidation & Standardization
- **The Problem**: When drafting technical notes over extended periods or importing notes from multiple tools, images often end up scattered across arbitrary folders (e.g. `assets/`, `../temp/`, downloads) with irregular names (e.g. `screenshot123.png`, `pasted_img.png`, `diagram.jpg`).
- **Automatic Document Scanning**: Scans the currently edited Markdown document and parses all image references across both Markdown `![alt](path)` and HTML `<img src="..." />` tags in exact document order.
- **Smart Path Verification**: Automatically verifies each image's existence on disk and skips missing paths or remote web URLs (`http://`, `https://`, `data:image/`).
- **2 Flexible Target Folder Options**:
  - **Option 1 (Default)**: Automatically places all images into your configured image directory (`images/` located right next to the current Markdown document).
  - **Option 2 (Custom Folder)**: Select any custom directory via a native OS directory picker.
- **Sequential Standardized Naming (`<stem>_N.<ext>`)**:
  - Automatically numbers and renames images sequentially (e.g. `note_1.png`, `note_2.jpg`) according to your document name and active Naming Base Directory setting.
  - Displays the active Naming Base rule in a read-only informational badge so you always know how file stems are derived.
- **Interactive Live Preview Table**:
  - Inspect all detected images before taking action: see source paths, target standardized names/locations, and status badges (Ready, Already in place, Missing - Skipped, Online - Skipped).
- **Safe Execution & Document Synchronization**:
  - Safely copies (default) or moves images to the target folder.
  - Automatically updates the Markdown text in the editor, replacing old paths with the new standardized relative paths so all images render seamlessly without broken links.

### 🛠️ 2. Expanded Tools Menu Integration
- Directly accessible from the **Tools (Công cụ)** dropdown in the titlebar alongside **Xuất PDF** and **Sao lưu Dữ liệu (Backup Tool)**.
- Integrated into the **Command Palette** (`Ctrl+Shift+P` -> *Đồng bộ & Tổ chức lại ảnh trong tài liệu*).

---

# Release Notes — BookMD v0.1.13

**BookMD v0.1.13** introduces an **Integrated Backup Tool (`BackupModal`)** for comprehensive data protection (supporting 3 flexible backup scopes, smart duplicate name handling, and recursive loop guards), alongside a newly redesigned **Tools Dropdown Menu** in the titlebar uniting PDF export, backup utilities, and future tools.

---

## 🚀 Key Highlights & What's New

### 💾 1. Integrated Backup Tool for Bulletproof Data Safety
- **3 Flexible Backup Scopes**:
  - **Entire Workspace**: Quickly copy and clone your entire open workspace to a separate backup folder.
  - **Selected Folder**: Choose any specific subfolder or directory on your system via a native folder picker dialog.
  - **Selected File**: Back up individual Markdown documents or configuration files (defaults to your actively open note).
- **Customizable Destination Folder**:
  - Save backups to any local directory, secondary drive, external USB, or cloud-synced storage folder.
  - The destination path is remembered in `localStorage` for effortless recurring backups.
- **Smart Duplicate Name Collision Handling**:
  - `auto_rename` (Default & Recommended): Automatically increments names (`name (1).md`, `name (2).md`, or `Folder (1)`) so previous backups are never overwritten or lost.
  - `timestamp`: Automatically tags copies with precision timestamps (`_YYYYMMDD_HHMMSS`).
  - `overwrite`: Optional in-place overwrite mode for users who desire fixed single-copy mirroring.
- **Recursive Infinite-Loop Protection**:
  - Prevents disaster scenarios where a backup directory is mistakenly chosen inside the source directory, automatically detecting and preventing infinite recursive copies.
- **Fast Build Exclusions**:
  - Automatically skips bulky build and cache directories (`node_modules`, `target`, `dist`, `.git`, `venv`, etc.) by default, ensuring backups finish in milliseconds.
- **Instant Result Verification**:
  - Directly open the backup destination in Windows Explorer / OS file manager with 1-click ("Mở thư mục sao lưu"), or copy the absolute destination path to clipboard.

### 🛠️ 2. Unified "Tools" Dropdown in Titlebar
- **Extensible Tools Hub**: Replaced the single "Xuất PDF" button with a modern, extensible **Tools (Công cụ)** dropdown menu.
- **Centralized Utilities**: Houses both **Xuất PDF** and the new **Sao lưu Dữ liệu (Backup Tool)** with clear icons, action titles, and descriptive subtitles.
- **Future-Ready**: Built as an extensible component, allowing new developer utilities to be added seamlessly in future updates.

---

# Release Notes — BookMD v0.1.12

**BookMD v0.1.12** delivers critical data-safety and stability upgrades: introducing a **Mandatory User Confirmation Modal for File & Folder Deletions** (preventing accidental document loss with default Cancel focus and OS Recycle Bin safety), and resolving the **Vanishing Subfolder / Children Bug** in On-Demand Lazy Directory Expansion during background filesystem watcher refreshes.

---

## 🚀 Key Highlights & Critical Fixes

### 🛡️ 1. Mandatory User Confirmation Modal for File & Folder Deletion
- **Zero Accidental Deletions**: In previous versions, deletion relied on browser-native confirmation prompts (`window.confirm`), which could be dismissed or triggered unintentionally. BookMD v0.1.12 introduces an explicit, high-visibility confirmation modal (`ConfirmDeleteModal`) that requires conscious user intent before any file or directory is deleted.
- **Fail-Safe Focus Architecture**: When the modal opens, focus is automatically pinned to the **"Hủy bỏ" (Cancel)** button. Pressing `Enter` or `Space` safely aborts the deletion rather than executing it.
- **Instant Escape / Outside Dismissal**: Pressing the `Escape` key or clicking outside the dialog immediately closes the modal without performing any action.
- **Clear Metadata & Warning**: The modal displays the item's target path and type icon. When deleting a directory, a clear warning indicates that all nested subfolders and files will be removed.
- **Safe Trash Mechanism**: BookMD utilizes OS-native trash management (`trash::delete`). Deleted items are moved to your operating system's **Recycle Bin (Thùng rác)** rather than permanently erased, allowing immediate restoration if an item is ever deleted by mistake.

### 🌲 2. Fixed Disappearing Children in On-Demand Lazy Directory Expansion
- **The Bug**: After v0.1.11 introduced On-Demand Lazy Directory Expansion (loading directory depth 1 on initial load to achieve sub-5ms opening times on massive codebases), users noticed that folders expanded in the sidebar explorer would suddenly lose their child files when interacting with files outside BookMD (e.g. in Windows Explorer, Git CLI) or during automatic saving. Users had to collapse and re-expand the folder to bring them back.
- **The Root Cause**: Background filesystem watcher events (`fs-change`) triggered a tree reload using a shallow 1-depth scan from the backend. Setting this shallow tree into component state inadvertently overwrote loaded children for all subfolders at depth $\ge 2$ with `null`.
- **Deep Tree Reconciliation (`mergeTreePreservingChildren`)**: BookMD now performs deep tree reconciliation during every tree refresh, preserving all loaded child arrays and node states across updates.
- **Automatic Multi-Level Re-hydration**: Every background watcher update queries and re-hydrates child files for all actively open folders (`expandedFolders`), keeping your working context completely intact.
- **Auto-Healing Lazy Loader**: If any expanded tree node is rendered without its children populated, it automatically invokes an asynchronous background load without toggling or collapsing the folder.
- **Workspace State Persistence**: Your expanded folder paths are remembered in `localStorage` across application reloads for each workspace.

---

# Release Notes — BookMD v0.1.11

**BookMD v0.1.11** resolves a critical performance bottleneck when opening large folders and complex codebases, introducing **Instant Workspace Opening & On-Demand Lazy Directory Expansion** (matching VS Code's architecture) to reduce opening times from 10+ minutes down to **1 to 5 milliseconds** with 0% idle CPU usage.

---

## 🚀 Key Highlights & Critical Fixes

### ⚡ 1. Instant Workspace Opening & On-Demand Lazy Directory Expansion
- **The Problem**: Previously, BookMD used an unbounded, recursive directory crawler that scanned every single subfolder down to infinite depth upon opening a workspace. For projects containing deep trees or massive file collections (e.g. Android APK decompilations, embedded JREs, Rust `target/`, Python `venv/`, Node `node_modules/`), BookMD would freeze into a "Not Responding" state for over 10 minutes while pinning an entire CPU core.
- **The Solution**: BookMD now adopts the proven architectural model of modern IDEs like VS Code:
  - **Lightning-Fast Initial Open**: Opening a workspace scans only the root directory and immediate top-level items in **1 to 5 milliseconds**.
  - **On-Demand Lazy Expansion**: Subdirectories are deferred and loaded asynchronously only when the user explicitly clicks on them in the file explorer sidebar.
  - **Infinite Scale**: Opening workspaces with hundreds of thousands or millions of files is now completely instantaneous and smooth.

### 🛡️ 2. Comprehensive Ignore Filters & Safety Limits
- **Built-In Ignore Rules**: Automatically skips traversing and indexing heavy non-source directories, including `node_modules`, `target`, `dist`, `build`, `bin`, `obj`, `venv`, `.venv`, `env`, `__pycache__`, `.gradle`, `.idea`, `.vscode`, `.cache`, and all hidden directories (`.*`).
- **Filesystem Watcher Debouncing & Filtering**: The background file change watcher now ignores events originating inside excluded folders, preventing watcher queue flooding when background compilers or decompilation tools are active.
- **Fail-Safe Entry Bounds**: Added hard safety caps (2,000 items per directory, 15,000 files per full workspace search) ensuring BookMD never hangs or exhausts memory on unusual filesystem structures.

---

# Release Notes — BookMD v0.1.10

**BookMD v0.1.10** introduces native **Mermaid.js Diagram Rendering** (supporting flowcharts, sequence diagrams, class diagrams, state machines, and ER models directly inside the live preview pane and PDF exports), and enhances **Table Clipboard Paste** by preserving bold, italic, inline code, links, and line breaks within table cells.

---

## 🚀 Key Highlights & What's New

### 📊 1. Native Mermaid.js Diagram Rendering (```mermaid)
- **Interactive Visual Diagrams**: Write code blocks with ```` ```mermaid ```` and BookMD will instantly render them as crisp SVG diagrams:
  ```markdown
  \`\`\`mermaid
  graph TD
      A[Client Request] --> B{Router / Gateway}
      B -->|Authenticated| C[BookMD Core Engine]
      B -->|Public| D[Static Asset Server]
      C --> E[Local Filesystem]
  \`\`\`
  ```
- **Broad Diagram Support**: Seamlessly renders flowcharts (`graph` / `flowchart`), sequence diagrams, state diagrams, entity-relationship diagrams, class diagrams, Gantt charts, git graphs, and mindmaps.
- **Flicker-Free DOM Reconciliation**: Built directly into BookMD's `morphdom` reconciliation pipeline. When typing elsewhere in your document, already rendered Mermaid diagrams are cached in memory and stay completely stable with zero flickering or re-renders.
- **Theme-Synchronized Rendering**: Automatically synchronizes diagram themes with BookMD's Dark and Light modes.
- **Quick Diagram Copy**: Added a 1-click "Sao chép" (Copy) button on hover and a right-click context menu option to instantly copy the raw Mermaid source code.
- **Offline & Zero-Latency**: All rendering runs 100% locally on your machine without external web connections.
- **PDF Vector Export**: Mermaid diagrams are automatically rendered and embedded as scalable vector SVGs when exporting documents to PDF.

### 📋 2. Preserved Formatting Inside Pasted Table Cells
- **Zero Data Loss in Table Cells**: Previously, copying tables from web pages, Word, or Google Docs stripped formatting within cells down to raw text. BookMD v0.1.10 faithfully preserves and converts inline styles inside each cell:
  - **Bold & Strong**: `<b>` and `<strong>` are preserved as `**text**`.
  - **Italic & Emphasis**: `<i>` and `<em>` are preserved as `*text*`.
  - **Inline Code**: `<code>`, `<kbd>`, and `<tt>` are preserved as `` `code` ``.
  - **Hyperlinks**: `<a href="...">` are converted to `[text](url)`.
  - **Strikethrough**: `<s>`, `<del>`, and `<strike>` are converted to `~~text~~`.
  - **Line Breaks & Paragraphs**: `<br>` and multi-paragraph cells are cleanly separated without breaking table row syntax.
  - **Smart Pipe Escaping**: Literal pipe characters `|` inside cell text or code are automatically escaped as `\|` to preserve Markdown column alignments.

---

# Release Notes — BookMD v0.1.9

**BookMD v0.1.9** introduces full **Rich-Text to Markdown Clipboard Conversion** (automatically formatting bold, italic, inline code, code blocks, blockquotes, headings, links, and nested lists from copied web pages, Word, or Google Docs), and redesigns **Settings Explanations** with clean, compact collapsible callout details.

---

## 🚀 Key Highlights & What's New

### 📝 1. Rich-Text to Markdown Clipboard Paste
- **Full Formatting Recognition**: Copying formatted text from web pages, Google Docs, Microsoft Word, Notion, or ChatGPT and pasting directly into BookMD instantly translates into clean Markdown:
  - **Bold & Italic**: `**bold**`, `*italic*`, and combined `***bold italic***` (with smart whitespace boundary preservation).
  - **Inline Code & Code Blocks**: `` `inline code` `` and fenced code blocks with detected language tags (```ts).
  - **Headings**: Automatically maps `<h1>` through `<h6>` to `#` through `######`.
  - **Blockquotes**: Converts `<blockquote>` into clean single-prefixed Markdown quotes (`> quote`).
  - **Links**: Converts `<a href="...">` to `[text](url)`.
  - **Lists**: Formats both unordered (`- `) and numbered lists (`1. `), preserving nested indentation levels.
  - **Strikethrough**: Converts `<s>`, `<del>`, and `<strike>` to `~~text~~`.
  - **Tables**: Seamlessly handles tables from HTML or TSV spreadsheets.
- **Developer-Friendly Filtering**: Detects internal VS Code editor copies to preserve raw code formatting without injecting unwanted styling tokens.

### 🎨 2. Collapsible Settings UI with Elegant Details
- **De-cluttered Settings Panel**: Replaced lengthy explanation paragraphs in Image Handling with a crisp 1-line summary and a modern collapsible disclosure (`▸ Xem chi tiết cách hoạt động`).
- **Interactive Callout Cards**: Clicking reveals an indented, softly-bordered callout box detailing the naming formulas, custom overrides, and session-scoped persistence rules.

---

# Release Notes — BookMD v0.1.8

**BookMD v0.1.8** brings a dedicated **Open Workspace Button** in the titlebar, introduces automatic **Smart Table Paste to Markdown** (converting Excel, Google Sheets, Word, and web tables into clean markdown tables), defaults **Image Naming** directly to the active document name without folder prefixes, and adds a persistent **Version Indicator** in the bottom status bar.

---

## 🚀 Key Highlights & What's New

### 📂 1. Dedicated Open Workspace Button in Titlebar
- **One-Click Workspace Access**: Previously, opening a new workspace required clicking the BookMD brand title in the top-left corner, which was not immediately obvious.
- **Visual Button Placement**: Added an explicit folder button (`FolderOpenIcon` — *Mở thư mục / Workspace... Ctrl+Shift+W*) directly next to the open Markdown file icon in the titlebar.

### 📊 2. Smart Table Paste to Markdown (Excel, Sheets, Web & TSV)
- **Automatic Table Recognition**: Copying tables from web browsers, Microsoft Excel, Google Sheets, Microsoft Word, or raw TSV automatically converts into formatted GitHub Markdown tables:
  ```markdown
  | Product Name | Price (USD) | Quantity |
  | --- | --- | --- |
  | Laptop Pro | 1200 | 5 |
  | Mechanical Keyboard | 150 | 12 |
  ```
- **Strictly Scoped to Tables**: Intentionally extracts cell text content without converting bold, italic, or font styles into markdown formatting tokens, keeping your tables crisp, clean, and bug-free.
- **Preserves Markdown Integrity**: Standard rich-text paragraphs without tables paste as normal text without unwanted side effects.

### 🖼️ 3. Document-First Image Naming (Naming Base Directory)
- **Document-First Default**: Pasting images now defaults to naming files directly after the Markdown document being written (e.g. `note_1.png` or `docker_1.png`), instead of prepending the entire workspace directory hierarchy.
- **Configurable When Needed**: Setting the Naming Base Directory to `/` (Workspace Root) in Settings still allows prepending full workspace folder paths when desired.

### 🏷️ 4. Status Bar Version Indicator
- **Always Visible**: Added a clean version badge (`v0.1.8`) at the bottom-right corner of the status bar so you always know which version of BookMD you are running.

---

# Release Notes — BookMD v0.1.7

**BookMD v0.1.7** introduces full native **Markdown Footnotes** support (`[^1]` & `[^1]: ...`), enables fluent **Tab Indentation** in the CodeMirror editor, switches the italic shortcut to **`Ctrl+Shift+I`**, and redesigns **Image Directory Management** to default directly to an `images/` folder next to the active document with clean session-scoped isolation across workspaces.

---

## 🚀 Key Highlights & What's New

### 📝 1. Fluent Tab Indentation in Editor (Cách dòng & Thụt lề)
- **Natural Tab Key Navigation**: Previously, pressing `Tab` inside CodeMirror trapped focus navigation and failed to indent text.
- **Context-Aware Indentation**:
  - **Start of Line / Empty Whitespace**: Indents the line cleanly by standard indent units (`indentMore`), making paragraph indentation and nested markdown lists effortless.
  - **Selected Text / Multi-Line**: Indents all selected lines with `Tab` and unindents with `Shift+Tab` (`indentLess`).
  - **Mid-Line Cursor**: Inserts clean spacing at the exact cursor position without shifting earlier content.

### 🔖 2. Markdown Footnotes Support ([^1] & [^1]: ...)
- **Standard Footnote Syntax**: Write numbered or named footnotes effortlessly in any document:
  ```markdown
  Here is a technical claim[^1] supported by source documentation[^rfc].

  [^1]: Official specification reference.
  [^rfc]: RFC 9110 HTTP Semantics.
  ```
- **Bidirectional Smooth Scrolling**: Click any footnote superscript `[1]` to jump directly to the footnote definition; click the back-reference arrow `↩︎` to return directly to the citation.
- **Dark & Light Mode Polish**: Clean typography with subtle separation lines, hover highlights, and styled superscripts.
- **A4 PDF Export**: Footnotes are styled cleanly at the bottom of exported print documents.

### 🖼️ 3. Document-Local Image Directory & Session Isolation
- **Document-Relative Image Folder**: When pasting or adding images, images are now saved into an `images/` folder located directly inside the directory of the Markdown file being edited (rather than being dumped at the workspace root `assets/images/`).
- **Session-Scoped Settings**: Image directory and naming base directory configurations are now strictly session-scoped. Switching to another workspace or restarting BookMD cleanly resets them to defaults, preventing accidental leaks between projects.
- **Clarified Settings Guidance**: Settings UI now features clear annotations, updated placeholders, and notes explaining session lifetime.

### ⌨️ 4. Reliable Italic Shortcut (`Ctrl+Shift+I`)
- **Resolved Key Conflict**: Replaced the previous `Ctrl+I` default shortcut with `Ctrl+Shift+I` to circumvent WebView/browser accelerator interference, with seamless fallback compatibility for legacy key maps.

---

# Release Notes — BookMD v0.1.6

**BookMD v0.1.6** brings flicker-free typing with **DOM Reconciliation (morphdom)** that eliminates image re-rendering while editing, full support for **KaTeX LaTeX Math Expressions** (both inline `$math$` and block `$$math$$`), and resolves **Vietnamese and Unicode diacritic heading anchor links** for seamless in-document navigation.

---

## 🚀 What's New & Improvements (Changelog)

### ⚡ Flicker-Free Image Stability via DOM Reconciliation (morphdom)
- **Eliminated Image Re-rendering & Flashing**: Fixed the frustrating issue where typing characters anywhere in the editor caused all images in the preview pane to flash, reload, and jitter.
- **Smart Element Morphing**: Powered by `morphdom`, BookMD now surgically patches only the changed text nodes and blocks in the preview DOM while preserving existing, decoded `<img>` elements intact.
- **Persistent Asset State**: Loaded images, IPC fallbacks, and scroll positions remain completely stable in memory while you write.

### 📐 KaTeX LaTeX Math Expressions ($math$ and $$math$$)
- **Inline Math**: Type `$E = mc^2$` or `$\\alpha + \\beta = \\gamma$` within any sentence to render crisp, typography-grade inline formulas.
- **Block Display Math**: Use `$$` delimiters on single lines or multi-line blocks:
  ```markdown
  $$
  \sum_{i=1}^{n} i = \frac{n(n+1)}{2}
  $$
  ```
- **Fast, Offline & Self-Contained**: KaTeX renders instantaneously without external network requests or latency.
- **PDF Export Support**: Math formulas are seamlessly included and styled when exporting documents to A4 PDF.

### 🇻🇳 Vietnamese & Unicode Diacritics Heading Anchor Links
- **Full Diacritic & Accent Support**: Resolved the issue where anchor links with Vietnamese text (e.g. `[Môi trường Phân tích & Quy trình Tái lập Độc lập](#1-môi-trường-phân-tích--quy-trình-tái-lập-độc-lập)`) failed to navigate to the target section.
- **Unicode-Aware Slug Generation**: Headings now receive clean slugs preserving Unicode letters (`\p{L}`) across all languages (Vietnamese diacritics like `ô`, `ơ`, `ư`, `á`, `đ`, etc.) while removing punctuation and formatting tokens.
- **Multi-Level Anchor Matching**: The anchor navigation engine handles URI-encoded links, accented slugs, unaccented variants, and multi-hyphen conventions, ensuring table-of-contents links always navigate smoothly.

---

# Release Notes — BookMD v0.1.5

**BookMD v0.1.5** introduces an interactive **Hierarchical Directory Tree Picker** for image folders, a comprehensive **Custom Keybinding System** with real-time shortcut recording, and fixes the Table of Contents navigation in Preview mode to preserve view mode while zooming to target sections.

---

## 🚀 What's New & Improvements (Changelog)

### 🌲 Interactive Hierarchical Directory Tree Picker
- **True Tree View Selection**: Replaced the previous flat list with an intuitive, expandable/collapsible directory tree structure.
- **Visual Depth & Controls**: Clearly displays nested folders with indentation, animated chevron toggles, subfolder count badges, and full path hints.
- **Smart Auto-Expansion & Search Filtering**: Searching folders in the tree automatically highlights matches and unfolds ancestor directories.
- **Bulk Navigation Controls**: Added "Mở rộng tất cả (Expand All)" and "Thu gọn (Collapse All)" actions to effortlessly browse deep workspace trees.
- **Dedicated Root Workspace Selector**: When selecting the image naming base directory, a dedicated Root node allows easily configuring naming to start from top-level workspace subfolders.
- **Subfolder Creator & Quick Presets**: Quickly create new subfolders directly in the tree view or jump using preset pills (`img`, `assets/images`, etc.).

### ⌨️ Comprehensive Keybinding Customization System
- **Dedicated Keybindings Tab**: Added a brand-new **"Phím tắt (Keybindings)"** tab in Settings with real-time search, category grouping, and reset buttons.
- **Markdown Formatting Shortcuts**:
  - **In đậm (Bold)**: `Ctrl+B` (wraps or unwraps `**...**`)
  - **Mã nội dòng (Inline Code)**: `Ctrl+\`` (wraps or unwraps `` `...` ``)
  - **In nghiêng (Italic)**: `Ctrl+I` (`*...*`)
  - **Khối mã nguồn (Code Block)**: `Ctrl+Shift+C` (```` ```...``` ````)
  - **Gạch ngang (Strikethrough)**: `Ctrl+Shift+X` (`~~...~~`)
  - **Chèn liên kết (Link)**: `Ctrl+K` (`[text](url)`)
  - **Tiêu đề (Headings H1-H3)**: `Ctrl+1`, `Ctrl+2`, `Ctrl+3`
  - **Khối trích dẫn (Blockquote)**: `Ctrl+Shift+Q` (`> `)
  - **Danh sách (Lists)**: Bullet (`Ctrl+Shift+U`), Numbered (`Ctrl+Shift+O`), Task List with checkboxes (`Ctrl+Shift+T`)
- **System & Navigation Shortcuts**:
  - **Lưu file**: `Ctrl+S`
  - **Mở file Markdown**: `Ctrl+O`
  - **Mở thư mục Workspace**: `Ctrl+Shift+W`
  - **Đóng/mở Sidebar**: `Ctrl+Shift+B` (moved from `Ctrl+B` to avoid conflict with Bold)
  - **Bật/tắt Mục lục (TOC)**: `Ctrl+Shift+M`
  - **Tìm kiếm Workspace**: `Ctrl+Shift+F`
  - **Bảng lệnh nhanh (Command Palette)**: `Ctrl+Shift+P`
  - **Chuyển chế độ xem (Editor/Split/Preview)**: `Ctrl+\`
  - **Xuất PDF A4**: `Ctrl+Shift+E`
- **Interactive Shortcut Recording**: Click on any shortcut badge, press your desired key combination, and BookMD instantly validates, maps, and persists it. Press `Escape` to cancel.
- **Dynamic Synchronization**: Customized keybindings immediately propagate across the CodeMirror editor, Command Palette badges, and global shortcuts.

### 🎯 Preview Mode Table of Contents (TOC) Navigation Fix
- **Preserved Preview View Mode**: Resolved the issue where clicking any heading in the TOC while in Preview mode forcefully switched the application into Split mode.
- **Smooth Section Scroll & Focus**: Navigating headings in Preview mode now remains strictly in Preview mode, smoothly scrolling to the header and illuminating it with active section zoom feedback.

---

# Release Notes — BookMD v0.1.4

**BookMD v0.1.4** delivers our signature, brand-defining **Advanced Image Handling System** with hierarchical hyphenated naming formulas, naming base directory selection, relative vs. absolute reference options, and a quick-access header button. It also brings full text selection & copy support in the Markdown Preview pane, balanced blockquote layout, and refined debounced auto-save controls.

---

## 🚀 What's New & Improvements (Changelog)

### 🖼️ Advanced Image Handling System (Signature Feature)
- **Hierarchical Hyphenated Naming Convention**:
  - Image assets are now systematically named using the clean, predictable formula:  
    `<subfolder>-<subfolder>-...-<document-name>_<index>.<extension>`
  - If a Markdown file is directly under the workspace or selected base folder, it cleanly names as:  
    `<document-name>_<index>.<extension>`
  - Image numbers strictly increment per document (`_1.png`, `_2.png`, etc.) avoiding collision across files.
- **Custom Naming Base Directory**:
  - Added a dedicated setting allowing users to select which folder hierarchy naming starts from downwards.
  - Ideal for monorepos or multi-topic workspaces (e.g., folders previously opened as standalone workspaces) where you want image names scoped under that sub-folder rather than the global workspace root.
- **Relative vs. Absolute Reference Syntax**:
  - Configurable in Settings: choose between **Relative Paths** (default, e.g. `../../assets/images/...`) for maximal portable markdown notes across GitHub/Obsidian/MarkText, or **Absolute Paths** (e.g. `C:/PROJECT/...`).
- **Dedicated Image Handling Titlebar Icon & Settings Tab**:
  - Added a dedicated **Image Handling** button (`ImageIcon`) right next to the Settings button in the top titlebar for instant 1-click access.
  - Reorganized the Settings Modal into clean tabs: **"Xử lý hình ảnh (Image Handling)"** and **"Cài đặt chung (General)"**, complete with interactive folder pickers, folder creation, and live naming formula demonstrations.

### 📝 Full Text Selection & Copy in Preview Pane
- **I-Beam Cursor & Native Text Selection**: Enabled `user-select: text` and `cursor: text` across all rendered markdown preview elements (headings, body paragraphs, tables, blockquotes, lists).
- **One-Click Code Block Copying**: Code fences now include a quick-copy icon button with visual confirmation.
- **Context Menu Integration**: Right-clicking selected text within the preview pane allows quick copying to the system clipboard.

### 💬 Refined Blockquote Callout Styling
- Fixed vertical alignment and text offset in Markdown blockquotes.
- Quote identifier bars and callout tags are cleanly proportioned and vertically centered, keeping focus directly on quoted text.

### ⚡ Debounced Auto-Save & Clean Notifications
- **Debounced Auto-Save Engine**: Auto-save now operates on a reliable debounce timer, eliminating rapid-fire saves during fast typing.
- **Configurable Auto-Save Interval**: Added customizable auto-save interval settings in milliseconds.
- **Single Save Notification**: Eliminated duplicate "Lưu file thành công" toast notifications when saving manually (`Ctrl+S`).

---

# Release Notes — BookMD v0.1.3

**BookMD v0.1.3** introduces seamless single-file opening via Windows Explorer and CLI, native multithreaded workspace search with 3-line context snippets, smart image dimensions on paste and auto-transformation, a dedicated New Folder button with custom Prompt modals, and isolated A4 PDF export with UI cleanups.

---

## 🚀 What's New & Bug Fixes (Changelog)

### 📄 Seamless Single-File Opening & Single-Instance Coordination
- **File Association & CLI Launch**: Resolved the issue where double-clicking a `.md` file in Windows Explorer or launching via command line (`bookmd path/to/file.md`) would ignore the target file and open the previously stored workspace. BookMD now detects launch arguments immediately and opens the requested document.
- **Smart Workspace Adoption**: Opening a document outside the active workspace automatically sets its parent directory as the workspace root. Sibling notes and relative image folders (`assets/`, `img/`) work right out of the box. If the file already belongs to the current workspace, it opens directly into a new tab without reloading the tree.
- **Single-Instance IPC Coordination**: Integrated `tauri-plugin-single-instance`. Launching a document while BookMD is already running automatically focuses the existing window and opens the file in a new tab without creating duplicate app processes.
- **Drag & Drop Support**: Drag and drop any `.md` file onto the BookMD window to open it instantly.
- **Dedicated Open File Actions**: Added `Ctrl+O` keyboard shortcut, top titlebar button, Command Palette command, and Welcome screen buttons for opening single Markdown files.

### 🔎 Native Ripgrep Workspace Search with 3-Line Context
- **Rust-Powered Fast Search**: High-performance multi-threaded text search across the entire workspace.
- **3-Line Context Snippets**: Search results display total matches and are organized per file, showing 1 line before, the matching line with highlighted search keywords, and 1 line after.
- **Smooth Modal Scrolling**: Fixed search result scrolling container height, mousewheel event forwarding, persistent custom scrollbars, and keyboard arrow navigation.

### 🖼️ Natural Image Dimensions & Markdown Syntax Auto-Transform
- **Auto-Measured Width on Paste**: Pasting images from clipboard saves the asset and generates standard `<img src="..." title="" alt="" width="N"/>` tags with the image's natural dimensions automatically computed.
- **Instant Syntax Transformation**: Typing markdown image syntax `![alt](url)` automatically converts into clean `<img .../>` tags as soon as the closing parenthesis `)` is completed.

### 📁 Sidebar Enhancements & Modern Prompt Modals
- **Dedicated New Folder Button**: Added a dedicated "New Folder" button alongside "New File" in the FileTree toolbar.
- **Custom `PromptModal` UI**: Replaced native browser `window.prompt()` popups with a modern, glassmorphic modal dialog with OS filename validation (preventing forbidden characters `< > : " / \ | ? *`), smart filename selection excluding `.md` extensions, and Enter/Esc keyboard shortcuts.
- **Full Sidebar Collapse (0px)**: Removed duplicate sidebar collapse buttons. Toggling sidebar (`Ctrl+B` or top-left titlebar button) now completely collapses the sidebar to 0px width, maximizing editor and preview space.

### 🖨️ Isolated A4 PDF Export & Cancel Fix
- **Isolated Iframe Printing**: Documents are rendered into a dedicated, print-optimized A4 layout inside an isolated iframe, ensuring zero BookMD IDE chrome appears in the printed PDF. Full support for Vietnamese UTF-8 typography, code blocks, tables, and images.
- **Cancel Dialog Fix**: Fixed an issue where canceling the print dialog required pressing Cancel twice due to uncancelled fallback timers. Printing is now strictly guarded to trigger once.

---

# Release Notes — BookMD v0.1.2

**BookMD v0.1.2** introduces synchronized split-mode zoom & focus, secure external link handling via the OS default browser, and eliminates initial workspace load errors on fresh installations.

---

## 🚀 What's New & Bug Fixes (Changelog)

### 🧭 Resilient Workspace Startup & Clean Onboarding
- **Zero-Error First Launch**: Removed hardcoded developer workspace paths that previously triggered `FILE NOT FOUND (os error 2)` alerts on machines without `c:\PROJECT\BookMD`.
- **Smart Workspace Persistence**: Persists the active workspace path in `localStorage` and smoothly restores it on startup. If a previously opened folder was moved or deleted, BookMD gracefully resets and shows the Welcome screen without popping up alarming error toasts.
- **Clean Fallback Prompts**: Cleaned up internal dialog fallbacks to prevent pre-filling local paths.

### 🌐 Secure External Link Delegation (No WebView Hijacking)
- **Default OS Browser Delegation**: Fixed a critical WebView behavior where clicking markdown or HTML links (`http://`, `https://`, `mailto:`, `tel:`) would navigate the app WebView itself away to that website. External links now open seamlessly in your system's default browser (Chrome, Edge, Firefox, etc.) via `@tauri-apps/plugin-opener`.
- **In-Document Heading Jump**: Clicking anchor links (`#section-anchor`) smoothly scrolls to the exact heading within the preview pane. Headings automatically receive normalized anchor slug IDs.
- **Relative Document Navigation**: Clicking relative links pointing to other markdown files (e.g., `[Overview](guide.md)`) automatically opens them into an active editor tab.

### 🔍 Split-Mode Synchronized Focus & Section Zoom
- **Source-Line Mapping**: Markdown block tokens (paragraphs, headings, lists, code fences) are mapped in real time to their corresponding line numbers in CodeMirror.
- **Active Section Auto-Focus & Smooth Scroll**: In Split View (`Editor + Preview`), as you type or navigate lines in the editor, the Preview pane automatically centers on the active section being written.
- **Visual Zoom Feedback**: The active section in the Preview is highlighted with a subtle magnification (`transform: scale(1.006)`), an accent indicator bar, and ambient illumination, making it immediately clear where you are editing.
- **Jitter Prevention**: Smart viewport detection avoids unnecessary scroll jumps while typing continuously within the same paragraph.

### 🧪 Automated Testing & Reliability
- Added automated unit tests for preview line-mapping, heading ID slug generation, and relative document path resolution (`test/previewFeatures.test.ts`).
- Passed all Frontend (`7/7` Vitest) and Backend (`4/4` Cargo) test suites.

---

# Release Notes — BookMD v0.1.1

Bản cập nhật **v0.1.1** tập trung sửa chữa triệt để hệ thống xử lý hình ảnh (Image Handling), tối ưu hóa trải nghiệm dán ảnh (clipboard paste), tự động đồng bộ cây thư mục theo thời gian thực và bổ sung tính năng Mục lục (Table of Contents).

---

## 🚀 Điểm mới & Sửa lỗi quan trọng (Changelog)

### 🖼️ Khắc phục toàn diện xử lý hình ảnh (Image Handling & Rendering)
- **Render ảnh mượt mà trên Preview**: Kích hoạt giao thức Tauri Asset Protocol (`protocol-asset`) và giải quyết chính xác đường dẫn tương đối của ảnh theo thư mục tài liệu hiện hành hoặc root workspace.
- **Áp dụng tức thì cài đặt thư mục ảnh (Zero-delay Settings)**: Khắc phục lỗi closure trong CodeMirror khiến ảnh paste bị gán nhầm vào thư mục mặc định cũ. Giờ đây thay đổi cài đặt thư mục ảnh (ví dụ: `img` thay vì `assets/images`) được áp dụng ngay lập tức mà không cần khởi động lại ứng dụng.
- **Tự động mở rộng & Cập nhật cây thư mục (Auto-expand & Tree Refresh)**: Khi dán ảnh vào tài liệu, thư mục chứa ảnh sẽ tự động được làm mới và bung mở ngay lập tức trong thanh sidebar, giúp người dùng nhìn thấy ảnh mới tạo mà không còn bỡ ngỡ.
- **Lắng nghe Filesystem Watcher thời gian thực**: Tích hợp sự kiện `fs-change` từ Rust backend giúp cây thư mục tự động cập nhật mọi thay đổi từ bên ngoài (File Explorer) với bộ đệm khử rung (debounce).

### 📑 Mục lục tiêu đề (Table of Contents — TOC)
- Hỗ trợ chuyển đổi nhanh giữa tab **Thư mục (Files)** và tab **Mục lục (TOC)** trong sidebar (`Ctrl + Shift + O`).
- Tự động bóc tách phân cấp tiêu đề H1–H6 từ tài liệu Markdown hiện hành, cho phép nhấp để cuộn và nhảy tức thì tới dòng nội dung tương ứng.

### 🎨 Tinh chỉnh giao diện & Cấu hình
- Sử dụng CodeMirror Compartments giúp thay đổi Theme, Font Size, Line Numbers, Word Wrap mượt mà mà không làm mất trạng thái soạn thảo.
- Cập nhật bộ icon ứng dụng độ phân giải cao (`.ico`, `.icns`, `.png`).
- Bổ sung bộ kiểm thử tự động (Unit Test suite) cho cả Frontend (Vitest) và Backend (Rust cargo test).

---

# Release Notes — BookMD v0.1.0

Chào mừng bạn đến với bản phát hành đầu tiên của **BookMD (v0.1.0)**!

BookMD là một không gian ghi chú kỹ thuật Markdown nhẹ, siêu nhanh, local-first và ưu tiên trực tiếp filesystem dành cho lập trình viên, kỹ sư hệ thống và người làm kỹ thuật.

---

## 🌟 Tính Năng Nổi Bật

### 1. Kiến trúc Local-First & Filesystem-First
- Không database bí mật hay format độc quyền — toàn bộ tài liệu là các file `.md` và thư mục thông thường trên ổ cứng của bạn.
- Tự do đồng bộ qua Git, Syncthing, Dropbox hoặc backup theo cách bạn muốn.
- Giám sát thay đổi file theo thời gian thực (realtime filesystem watcher).

### 2. Trình soạn thảo & Preview mượt mà
- Tích hợp **CodeMirror 6** hiện đại, phản hồi tức thì cả với các tài liệu dài.
- 3 chế độ xem linh hoạt: **Editor Only**, **Split View (Song song)**, và **Preview Only**.
- Hỗ trợ đầy đủ cú pháp GitHub Flavored Markdown (GFM), syntax highlighting code block đa ngôn ngữ, bảng, checklist, quote.

### 3. Tìm kiếm toàn văn siêu tốc (ripgrep IPC)
- Tìm kiếm từ khóa và regex xuyên suốt toàn bộ workspace trong vài mili-giây.
- Xem trước dòng khớp lệnh, số dòng và mở file đến đúng vị trí mong muốn.
- Hỗ trợ lọc theo tên file và đường dẫn thư mục.

### 4. Quản lý hình ảnh tự động & thông minh
- Dán ảnh chụp màn hình trực tiếp từ clipboard (`Ctrl + V`).
- Tự động lưu ảnh vào thư mục cấu hình (mặc định: `assets/images/`) với tên file theo quy chuẩn `{doc_slug}-{index}-{hash}.png`.
- Tự động băm SHA-256 để chống trùng lặp dữ liệu ảnh trong cùng thư mục.
- Tự động cập nhật đường dẫn hình ảnh khi đổi tên tài liệu Markdown.

### 5. Xuất PDF chuyên nghiệp
- Xuất tài liệu Markdown ra PDF nguyên bản với font chữ kỹ thuật sắc nét, code block có viền tinh gọn và ngắt trang hợp lý.

### 6. Trải nghiệm người dùng cao cấp (UX Polish)
- **Command Palette** (`Ctrl + P` / `Ctrl + Shift + P`) truy cập nhanh tất cả thao tác trong ứng dụng.
- **Search Modal** (`Ctrl + K`) tra cứu nhanh chóng.
- Hệ thống **Tabs** đa tài liệu với chỉ báo file chưa lưu (`dirty dot`).
- **Context Menus** trực quan trên cây thư mục (New Note, New Folder, Rename, Delete, Copy Path).
- Hỗ trợ cả **Dark Theme** và **Light Theme**, tùy chỉnh kích thước chữ, tự động lưu (auto-save).

---

## 📦 Các gói cài đặt (Packaging)

Bản phát hành cung cấp các gói cài đặt cho các hệ điều hành:
- **Windows**: Bộ cài đặt `BookMD-Setup-x64.exe` (NSIS) và `.msi`.
- **Linux**: Gói cài đặt `.deb` (Debian/Ubuntu) và `.AppImage` (Universal Linux).
- **macOS**: Gói `.dmg` tương thích Intel & Apple Silicon.

---

## 🛠️ Yêu cầu hệ thống

- **Hệ điều hành**: Windows 10/11 64-bit, Ubuntu 22.04+ (hoặc tương đương), macOS 11+
- **Dung lượng**: ~20MB RAM khi chạy, kích thước bộ cài < 15MB.
