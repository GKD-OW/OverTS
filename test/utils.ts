import { readFileSync } from 'fs';
import { resolve } from 'path';

export { resolve } from 'path';

export const DATA_DIR = resolve(__dirname, 'data');

export function read(path: string) {
  return readFileSync(path, {
    encoding: 'UTF8'
  });
}

export function readData(path: string) {
  return read(resolve(DATA_DIR, path));
}