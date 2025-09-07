#!/usr/bin/env node
/* Simple verification that @vitejs/plugin-react is present in dependencies or devDependencies. */
const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(process.cwd(), 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error('[verify-plugin-react] package.json not found.');
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
if (deps['@vitejs/plugin-react']) {
  console.log('[verify-plugin-react] OK: @vitejs/plugin-react is installed.');
  process.exit(0);
} else {
  console.error('[verify-plugin-react] ERROR: @vitejs/plugin-react missing. Run: npm install -D @vitejs/plugin-react');
  process.exit(2);
}