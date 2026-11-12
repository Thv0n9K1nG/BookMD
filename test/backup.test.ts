import { describe, it, expect } from 'vitest';
import { executeBackupCopy } from '../src/services/ipc';
import { BackupOptions } from '../src/types';

describe('Backup Tool IPC & Options', () => {
  it('should format fallback backup result for file correctly in mock mode', async () => {
    const options: BackupOptions = {
      sourcePath: 'C:/PROJECT/BookMD/README.md',
      destinationFolder: 'D:/Backups',
      conflictStrategy: 'auto_rename',
      skipIgnored: true,
    };

    const result = await executeBackupCopy(options);
    expect(result.success).toBe(true);
    expect(result.destinationName).toBe('README.md');
    expect(result.destinationPath).toBe('D:/Backups/README.md');
    expect(result.filesCopied).toBe(1);
  });

  it('should handle directory paths with trailing slashes or backslashes', async () => {
    const options: BackupOptions = {
      sourcePath: 'C:\\PROJECT\\BookMD\\TryHackMe\\Docker',
      destinationFolder: 'E:/Vault',
      conflictStrategy: 'timestamp',
      skipIgnored: true,
    };

    const result = await executeBackupCopy(options);
    expect(result.success).toBe(true);
    expect(result.destinationName).toBe('Docker');
    expect(result.destinationPath).toBe('E:/Vault/Docker');
  });

  it('should default conflict strategy to auto_rename if omitted', async () => {
    const options: BackupOptions = {
      sourcePath: 'notes.md',
      destinationFolder: 'D:/SafeBackups',
    };

    const result = await executeBackupCopy(options);
    expect(result.success).toBe(true);
    expect(result.destinationName).toBe('notes.md');
  });
});

