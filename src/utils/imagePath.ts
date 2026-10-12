import { convertFileSrc, isTauri } from '../services/ipc';

/**
 * Normalizes path segments by handling '.' and '..' and unifying path separators to forward slashes.
 */
export function normalizePathSegments(input: string): string {
  const unified = input.replace(/\\/g, '/');
  const driveMatch = unified.match(/^([a-zA-Z]:|\/)(.*)/);
  let prefix = '';
  let rest = unified;
  if (driveMatch) {
    prefix = driveMatch[1];
    rest = driveMatch[2];
  }

  const rawSegments = rest.split('/');
  const segments: string[] = [];

  for (const seg of rawSegments) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      if (segments.length > 0) {
        segments.pop();
      }
    } else {
      segments.push(seg);
    }
  }

  const joined = segments.join('/');
  if (prefix) {
    return prefix.endsWith('/') ? `${prefix}${joined}` : `${prefix}/${joined}`;
  }
  return joined;
}

/**
 * Resolves a markdown image source URL (relative path, absolute path, or remote URL)
 * into a valid URL that can be loaded in the Tauri WebView / browser.
 */
export function resolveImageSource(
  rawSrc: string,
  docRelativePath: string,
  workspacePath?: string
): string {
  if (!rawSrc) return rawSrc;

  const src = rawSrc.trim();

  // If already remote URL, data URI, blob, or asset protocol URL
  if (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:') ||
    src.startsWith('blob:') ||
    src.startsWith('asset:') ||
    src.startsWith('tauri:')
  ) {
    return src;
  }

  // If no workspace path is set, return as is
  if (!workspacePath) {
    return src;
  }

  let decodedSrc = src;
  try {
    decodedSrc = decodeURI(src);
  } catch {
    // Keep decodedSrc as is if decodeURI fails
  }

  // Check if src is an absolute filesystem path with Windows drive letter (e.g. C:\... or C:/...)
  const isWindowsAbs = /^[a-zA-Z]:[\\\/]/.test(decodedSrc);

  let fullPath = '';
  if (isWindowsAbs) {
    fullPath = decodedSrc;
  } else {
    const normWorkspace = workspacePath.replace(/\\/g, '/').replace(/\/+$/, '');
    const normDocPath = docRelativePath.replace(/\\/g, '/');
    const docDir = normDocPath.includes('/')
      ? normDocPath.substring(0, normDocPath.lastIndexOf('/'))
      : '';

    if (decodedSrc.startsWith('/')) {
      // Path starting with '/' is relative to the workspace root
      fullPath = `${normWorkspace}/${decodedSrc.replace(/^\/+/, '')}`;
    } else {
      // Relative to current markdown file's directory
      fullPath = docDir
        ? `${normWorkspace}/${docDir}/${decodedSrc}`
        : `${normWorkspace}/${decodedSrc}`;
    }
  }

  const normalized = normalizePathSegments(fullPath);

  // In Tauri, convert local filesystem path to asset protocol URL
  if (isTauri) {
    return convertFileSrc(normalized);
  }

  return normalized;
}
