// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import {
  isSvgUrl,
  isRawSvgString,
  decodeSvgDataUri,
  isStandaloneImageHtml,
  hasSvgInClipboard,
  extractSvgFromHtml,
  extractSvgFromClipboard,
  parseSvgLengthToPx,
  computeSvgRenderDimensions,
} from '../src/utils/svgPaste';

// Mock ipc fetchSvgText
vi.mock('../src/services/ipc', () => ({
  fetchSvgText: vi.fn(async (url: string) => {
    if (url.includes('tryhackme.com') || url.endsWith('.svg')) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 620"><circle cx="100" cy="100" r="50" fill="red"/></svg>`;
    }
    return '';
  }),
}));

describe('SVG Paste Utility', () => {
  describe('isSvgUrl', () => {
    it('should correctly identify SVG URLs', () => {
      expect(
        isSvgUrl(
          'https://cdn-images.tryhackme.com/user-uploads/645b19f5d5848d004ab9c9e2/room-content/test.svg'
        )
      ).toBe(true);
      expect(isSvgUrl('https://example.com/icon.svg?v=123')).toBe(true);
      expect(isSvgUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBe(true);
      expect(isSvgUrl('https://example.com/pic.png')).toBe(false);
      expect(isSvgUrl('')).toBe(false);
    });
  });

  describe('isRawSvgString', () => {
    it('should recognize valid SVG markup', () => {
      expect(isRawSvgString('<svg viewBox="0 0 100 100"><rect/></svg>')).toBe(true);
      expect(
        isRawSvgString('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>')
      ).toBe(true);
      expect(isRawSvgString('Just some regular text')).toBe(false);
      expect(isRawSvgString('<p>Not an svg</p>')).toBe(false);
    });
  });

  describe('decodeSvgDataUri', () => {
    it('should decode base64 and url-encoded SVGs', () => {
      const base64Uri = 'data:image/svg+xml;base64,' + btoa('<svg><circle/></svg>');
      expect(decodeSvgDataUri(base64Uri)).toBe('<svg><circle/></svg>');

      const urlEncoded = 'data:image/svg+xml;utf8,%3Csvg%3E%3Ccircle/%3E%3C/svg%3E';
      expect(decodeSvgDataUri(urlEncoded)).toBe('<svg><circle/></svg>');
    });
  });

  describe('hasSvgInClipboard', () => {
    it('should return true for TryHackMe clipboard HTML with <img src="...svg">', () => {
      const mockClipboard = {
        items: [],
        getData: (format: string) => {
          if (format === 'text/html') {
            return `<html><body><!--StartFragment--><img src="https://cdn-images.tryhackme.com/user-uploads/645b19f5d5848d004ab9c9e2/room-content/645b19f5d5848d004ab9c9e2-1776682977409.svg" alt="How FFuF Determines valid username"/><!--EndFragment--></body></html>`;
          }
          return '';
        },
      } as unknown as DataTransfer;

      expect(hasSvgInClipboard(mockClipboard)).toBe(true);
    });

    it('should return true for inline <svg> in HTML', () => {
      const mockClipboard = {
        items: [],
        getData: (format: string) => {
          if (format === 'text/html') {
            return `<div><svg viewBox="0 0 100 100"><path d="M0 0"/></svg></div>`;
          }
          return '';
        },
      } as unknown as DataTransfer;

      expect(hasSvgInClipboard(mockClipboard)).toBe(true);
    });

    it('should return true for clipboard item with type image/svg+xml', () => {
      const mockClipboard = {
        items: [
          {
            type: 'image/svg+xml',
            kind: 'file',
            getAsFile: () => ({ name: 'diagram.svg' }),
          },
        ],
        getData: () => '',
      } as unknown as DataTransfer;

      expect(hasSvgInClipboard(mockClipboard)).toBe(true);
    });

    it('should return false for regular HTML or plain text without SVG', () => {
      const mockClipboard = {
        items: [],
        getData: (format: string) => {
          if (format === 'text/html') return `<p>Hello <strong>World</strong></p>`;
          if (format === 'text/plain') return `Hello World`;
          return '';
        },
      } as unknown as DataTransfer;

      expect(hasSvgInClipboard(mockClipboard)).toBe(false);
    });

    it('should return false for rich text containing paragraphs with inline decorative SVG icons', () => {
      const mockClipboard = {
        items: [],
        getData: (format: string) => {
          if (format === 'text/html') {
            return `<html><body><!--StartFragment--><p class="desc">Learn how to defeat logins and other authentication mechanisms to allow you access to unpermitted areas.</p><div><svg class="svg-inline--fa fa-signal-bars-weak" viewBox="0 0 640 512"><path d="M192 304"/></svg></div><!--EndFragment--></body></html>`;
          }
          return '';
        },
      } as unknown as DataTransfer;

      expect(hasSvgInClipboard(mockClipboard)).toBe(false);
    });
  });

  describe('isStandaloneImageHtml', () => {
    it('returns true for pure <img> tag or standalone <svg>', () => {
      expect(isStandaloneImageHtml('<img src="https://example.com/pic.svg"/>')).toBe(true);
      expect(
        isStandaloneImageHtml(
          '<html><body><!--StartFragment--><img src="https://cdn-images.tryhackme.com/pic.svg"/><!--EndFragment--></body></html>'
        )
      ).toBe(true);
      expect(
        isStandaloneImageHtml(
          '<div><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg></div>'
        )
      ).toBe(true);
    });

    it('returns false for rich text containing paragraph and inline svg icon', () => {
      const richText = `<html><body><!--StartFragment--><p>Learn how to defeat logins and other mechanisms.</p><div><svg viewBox="0 0 640 512"><path d="M0 0"/></svg></div><!--EndFragment--></body></html>`;
      expect(isStandaloneImageHtml(richText)).toBe(false);
    });
  });

  describe('extractSvgFromClipboard', () => {
    it('should extract remote SVG from TryHackMe image HTML tag', async () => {
      const mockClipboard = {
        items: [],
        getData: (format: string) => {
          if (format === 'text/html') {
            return `<img src="https://cdn-images.tryhackme.com/user-uploads/645b19f5d5848d004ab9c9e2/room-content/645b19f5d5848d004ab9c9e2-1776682977409.svg" alt="FFuF"/>`;
          }
          return '';
        },
      } as unknown as DataTransfer;

      const svgXml = await extractSvgFromClipboard(mockClipboard);
      expect(svgXml).toBeTruthy();
      expect(svgXml).toContain('<svg');
      expect(svgXml).toContain('viewBox="0 0 1200 620"');
    });

    it('should extract inline SVG element from HTML', async () => {
      const mockClipboard = {
        items: [],
        getData: (format: string) => {
          if (format === 'text/html') {
            return `<div><svg viewBox="0 0 200 200"><rect width="100" height="100"/></svg></div>`;
          }
          return '';
        },
      } as unknown as DataTransfer;

      const svgXml = await extractSvgFromClipboard(mockClipboard);
      expect(svgXml).toBeTruthy();
      expect(svgXml).toContain('viewBox="0 0 200 200"');
    });

    it('should extract raw SVG string from plain text', async () => {
      const raw = `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><circle cx="25" cy="25" r="20"/></svg>`;
      const mockClipboard = {
        items: [],
        getData: (format: string) => {
          if (format === 'text/plain') return raw;
          return '';
        },
      } as unknown as DataTransfer;

      const svgXml = await extractSvgFromClipboard(mockClipboard);
      expect(svgXml).toBe(raw);
    });
  });

  describe('parseSvgLengthToPx & computeSvgRenderDimensions (HiDPI clarity)', () => {
    it('ignores percentage dimensions and converts CSS length units accurately', () => {
      expect(parseSvgLengthToPx('100%')).toBeNull();
      expect(parseSvgLengthToPx('50%')).toBeNull();
      expect(parseSvgLengthToPx('120')).toBe(120);
      expect(parseSvgLengthToPx('120px')).toBe(120);
      expect(parseSvgLengthToPx('90pt')).toBeCloseTo(120, 1);
      expect(parseSvgLengthToPx('1in')).toBe(96);
    });

    it('uses viewBox instead of 100 when SVG specifies width="100%" height="100%" and oversamples for HiDPI sharpness', () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1200 620"><rect width="1200" height="620"/></svg>',
        'image/svg+xml'
      );
      const svgEl = doc.querySelector('svg')!;
      const dims = computeSvgRenderDimensions(svgEl, 1.5);

      expect(dims.displayWidth).toBe(1200);
      expect(dims.displayHeight).toBe(620);
      expect(dims.rasterScale).toBeGreaterThanOrEqual(2);
      expect(dims.rasterWidth).toBeGreaterThanOrEqual(2400);
      expect(dims.rasterHeight).toBeGreaterThanOrEqual(1240);
      expect(dims.rasterWidth).toBeLessThanOrEqual(3600);
    });

    it('oversamples medium diagrams 3x while preserving logical display width', () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(
        '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><circle cx="300" cy="200" r="100"/></svg>',
        'image/svg+xml'
      );
      const svgEl = doc.querySelector('svg')!;
      const dims = computeSvgRenderDimensions(svgEl, 1);

      expect(dims.displayWidth).toBe(600);
      expect(dims.displayHeight).toBe(400);
      expect(dims.rasterWidth).toBe(1800);
      expect(dims.rasterHeight).toBe(1200);
    });
  });
});
