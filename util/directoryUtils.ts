import { resolve, sep } from 'path';
import { Stats } from 'fs';
import { readdir, lstat } from 'fs/promises';

export const ROOT_DIR = resolve(__dirname, '..');

export function fromRoot(path: string | string[]): string {
  const segments: string[] = typeof path === 'string' ? path.split(/[/\\]/).filter(seg => seg !== '') : path;
  return resolve(ROOT_DIR, ...segments);
}

/**
 * @description returns absolute path of directories within
 * location passed as path argument
 */
export async function getDirectoriesAtPath(path: string) {
  const names: string[] = await readdir(path);
  const directories: string[] = [];

  const statPromises: Promise<Stats>[] = [];
  for (const name of names) {
    statPromises.push(lstat(resolve(path, name)));
  }
  const stats = await Promise.all(statPromises);

  for (let i = 0; i < stats.length; i++) {
    if (stats[i].isDirectory()) {
      directories.push(resolve(path, names[i]));
    }
  }

  return directories;
}

export async function getPackageDirectories(includeRoot = false) {
  const packages = await getDirectoriesAtPath(resolve(ROOT_DIR, 'packages'));
  return includeRoot ? packages.concat(ROOT_DIR) : packages;
}

export async function getPackageNames() {
  const packages = await getPackageDirectories();
  return packages.map(p => p.split(sep).pop());
}
