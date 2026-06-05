import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('package manifest and publish contents', () => {
  it('packages the production bundle without source maps or stale compiler output', async () => {
    const manifest = JSON.parse(await readFile('package.json', 'utf8')) as {
      main: string;
      license: string;
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
      extensionKind?: string[];
      contributes: {
        viewsWelcome?: Array<{ view: string; contents: string; when?: string }>;
        viewsContainers: {
          activitybar: Array<{ id: string; title: string; icon: string }>;
        };
        views: Record<string, Array<{ id: string; name: string; icon?: string }>>;
        commands: Array<{ command: string; title: string; category?: string; icon?: string }>;
        menus?: {
          'view/item/context'?: Array<{ command: string; when: string; group?: string }>;
          'view/title'?: Array<{ command: string; when: string; group?: string }>;
        };
        configuration: {
          properties: Record<string, unknown>;
        };
      };
    };
    const vscodeIgnore = await readFile('.vscodeignore', 'utf8');

    expect(manifest.main).toBe('./dist/extension.js');
    expect(manifest.license).toBe('MIT');
    expect(manifest.extensionKind).toEqual(['ui']);
    expect(manifest.scripts['compile:production']).toBe('npm run check-types && node esbuild.js --production');
    expect(manifest.scripts['vscode:prepublish']).toBe('npm run compile:production');
    expect(manifest.scripts.package).toBe('vsce package --no-dependencies');
    expect(vscodeIgnore).toContain('out/**');
    expect(vscodeIgnore).toContain('dist/**/*.map');
    expect(vscodeIgnore).toContain('scripts/**');
    expect(vscodeIgnore).toContain('AGENTS.md');
    expect(vscodeIgnore).toContain('TODO');
    expect(vscodeIgnore).toContain('*.vsix');
    expect(manifest.scripts['install:local']).toBe(
      'vsce package --no-dependencies --out copilot-usage-extension.vsix && code --install-extension copilot-usage-extension.vsix --force && code --new-window .',
    );
    expect(manifest.scripts['generate:logos']).toBeUndefined();
    expect(manifest.scripts.update).toBeUndefined();
    expect(manifest.devDependencies.sharp).toBeUndefined();
    expect(manifest.contributes.viewsContainers.activitybar).toContainEqual({
      id: 'tonyozrCopilotUsage',
      title: 'Copilot Sessions',
      icon: 'logos/logo.svg',
    });
    expect(manifest.contributes.views.explorer).toBeUndefined();
    expect(manifest.contributes.views.tonyozrCopilotUsage).toEqual([
      {
        id: 'tonyozrCopilotUsage.views.usage',
        name: 'Copilot Sessions',
        icon: 'logos/logo.svg',
      },
    ]);
    expect(manifest.contributes.viewsWelcome).toEqual([
      {
        view: 'tonyozrCopilotUsage.views.usage',
        contents: '[Enable Copilot logs to see token use](command:tonyozrCopilotUsage.openCopilotLoggingSetting)',
        when: 'tonyozrCopilotUsage.setupNeeded',
      },
    ]);
    expect(manifest.contributes.commands.map((command) => command.title)).toEqual([
      'Copilot Token Cost: Refresh',
      'Copilot Token Cost: Show Scan Diagnostics',
      'Open Source Log',
      'Sort Sessions by Cost',
      'Sort Sessions by Time',
    ]);
    expect(manifest.contributes.commands).toContainEqual({
      command: 'tonyozrCopilotUsage.openSourceLog',
      title: 'Open Source Log',
      category: 'Copilot Token Cost',
    });
    expect(manifest.contributes.commands).toContainEqual({
      command: 'tonyozrCopilotUsage.sortSessionsByCost',
      title: 'Sort Sessions by Cost',
      category: 'Copilot Token Cost',
      icon: '$(sort-precedence)',
    });
    expect(manifest.contributes.commands).toContainEqual({
      command: 'tonyozrCopilotUsage.sortSessionsByTime',
      title: 'Sort Sessions by Time',
      category: 'Copilot Token Cost',
      icon: '$(history)',
    });
    expect(manifest.contributes.menus?.['view/title']).toContainEqual({
      command: 'tonyozrCopilotUsage.sortSessionsByCost',
      when: 'view == tonyozrCopilotUsage.views.usage && tonyozrCopilotUsage.sortMode == time',
      group: 'navigation@2',
    });
    expect(manifest.contributes.menus?.['view/title']).toContainEqual({
      command: 'tonyozrCopilotUsage.sortSessionsByTime',
      when: 'view == tonyozrCopilotUsage.views.usage && tonyozrCopilotUsage.sortMode == cost',
      group: 'navigation@2',
    });
    expect(manifest.contributes.menus?.['view/item/context']).toContainEqual({
      command: 'tonyozrCopilotUsage.openSourceLog',
      when: 'view == tonyozrCopilotUsage.views.usage && viewItem == chat',
      group: 'navigation@1',
    });
    expect(Object.keys(manifest.contributes.configuration.properties)).toEqual(['tonyozrCopilotUsage.dataPath']);
  });

  it('debugs the bundled output used by the extension host', async () => {
    const launch = JSON.parse(await readFile('.vscode/launch.json', 'utf8')) as {
      configurations: Array<{ outFiles?: string[] }>;
    };

    expect(launch.configurations[0].outFiles).toEqual(['${workspaceFolder}/dist/**/*.js']);
  });
});
