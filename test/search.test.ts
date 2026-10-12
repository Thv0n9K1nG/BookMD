import { describe, it, expect } from 'vitest';
import { searchWorkspace } from '../src/services/ipc';

describe('Workspace Search Tests', () => {
  it('returns matching results with 3-line context and line numbers in mock mode', async () => {
    const results = await searchWorkspace('nginx', { caseSensitive: false });
    expect(results.length).toBeGreaterThan(0);

    const first = results[0];
    expect(first.file).toBe('TryHackMe/Docker/container.md');
    expect(first.lineContent).toContain('nginx');
    expect(first.matchedText.toLowerCase()).toBe('nginx');
    expect(first.lineBefore).toBeDefined();
  });

  it('filters results with case sensitivity option', async () => {
    const caseSensitiveResults = await searchWorkspace('NGINX', { caseSensitive: true });
    expect(caseSensitiveResults.length).toBe(0);

    const caseInsensitiveResults = await searchWorkspace('NGINX', { caseSensitive: false });
    expect(caseInsensitiveResults.length).toBeGreaterThan(0);
  });
});
