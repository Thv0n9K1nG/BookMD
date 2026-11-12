import { describe, it, expect } from 'vitest';
import { scanConsolidateImages, executeConsolidateImages } from '../src/services/ipc';

describe('Image Consolidation Tool', () => {
  it('should scan markdown document with fallback in mock mode', async () => {
    const res = await scanConsolidateImages({
      markdownFile: 'guides/note.md',
      content: '# Test\n![Image](old_assets/pic.png)',
      imageDir: 'images',
    });

    expect(res.markdownFile).toBe('guides/note.md');
    expect(res.namePrefix).toBe('note');
    expect(res.namingBaseDirDisplay).toContain('Mặc định');
  });

  it('should execute consolidation fallback in mock mode', async () => {
    const content = '# Test\n![Image](old_assets/pic.png)';
    const res = await executeConsolidateImages({
      markdownFile: 'guides/note.md',
      content,
      imageDir: 'images',
      operation: 'copy',
    });

    expect(res.updatedContent).toBe(content);
    expect(res.processedCount).toBe(0);
  });
});

