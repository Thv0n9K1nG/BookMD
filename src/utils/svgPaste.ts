/**
 * Utility for detecting, extracting, and converting SVG images (from clipboard items, HTML, or URLs)
 * into high-quality PNG data URLs for seamless markdown note handling.
 */
import { fetchSvgText } from '../services/ipc';

/**
 * Checks if a URL or src string points to an SVG image.
 */
export function isSvgUrl(src: string): boolean {
  if (!src || typeof src !== 'string') return false;
  const clean = src.trim().toLowerCase();
  return (
    clean.startsWith('data:image/svg+xml') ||
    clean.endsWith('.svg') ||
    clean.includes('.svg?') ||
    clean.includes('.svg#')
  );
}

/**
 * Checks if a string looks like raw SVG XML markup.
 */
export function isRawSvgString(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  return (
    (trimmed.startsWith('<svg') && trimmed.includes('</svg>')) ||
    (trimmed.startsWith('<?xml') && trimmed.includes('<svg') && trimmed.includes('</svg>'))
  );
}

/**
 * Decode a data:image/svg+xml;... URI into raw SVG XML string.
 */
export function decodeSvgDataUri(dataUri: string): string {
  const commaIdx = dataUri.indexOf(',');
  if (commaIdx === -1) return '';
  const meta = dataUri.substring(0, commaIdx);
  const data = dataUri.substring(commaIdx + 1);

  if (meta.includes(';base64')) {
    try {
      return atob(data);
    } catch {
      return '';
    }
  } else {
    try {
      return decodeURIComponent(data);
    } catch {
      return data;
    }
  }
}

/**
 * Check if the HTML snippet represents a standalone/pure image paste
 * (e.g. from "Copy Image" on a webpage or copying an isolated SVG element),
 * rather than rich text containing paragraphs, headings, tables with embedded icons.
 */
export function isStandaloneImageHtml(html: string): boolean {
  if (!html || typeof html !== 'string') return false;

  // Extract content between StartFragment and EndFragment if present
  let fragment = html;
  const startFrag = html.indexOf('<!--StartFragment-->');
  const endFrag = html.indexOf('<!--EndFragment-->');
  if (startFrag !== -1 && endFrag !== -1 && endFrag > startFrag) {
    fragment = html.substring(startFrag + '<!--StartFragment-->'.length, endFrag).trim();
  }

  // If fragment contains rich-text structural tags, it is rich text, NOT a standalone image
  if (/<(p|h[1-6]|table|thead|tbody|tr|th|td|ul|ol|li|blockquote|pre)\b/i.test(fragment)) {
    return false;
  }

  // Remove the <svg>...</svg> and <img...> tags from fragment to measure remaining non-image text
  const stripped = fragment
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '') // strip remaining tags like <div>, <span>, <br>
    .trim();

  // If there's more than 15 characters of plain text outside the image, it's rich text
  if (stripped.length > 15) {
    return false;
  }

  return true;
}

/**
 * Synchronous check to determine if the clipboard contains an SVG image.
 * Used in paste event handler to synchronously call event.preventDefault().
 */
export function hasSvgInClipboard(clipboardData: DataTransfer): boolean {
  // 1. Check items for SVG file or MIME type
  const items = clipboardData.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'image/svg+xml' || item.type.includes('svg')) {
        return true;
      }
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && file.name.toLowerCase().endsWith('.svg')) {
          return true;
        }
      }
    }
  }

  // 2. Check HTML format: ONLY if it's a standalone image paste (not rich text with inline icons)
  const html = clipboardData.getData('text/html');
  if (html && isStandaloneImageHtml(html)) {
    if (/<svg\b/i.test(html)) return true;
    if (/<img\b[^>]*?\bsrc=["'][^"']*?\.svg(?:[?#][^"']*)?["']/i.test(html)) return true;
    if (/<img\b[^>]*?\bsrc=["']data:image\/svg\+xml/i.test(html)) return true;
  }

  // 3. Check plain text
  const plain = clipboardData.getData('text/plain');
  if (plain && isRawSvgString(plain)) {
    return true;
  }

  return false;
}

/**
 * Extract SVG XML from HTML content if the HTML represents an SVG image paste.
 * Matches:
 * 1. Inline <svg ...>...</svg>
 * 2. An <img ... src="...svg"> tag (such as when copied from TryHackMe)
 */
export async function extractSvgFromHtml(html: string): Promise<string | null> {
  if (!html || typeof html !== 'string') return null;

  // Ignore rich text containing inline decorative icons
  if (!isStandaloneImageHtml(html)) return null;

  // 1. Direct inline <svg> check
  const svgTagMatch = html.match(/<svg\b[\s\S]*?<\/svg>/i);
  if (svgTagMatch) {
    return svgTagMatch[0];
  }

  // 2. Extract <img> tags pointing to SVG (via DOMParser when available, with regex fallback)
  const svgUrls: string[] = [];

  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const images = doc.querySelectorAll('img');

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const src = img.getAttribute('src');
        if (src && isSvgUrl(src)) {
          svgUrls.push(src);
        }
      }
    } catch {
      // Fallback to regex below
    }
  }

  // Regex fallback if DOMParser is unavailable or didn't match
  if (svgUrls.length === 0) {
    const imgRegex = /<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
    let match: RegExpExecArray | null;
    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      if (src && isSvgUrl(src)) {
        svgUrls.push(src);
      }
    }
  }

  for (const src of svgUrls) {
    if (src.startsWith('data:image/svg+xml')) {
      const decoded = decodeSvgDataUri(src);
      if (decoded) return decoded;
    } else {
      // Fetch remote SVG text via IPC / curl
      const fetched = await fetchSvgText(src);
      if (fetched && isRawSvgString(fetched)) {
        return fetched;
      }
    }
  }

  return null;
}

/**
 * Extract SVG XML from clipboard data transfer.
 * Covers:
 * 1. File items with type 'image/svg+xml' or '.svg' filename
 * 2. HTML format containing <svg> or <img src="...svg"> (TryHackMe case)
 * 3. Plain text format containing <svg>...</svg>
 */
export async function extractSvgFromClipboard(
  clipboardData: DataTransfer
): Promise<string | null> {
  // 1. Check clipboard files/items
  const items = clipboardData.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'image/svg+xml' || item.type.includes('svg')) {
        const file = item.getAsFile();
        if (file) {
          try {
            const text = await file.text();
            if (isRawSvgString(text)) {
              return text;
            }
          } catch {}
        }
      }
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && file.name.toLowerCase().endsWith('.svg')) {
          try {
            const text = await file.text();
            if (isRawSvgString(text)) {
              return text;
            }
          } catch {}
        }
      }
    }
  }

  // 2. Check HTML format (e.g. TryHackMe "Copy image" or inline SVGs)
  const html = clipboardData.getData('text/html');
  if (html) {
    const extracted = await extractSvgFromHtml(html);
    if (extracted) {
      return extracted;
    }
  }

  // 3. Check plain text
  const plain = clipboardData.getData('text/plain');
  if (plain && isRawSvgString(plain)) {
    return plain.trim();
  }

  return null;
}

/**
 * Parses an SVG length attribute (e.g. "120", "120px", "90pt", "10cm") into CSS pixels.
 * Ignores percentage values (e.g. "100%") so viewBox proportions are used instead.
 */
export function parseSvgLengthToPx(raw: string | null | undefined): number | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed.endsWith('%')) return null;

  const match = trimmed.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(px|pt|pc|in|cm|mm|em|rem)?$/i);
  if (!match) return null;

  const num = parseFloat(match[1]);
  if (!isFinite(num) || num <= 0) return null;

  const unit = (match[2] || 'px').toLowerCase();
  const unitFactor: Record<string, number> = {
    px: 1,
    pt: 96 / 72,
    pc: 16,
    in: 96,
    cm: 96 / 2.54,
    mm: 96 / 25.4,
    em: 16,
    rem: 16,
  };

  const px = num * (unitFactor[unit] ?? 1);
  return isFinite(px) && px > 0 ? px : null;
}

export interface SvgRenderDimensions {
  displayWidth: number;
  displayHeight: number;
  rasterWidth: number;
  rasterHeight: number;
  rasterScale: number;
}

/**
 * Computes logical display dimensions and high-DPI oversampled rasterization dimensions
 * for an SVG element, ensuring percentage attributes defer to viewBox and preserving
 * vector sharpness across HiDPI displays and PDF exports.
 */
export function computeSvgRenderDimensions(
  svgEl: Element,
  devicePixelRatio = 1
): SvgRenderDimensions {
  const attrW = parseSvgLengthToPx(svgEl.getAttribute('width'));
  const attrH = parseSvgLengthToPx(svgEl.getAttribute('height'));

  let vbW: number | null = null;
  let vbH: number | null = null;
  const viewBox = svgEl.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(parseFloat);
    if (parts.length === 4 && isFinite(parts[2]) && parts[2] > 0 && isFinite(parts[3]) && parts[3] > 0) {
      vbW = parts[2];
      vbH = parts[3];
    }
  }

  let logicalWidth: number;
  let logicalHeight: number;

  if (attrW && attrH) {
    logicalWidth = attrW;
    logicalHeight = attrH;
  } else if (attrW && vbW && vbH) {
    logicalWidth = attrW;
    logicalHeight = attrW * (vbH / vbW);
  } else if (attrH && vbW && vbH) {
    logicalHeight = attrH;
    logicalWidth = attrH * (vbW / vbH);
  } else if (vbW && vbH) {
    logicalWidth = vbW;
    logicalHeight = vbH;
  } else if (attrW) {
    logicalWidth = attrW;
    logicalHeight = Math.round(attrW * 0.75);
  } else if (attrH) {
    logicalHeight = attrH;
    logicalWidth = Math.round(attrH * (4 / 3));
  } else {
    logicalWidth = 800;
    logicalHeight = 600;
  }

  // Clamp logical display size to a reasonable ceiling for very huge coordinate spaces
  const MAX_DISPLAY_DIM = 2400;
  let displayWidth = logicalWidth;
  let displayHeight = logicalHeight;
  if (displayWidth > MAX_DISPLAY_DIM || displayHeight > MAX_DISPLAY_DIM) {
    const downScale = MAX_DISPLAY_DIM / Math.max(displayWidth, displayHeight);
    displayWidth = displayWidth * downScale;
    displayHeight = displayHeight * downScale;
  }

  const roundedDisplayW = Math.max(1, Math.round(displayWidth));
  const roundedDisplayH = Math.max(1, Math.round(displayHeight));

  // Rasterize at high DPI (2.5x - 4x depending on diagram size and display scaling)
  // while returning logical displayWidth/displayHeight so markdown renders crisp without blowing up layout
  const MAX_RASTER_DIM = 3600;
  const maxDisplaySide = Math.max(displayWidth, displayHeight);
  const dpr = isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const preferredScale = maxDisplaySide <= 900 ? 3 : 2.5;
  const desiredScale = Math.min(4, Math.max(preferredScale, dpr * 2));
  const maxAllowedScale = MAX_RASTER_DIM / maxDisplaySide;
  const rasterScale = Math.max(1, Math.min(desiredScale, maxAllowedScale));

  const rasterWidth = Math.max(1, Math.round(displayWidth * rasterScale));
  const rasterHeight = Math.max(1, Math.round(displayHeight * rasterScale));

  return {
    displayWidth: roundedDisplayW,
    displayHeight: roundedDisplayH,
    rasterWidth,
    rasterHeight,
    rasterScale,
  };
}

/**
 * Convert an SVG XML string into a high-DPI crisp PNG Data URL (data:image/png;base64,...)
 * using HTML5 Canvas with alpha transparency and proper viewBox vector scaling.
 */
export async function convertSvgXmlToPngBase64(
  svgXml: string
): Promise<{ base64: string; naturalWidth: number; naturalHeight: number }> {
  // 1. Parse and sanitize SVG XML
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgXml, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) {
    throw new Error('No valid <svg> element found in XML content');
  }

  // Ensure xmlns is present
  if (!svgEl.getAttribute('xmlns')) {
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  // 2. Compute logical and HiDPI raster dimensions
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
  const { displayWidth, displayHeight, rasterWidth, rasterHeight } = computeSvgRenderDimensions(svgEl, dpr);

  // Ensure viewBox is defined before upscaling width/height so vectors scale cleanly rather than adding blank margin
  if (!svgEl.getAttribute('viewBox')) {
    const rawW = parseSvgLengthToPx(svgEl.getAttribute('width')) || displayWidth;
    const rawH = parseSvgLengthToPx(svgEl.getAttribute('height')) || displayHeight;
    svgEl.setAttribute('viewBox', `0 0 ${rawW} ${rawH}`);
  }

  // Clear inline style width/height overrides if present so explicit attributes control vector rasterization
  if ('style' in svgEl && (svgEl as SVGSVGElement).style) {
    (svgEl as SVGSVGElement).style.removeProperty('width');
    (svgEl as SVGSVGElement).style.removeProperty('height');
  }

  // Set high-resolution width & height attributes on the SVG element for sharp vector rasterization
  svgEl.setAttribute('width', String(rasterWidth));
  svgEl.setAttribute('height', String(rasterHeight));

  const serializer = new XMLSerializer();
  const cleanSvgXml = serializer.serializeToString(svgEl);

  // 3. Render SVG onto HiDPI Canvas
  return new Promise((resolve, reject) => {
    const blob = new Blob([cleanSvgXml], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = rasterWidth;
        canvas.height = rasterHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(blobUrl);
          return reject(new Error('Canvas 2D context not available'));
        }

        // Clear canvas with alpha transparency and enable high-quality smoothing
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        URL.revokeObjectURL(blobUrl);
        const base64 = canvas.toDataURL('image/png');
        resolve({
          base64,
          naturalWidth: displayWidth,
          naturalHeight: displayHeight,
        });
      } catch (e) {
        URL.revokeObjectURL(blobUrl);
        reject(e);
      }
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error(`Failed to load SVG into Image element: ${e}`));
    };

    img.src = blobUrl;
  });
}
