import { existsSync, lstatSync, mkdirSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.join(repoRoot, 'apps/web');
const appModules = path.join(appRoot, 'node_modules');
const rootModules = path.join(repoRoot, 'node_modules');

const packages = ['react', 'react-dom'];

mkdirSync(appModules, { recursive: true });

for (const pkg of packages) {
  const source = path.join(rootModules, pkg);
  const target = path.join(appModules, pkg);

  if (!existsSync(source)) {
    console.warn(`link-workspace-deps: missing ${source}, run npm install at repo root`);
    continue;
  }

  if (existsSync(target)) {
    const stat = lstatSync(target);
    if (stat.isSymbolicLink()) continue;
    console.warn(`link-workspace-deps: ${target} exists and is not a symlink, skipping`);
    continue;
  }

  symlinkSync(source, target, 'dir');
  console.log(`link-workspace-deps: linked ${pkg}`);
}
