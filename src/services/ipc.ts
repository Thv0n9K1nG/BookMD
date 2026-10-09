import { invoke } from '@tauri-apps/api/core';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import {
  WorkspaceInfo,
  FileEntry,
  SearchResult,
  SearchOptions,
  ImageResult,
  ImageSaveOptions,
} from '../types';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// Fallback in-memory state for pure web development/preview
let mockWorkspace: WorkspaceInfo | null = null;
let mockFiles: Record<string, string> = {
  'README.md': `# BookMD Demo Workspace\n\nChào mừng bạn đến với **BookMD**!\n\nMột Markdown workspace chuẩn technical notes, nhẹ, mượt và bảo vệ dữ liệu trên filesystem.\n\n## Tính năng nổi bật\n- CodeMirror 6 markdown editor mượt mà\n- Phân chia Editor / Split / Preview\n- Quản lý hình ảnh tự động khi paste ảnh\n- Workspace search nhanh như chớp với \`ripgrep\`\n- Xuất tài liệu ra PDF chuẩn chỉnh`,
  'TryHackMe/Docker/image.md': `# Docker Images\n\nDocker images are read-only templates used to create containers.\n\n\`\`\`bash\ndocker pull alpine:latest\ndocker images\n\`\`\`\n\n> Note: Layers are cached locally.`,
  'TryHackMe/Docker/container.md': `# Docker Containers\n\nContainers are runnable instances of an image.\n\n\`\`\`bash\ndocker run -d -p 80:80 nginx\n\`\`\``,
  'TryHackMe/Kubernetes/Pod.md': `# Kubernetes Pods\n\nPods are the smallest deployable units in Kubernetes.\n\n\`\`\`yaml\napiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx\nspec:\n  containers:\n  - name: nginx\n    image: nginx:1.14.2\n\`\`\``,
};

function getMockTree(): FileEntry[] {
  const tree: FileEntry[] = [
    {
      name: 'README.md',
      relativePath: 'README.md',
      kind: 'file',
    },
    {
      name: 'assets',
      relativePath: 'assets',
      kind: 'directory',
      children: [
        {
          name: 'images',
          relativePath: 'assets/images',
          kind: 'directory',
          children: [],
        },
      ],
    },
    {
      name: 'TryHackMe',
      relativePath: 'TryHackMe',
      kind: 'directory',
      children: [
        {
          name: 'Docker',
          relativePath: 'TryHackMe/Docker',
          kind: 'directory',
          children: [
            {
              name: 'img',
              relativePath: 'TryHackMe/Docker/img',
              kind: 'directory',
              children: [],
            },
            {
              name: 'image.md',
              relativePath: 'TryHackMe/Docker/image.md',
              kind: 'file',
            },
            {
              name: 'container.md',
              relativePath: 'TryHackMe/Docker/container.md',
              kind: 'file',
            },
          ],
        },
        {
          name: 'Kubernetes',
          relativePath: 'TryHackMe/Kubernetes',
          kind: 'directory',
          children: [
            {
              name: 'Pod.md',
              relativePath: 'TryHackMe/Kubernetes/Pod.md',
              kind: 'file',
            },
          ],
        },
      ],
    },
  ];
  return tree;
}

export async function selectWorkspaceFolder(): Promise<string | null> {
  if (isTauri) {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: 'Chọn thư mục Workspace cho BookMD',
      });
      if (typeof selected === 'string') return selected;
      if (Array.isArray(selected) && (selected as string[]).length > 0) return (selected as string[])[0];
      return null;
    } catch (err) {
      console.warn('Dialog open failed, falling back to prompt:', err);
    }
  }
  return prompt('Nhập đường dẫn thư mục Workspace:', 'C:\\PROJECT\\BookMD');
}

export async function openWorkspace(path: string): Promise<WorkspaceInfo> {
  if (isTauri) {
    return await invoke<WorkspaceInfo>('workspace_open', { path });
  }
  mockWorkspace = {
    path,
    name: path.split(/[\/\\]/).filter(Boolean).pop() || 'Workspace',
  };
  return mockWorkspace;
}

export async function getWorkspaceTree(): Promise<FileEntry[]> {
  if (isTauri) {
    return await invoke<FileEntry[]>('workspace_tree');
  }
  return getMockTree();
}

export async function readFile(relativePath: string): Promise<string> {
  if (isTauri) {
    return await invoke<string>('file_read', { relativePath, relative_path: relativePath });
  }
  if (relativePath in mockFiles) {
    return mockFiles[relativePath];
  }
  return '';
}

export async function writeFile(relativePath: string, content: string): Promise<void> {
  if (isTauri) {
    await invoke('file_write', { relativePath, relative_path: relativePath, content });
    return;
  }
  mockFiles[relativePath] = content;
}

export async function createFile(relativePath: string, kind: 'file' | 'directory'): Promise<FileEntry> {
  if (isTauri) {
    return await invoke<FileEntry>('file_create', {
      relativePath,
      relative_path: relativePath,
      kind,
    });
  }
  const name = relativePath.split(/[\/\\]/).pop() || relativePath;
  if (kind === 'file') {
    mockFiles[relativePath] = `# ${name}\n\n`;
  }
  return { name, relativePath, kind };
}

export async function renameFile(source: string, destination: string): Promise<void> {
  if (isTauri) {
    await invoke('file_rename', { source, destination });
    return;
  }
  if (source in mockFiles) {
    mockFiles[destination] = mockFiles[source];
    delete mockFiles[source];
  }
}

export async function deleteFile(relativePath: string): Promise<void> {
  if (isTauri) {
    await invoke('file_delete', { relativePath, relative_path: relativePath });
    return;
  }
  delete mockFiles[relativePath];
}

export async function searchWorkspace(
  pattern: string,
  options?: SearchOptions
): Promise<SearchResult[]> {
  if (isTauri) {
    return await invoke<SearchResult[]>('search_query', { pattern, options });
  }
  const results: SearchResult[] = [];
  const query = options?.caseSensitive ? pattern : pattern.toLowerCase();
  for (const [file, content] of Object.entries(mockFiles)) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const matchIndex = (options?.caseSensitive ? line : line.toLowerCase()).indexOf(query);
      if (matchIndex !== -1) {
        results.push({
          file,
          line: index + 1,
          column: matchIndex + 1,
          matchedText: line.substring(matchIndex, matchIndex + pattern.length),
          context: line.trim(),
        });
      }
    });
  }
  return results;
}

export async function saveImage(
  markdownFile: string,
  imageData: string,
  options?: ImageSaveOptions
): Promise<ImageResult> {
  if (isTauri) {
    return await invoke<ImageResult>('image_save', {
      markdownFile,
      markdown_file: markdownFile,
      imageData,
      image_data: imageData,
      options,
    });
  }
  // Mock image save
  const parts = markdownFile.replace(/\.md$/i, '').split('/');
  const docName = parts.pop() || 'Doc';
  const folder = parts.join('_') || 'root';
  const filename = `${folder}_${docName}_1.png`;
  const relativePath = `assets/images/${filename}`;
  return {
    path: `C:/MockWorkspace/${relativePath}`,
    relativePath,
    filename,
    markdownReference: `![${docName}](../${relativePath})`,
  };
}

export async function renameImagesForDocument(
  oldPath: string,
  newPath: string,
  imageDir?: string
): Promise<[string, string][]> {
  if (isTauri) {
    return await invoke<[string, string][]>('image_rename_for_document', {
      oldPath,
      old_path: oldPath,
      newPath,
      new_path: newPath,
      imageDir,
      image_dir: imageDir,
    });
  }
  return [];
}

export async function exportPdf(
  markdownFile: string,
  htmlContent: string,
  destination: string
): Promise<string> {
  if (isTauri) {
    return await invoke<string>('export_pdf', {
      markdownFile,
      markdown_file: markdownFile,
      htmlContent,
      html_content: htmlContent,
      destination,
    });
  }
  return destination;
}

export async function promptSavePdfPath(defaultName: string): Promise<string | null> {
  if (isTauri) {
    try {
      const selected = await saveDialog({
        defaultPath: defaultName.replace(/\.md$/i, '') + '.pdf',
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
      });
      return selected;
    } catch (e) {
      console.warn('Save dialog error:', e);
    }
  }
  return prompt('Đường dẫn xuất PDF:', defaultName.replace(/\.md$/i, '') + '.pdf');
}
