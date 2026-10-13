import { convertFileSrc, isTauri, readImageData } from '../services/ipc';

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

// In-memory cache for image natural dimensions for instant synchronous lookup
const imageWidthCache = new Map<string, number>();

/**
 * Returns the cached width of an image if previously detected.
 */
export function getCachedImageWidth(rawSrc: string): number | null {
  return imageWidthCache.get(rawSrc) || null;
}

/**
 * Stores the natural width of an image in the in-memory cache.
 */
export function cacheImageWidth(rawSrc: string, width: number): void {
  if (rawSrc && width > 0) {
    imageWidthCache.set(rawSrc, width);
  }
}

/**
 * Loads an image from a URL, Blob URL, or base64 data URI and returns its natural width.
 */
export function getImageNaturalWidth(srcUrl: string): Promise<number | null> {
  return new Promise((resolve) => {
    if (!srcUrl) return resolve(null);
    const img = new Image();
    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };
    img.onload = () => {
      const width = img.naturalWidth || null;
      cleanup();
      resolve(width);
    };
    img.onerror = () => {
      cleanup();
      resolve(null);
    };
    img.src = srcUrl;
  });
}

/**
 * Asynchronously detects the natural width of an image given its raw source.
 * Tries the in-memory cache, then resolved URL, then IPC readImageData fallback.
 */
export async function detectImageWidth(
  rawSrc: string,
  docRelativePath: string,
  workspacePath?: string
): Promise<number | null> {
  if (!rawSrc) return null;
  const cached = imageWidthCache.get(rawSrc);
  if (cached) return cached;

  const resolved = resolveImageSource(rawSrc, docRelativePath, workspacePath);
  let width = await getImageNaturalWidth(resolved);

  if (!width && isTauri) {
    try {
      const dataUrl = await readImageData(rawSrc, docRelativePath);
      if (dataUrl) {
        width = await getImageNaturalWidth(dataUrl);
      }
    } catch {
      // ignore
    }
  }

  if (width && width > 0) {
    imageWidthCache.set(rawSrc, width);
    return width;
  }
  return null;
}

/**
 * Builds an HTML <img> tag with the exact attributes:
 * <img src="<image>" title="" alt="<text>" width="n"/>
 * If width is not provided or 0, the width attribute is omitted:
 * <img src="<image>" title="" alt="<text>"/>
 */
export function buildImageHtmlTag(
  src: string,
  alt: string = '',
  title: string = '',
  width?: number | null
): string {
  if (width && width > 0) {
    return `<img src="${src}" title="${title}" alt="${alt}" width="${width}"/>`;
  }
  return `<img src="${src}" title="${title}" alt="${alt}"/>`;
}

