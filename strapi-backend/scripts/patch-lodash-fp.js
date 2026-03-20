'use strict';
const path = require('path');
const { writeFileSync, readFileSync } = require('fs');

const lodashDir = path.join(__dirname, '../node_modules/lodash');

function makeShim(cjsFile, shimFile, varName) {
  const mod = require(path.join(lodashDir, cjsFile));
  const names = Object.keys(mod);
  const exportLines = names
    .map(n => `export const ${n} = ${varName}[${JSON.stringify(n)}];`)
    .join('\n');
  const mjs = [
    `import { createRequire as _cr } from 'node:module';`,
    `const _req = _cr(import.meta.url);`,
    `const ${varName} = _req('./${cjsFile}');`,
    `export default ${varName};`,
    exportLines,
  ].join('\n');
  writeFileSync(path.join(lodashDir, shimFile), mjs);
  console.log(`✓ created lodash/${shimFile} with ${names.length} named exports`);
}

// Shim for lodash (base) and lodash/fp
makeShim('lodash.js', 'lodash.mjs', '_lodash');
makeShim('fp.js', 'fp.mjs', '_fp');

// Patch lodash/package.json exports to redirect ESM → shims
const pkgPath = path.join(lodashDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.exports = {
  '.':          { import: './lodash.mjs', require: './lodash.js', default: './lodash.js' },
  './fp':       { import: './fp.mjs',     require: './fp.js',     default: './fp.js' },
  './fp.js':    { import: './fp.mjs',     require: './fp.js',     default: './fp.js' },
  './lodash':   { import: './lodash.mjs', require: './lodash.js', default: './lodash.js' },
  './*':        './*.js',
};
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('✓ patched lodash/package.json exports');
