import { describe, it, expect } from 'vitest';
import { vi } from '../src/i18n/vi';
import { en } from '../src/i18n/en';
import { translate, interpolate, getNestedValue } from '../src/i18n/index';

function getAllKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = [];
  for (const k of Object.keys(obj)) {
    const nextPrefix = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      keys = keys.concat(getAllKeys(obj[k], nextPrefix));
    } else {
      keys.push(nextPrefix);
    }
  }
  return keys;
}

describe('i18n Localization System', () => {
  it('should have exact key parity between Vietnamese and English dictionaries', () => {
    const viKeys = getAllKeys(vi).sort();
    const enKeys = getAllKeys(en).sort();

    expect(viKeys).toEqual(enKeys);
    expect(viKeys.length).toBeGreaterThan(50);
  });

  it('should interpolate parameters correctly in templates', () => {
    const template = 'Đã mở workspace: {name} với {count} file';
    const result = interpolate(template, { name: 'BookMD', count: 42 });
    expect(result).toBe('Đã mở workspace: BookMD với 42 file');
  });

  it('should retrieve nested translation values via getNestedValue', () => {
    expect(getNestedValue(vi, 'header.openFile')).toBe('Mở file Markdown... (Ctrl+O)');
    expect(getNestedValue(en, 'header.openFile')).toBe('Open Markdown file... (Ctrl+O)');
    expect(getNestedValue(vi, 'non.existent.key')).toBe('non.existent.key');
  });

  it('should translate correctly using translate() helper', () => {
    expect(translate('vi', 'common.save')).toBe('Lưu');
    expect(translate('en', 'common.save')).toBe('Save');
    expect(translate('vi', 'toasts.fileSaved', { name: 'note.md' })).toBe('Đã lưu note.md');
    expect(translate('en', 'toasts.fileSaved', { name: 'note.md' })).toBe('Saved note.md');
  });
});
