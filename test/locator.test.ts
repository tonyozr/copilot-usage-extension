import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { locateCopilotDataPaths } from '../src/core/locator';

describe('locateCopilotDataPaths', () => {
  const roots: string[] = [];
  const originalAppData = process.env.APPDATA;
  const originalHome = process.env.HOME;

  afterEach(async () => {
    process.env.APPDATA = originalAppData;
    process.env.HOME = originalHome;
    await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
    roots.length = 0;
  });

  it('includes VS Code global and workspace storage roots', async () => {
    const appData = await mkdtemp(join(tmpdir(), 'copilot-usage-appdata-'));
    const home = await mkdtemp(join(tmpdir(), 'copilot-usage-home-'));
    roots.push(appData, home);
    process.env.APPDATA = appData;
    process.env.HOME = home;

    const globalStorage = join(appData, 'Code', 'User', 'globalStorage');
    const workspaceStorage = join(appData, 'Code', 'User', 'workspaceStorage');
    await mkdir(globalStorage, { recursive: true });
    await mkdir(workspaceStorage, { recursive: true });

    await expect(locateCopilotDataPaths('')).resolves.toEqual([globalStorage, workspaceStorage]);
  });

  it('includes remote SSH VS Code server storage roots from the remote home directory', async () => {
    const home = await mkdtemp(join(tmpdir(), 'copilot-usage-remote-home-'));
    roots.push(home);
    process.env.HOME = home;
    delete process.env.APPDATA;

    const globalStorage = join(home, '.vscode-server', 'data', 'User', 'globalStorage');
    const workspaceStorage = join(home, '.vscode-server', 'data', 'User', 'workspaceStorage');
    await mkdir(globalStorage, { recursive: true });
    await mkdir(workspaceStorage, { recursive: true });

    await expect(locateCopilotDataPaths('')).resolves.toEqual([globalStorage, workspaceStorage]);
  });

  it('includes remote session VS Code storage roots from ~/.vscode-remote', async () => {
    const home = await mkdtemp(join(tmpdir(), 'copilot-usage-remote-home-'));
    roots.push(home);
    process.env.HOME = home;
    delete process.env.APPDATA;

    const globalStorage = join(home, '.vscode-remote', 'data', 'User', 'globalStorage');
    const workspaceStorage = join(home, '.vscode-remote', 'data', 'User', 'workspaceStorage');
    await mkdir(globalStorage, { recursive: true });
    await mkdir(workspaceStorage, { recursive: true });

    await expect(locateCopilotDataPaths('')).resolves.toEqual([globalStorage, workspaceStorage]);
  });
});
