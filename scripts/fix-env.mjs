/**
 * fix-env.mjs
 * Joins any accidentally-wrapped lines in .env back into single lines.
 * Run automatically before `npm run dev` and `npm run dev:fast`.
 *
 * Root cause: some editors/tools hard-wrap long lines when saving .env files,
 * splitting JWT tokens across two lines. This breaks Vite's env injection.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');

try {
  const content = readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  const fixed = [];

  for (const line of lines) {
    // A continuation line has no '=' sign, is not blank, and is not a comment
    if (line && !line.includes('=') && !line.startsWith('#') && fixed.length > 0) {
      fixed[fixed.length - 1] += line;  // join to previous line
    } else {
      fixed.push(line);
    }
  }

  const result = fixed.join('\n');

  if (result !== content) {
    writeFileSync(envPath, result, 'utf8');
    console.log('✅ fix-env: repaired wrapped lines in .env');

    // Log which keys were affected
    for (const line of fixed) {
      if (line.includes('=')) {
        const [key, ...rest] = line.split('=');
        const val = rest.join('=');
        if (val.startsWith('eyJ')) {
          console.log(`   ${key}: ${val.length} chars, ${(val.match(/\./g) || []).length} dots`);
        }
      }
    }
  } else {
    console.log('✅ fix-env: .env looks clean, no changes needed');
  }
} catch (err) {
  // Non-fatal — don't block dev server startup
  console.warn('⚠️  fix-env: could not process .env:', err.message);
}
