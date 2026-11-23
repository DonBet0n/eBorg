import fs from 'fs';
import path from 'path';
import { FONT_SCALE } from '../../constants/Theme';

// Стежить, щоб розміри шрифтів у коді брались лише зі шкали constants/Theme.ts
const ROOT = path.resolve(__dirname, '../..');
const IGNORED: string[] = [];

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith('.tsx') && !IGNORED.includes(entry.name) ? [full] : [];
  });

describe('шкала шрифтів', () => {
  it('у коді немає розмірів поза шкалою', () => {
    const offScale: string[] = [];
    ['app', 'components'].forEach(dir => {
      sourceFiles(path.join(ROOT, dir)).forEach(file => {
        fs.readFileSync(file, 'utf-8').split('\n').forEach((line, index) => {
          for (const match of line.matchAll(/fontSize: *\(?(\d+)/g)) {
            if (!FONT_SCALE.includes(Number(match[1]))) {
              offScale.push(`${path.relative(ROOT, file)}:${index + 1} → ${match[1]}`);
            }
          }
        });
      });
    });
    expect(offScale).toEqual([]);
  });
});
