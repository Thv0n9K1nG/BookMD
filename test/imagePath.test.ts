import { describe, it, expect } from 'vitest';
import {
  normalizePathSegments,
  resolveImageSource,
  buildImageHtmlTag,
  cacheImageWidth,
  getCachedImageWidth,
} from '../src/utils/imagePath';

describe('normalizePathSegments', () => {
  it('handles basic and complex relative segments', () => {
    expect(
      normalizePathSegments('C:/PROJECT/BookMD/assets/images/Notes_1.png')
    ).toBe('C:/PROJECT/BookMD/assets/images/Notes_1.png');

    expect(
      normalizePathSegments('C:/PROJECT/BookMD/TryHackMe/Docker/../../img/pic.png')
    ).toBe('C:/PROJECT/BookMD/img/pic.png');

    expect(
      normalizePathSegments('C:\\PROJECT\\BookMD\\assets\\..\\img\\test.png')
    ).toBe('C:/PROJECT/BookMD/img/test.png');

    expect(
      normalizePathSegments('/home/user/project/doc/../img/photo.png')
    ).toBe('/home/user/project/img/photo.png');
  });
});

describe('resolveImageSource', () => {
  it('retains remote, data, and blob URLs unchanged', () => {
    const httpsUrl = 'https://example.com/images/diagram.png';
    expect(resolveImageSource(httpsUrl, 'README.md', 'C:/PROJECT/BookMD')).toBe(httpsUrl);

    const httpUrl = 'http://localhost:3000/pic.png';
    expect(resolveImageSource(httpUrl, 'README.md', 'C:/PROJECT/BookMD')).toBe(httpUrl);

    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ';
    expect(resolveImageSource(dataUri, 'README.md', 'C:/PROJECT/BookMD')).toBe(dataUri);

    const assetUrl = 'asset://localhost/C:/path/to/img.png';
    expect(resolveImageSource(assetUrl, 'README.md', 'C:/PROJECT/BookMD')).toBe(assetUrl);
  });

  it('resolves document-relative paths correctly for preview and export', () => {
    // Document in workspace root
    const res1 = resolveImageSource(
      'assets/images/Notes_1.png',
      'README.md',
      'C:/PROJECT/BookMD'
    );
    expect(res1).toBe('C:/PROJECT/BookMD/assets/images/Notes_1.png');

    // Document in nested folder with nested image dir
    const res2 = resolveImageSource(
      'img/Notes_1.png',
      'TryHackMe/Docker/image.md',
      'C:/PROJECT/BookMD'
    );
    expect(res2).toBe('C:/PROJECT/BookMD/TryHackMe/Docker/img/Notes_1.png');

    // Document in nested folder referencing workspace-level image via ../..
    const res3 = resolveImageSource(
      '../../img/TryHackMe_Docker_image_1.png',
      'TryHackMe/Docker/image.md',
      'C:/PROJECT/BookMD'
    );
    expect(res3).toBe('C:/PROJECT/BookMD/img/TryHackMe_Docker_image_1.png');

    // Workspace-root-relative reference with leading slash
    const res4 = resolveImageSource(
      '/img/custom_logo.png',
      'TryHackMe/Docker/image.md',
      'C:/PROJECT/BookMD'
    );
    expect(res4).toBe('C:/PROJECT/BookMD/img/custom_logo.png');
  });

  it('handles URL-encoded paths and spaces', () => {
    const res = resolveImageSource(
      'assets/images/My%20Image%201.png',
      'README.md',
      'C:/PROJECT/BookMD'
    );
    expect(res).toBe('C:/PROJECT/BookMD/assets/images/My Image 1.png');
  });
});

describe('buildImageHtmlTag', () => {
  it('generates HTML <img> tag with exact width when width is provided', () => {
    expect(buildImageHtmlTag('assets/images/photo.png', '', '', 1920)).toBe(
      '<img src="assets/images/photo.png" title="" alt="" width="1920"/>'
    );
    expect(buildImageHtmlTag('assets/images/photo.png', 'My Alt', '', 800)).toBe(
      '<img src="assets/images/photo.png" title="" alt="My Alt" width="800"/>'
    );
  });

  it('omits width attribute when width is null or undefined or 0', () => {
    expect(buildImageHtmlTag('assets/images/photo.png', '', '')).toBe(
      '<img src="assets/images/photo.png" title="" alt=""/>'
    );
    expect(buildImageHtmlTag('assets/images/photo.png', 'Caption', '', null)).toBe(
      '<img src="assets/images/photo.png" title="" alt="Caption"/>'
    );
  });
});

describe('imageWidthCache', () => {
  it('caches and retrieves image widths correctly', () => {
    cacheImageWidth('test/sample.png', 1024);
    expect(getCachedImageWidth('test/sample.png')).toBe(1024);
    expect(getCachedImageWidth('unknown.png')).toBeNull();
  });
});

