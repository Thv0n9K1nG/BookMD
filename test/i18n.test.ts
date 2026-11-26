import { describe, it, expect } from 'vitest';
import { vi } from '../src/i18n/vi';
import { en } from '../src/i18n/en';
import { translate, interpolate, getNestedValue } from '../src/i18n/index';
import { KEYBINDING_DEFINITIONS } from '../src/utils/keybindings';

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
    expect(vi.welcome.subtitle).not.toBe(en.welcome.subtitle);
  });

  it('should have complete keybinding translations for every action in both languages', () => {
    for (const def of KEYBINDING_DEFINITIONS) {
      const viName = translate('vi', `keybindings.${def.id}.name`);
      const enName = translate('en', `keybindings.${def.id}.name`);
      const viDesc = translate('vi', `keybindings.${def.id}.description`);
      const enDesc = translate('en', `keybindings.${def.id}.description`);

      expect(viName).not.toBe(`keybindings.${def.id}.name`);
      expect(enName).not.toBe(`keybindings.${def.id}.name`);
      expect(viDesc).not.toBe(`keybindings.${def.id}.description`);
      expect(enDesc).not.toBe(`keybindings.${def.id}.description`);
      expect(enName).not.toBe(viName);
    }
  });
});
