/**
 * Slug generation and heading anchor lookup utilities supporting
 * Vietnamese diacritics, unicode characters, and standard GitHub-style markdown anchors.
 */

export function stripVietnameseDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Generates a clean URL slug from heading text, preserving Unicode letters
 * (including Vietnamese diacritics like ô, ơ, ư, á, etc.) and converting spaces to hyphens.
 */
export function generateHeadingSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[*_`~[\]]/g, '')
    // Remove punctuation, preserve unicode letters (\p{L}), numbers (\p{N}), spaces, and hyphens
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

/**
 * Finds the target heading element in a rendered container matching an anchor string.
 * Handles Vietnamese diacritics, unaccented variants, multiple hyphens, and URI-encoded anchors.
 */
export function findHeadingElement(
  container: HTMLElement,
  rawHref: string
): HTMLElement | null {
  if (!rawHref) return null;

  const rawId = rawHref.startsWith('#') ? rawHref.slice(1) : rawHref;
  let decodedId = rawId;
  try {
    decodedId = decodeURIComponent(rawId).trim().toLowerCase();
  } catch {
    decodedId = rawId.trim().toLowerCase();
  }

  // 1. Direct ID / name attribute match
  try {
    const directMatch =
      container.querySelector(`[id="${CSS.escape(rawId)}"]`) ||
      container.querySelector(`[id="${CSS.escape(decodedId)}"]`) ||
      container.querySelector(`[name="${CSS.escape(rawId)}"]`) ||
      container.querySelector(`[name="${CSS.escape(decodedId)}"]`);
    if (directMatch) return directMatch as HTMLElement;
  } catch {
    // If CSS.escape fails, fallback to querySelectorAll
  }

  const headings = Array.from(
    container.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')
  );

  const cleanTarget = decodedId.replace(/^#+/, '').trim();
  const normalizedTarget = cleanTarget.replace(/-+/g, '-');
  const targetWithoutDiacritics = stripVietnameseDiacritics(normalizedTarget);

  // 2. Exact slug match across headings
  for (const h of headings) {
    if (h.id) {
      const hId = h.id.toLowerCase();
      if (hId === cleanTarget || hId === normalizedTarget) {
        return h;
      }
    }

    const text = (h.textContent || '').trim();
    const headingSlug = generateHeadingSlug(text);
    const normalizedSlug = headingSlug.replace(/-+/g, '-');

    if (headingSlug === cleanTarget || normalizedSlug === normalizedTarget) {
      return h;
    }

    if (text.toLowerCase() === cleanTarget) {
      return h;
    }
  }

  // 3. Match with diacritics stripped (e.g. link without diacritics pointing to accented heading)
  for (const h of headings) {
    const text = (h.textContent || '').trim();
    const headingSlug = generateHeadingSlug(text).replace(/-+/g, '-');
    const slugWithoutDiacritics = stripVietnameseDiacritics(headingSlug);

    if (slugWithoutDiacritics === targetWithoutDiacritics) {
      return h;
    }

    const textWithoutDiacritics = stripVietnameseDiacritics(text.toLowerCase().replace(/\s+/g, '-'));
    if (textWithoutDiacritics === targetWithoutDiacritics) {
      return h;
    }
  }

  // 4. Substring / Prefix match fallback (for numbered sections or truncated slugs)
  for (const h of headings) {
    const text = (h.textContent || '').trim();
    const headingSlug = generateHeadingSlug(text).replace(/-+/g, '-');
    if (
      (cleanTarget.length >= 4 && headingSlug.startsWith(normalizedTarget)) ||
      (headingSlug.length >= 4 && normalizedTarget.startsWith(headingSlug))
    ) {
      return h;
    }
  }

  return null;
}
