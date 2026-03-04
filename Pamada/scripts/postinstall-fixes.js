const fs = require('fs');
const path = require('path');

function ensureDebuggerFrontendEntry() {
  const packageDir = path.join(
    __dirname,
    '..',
    'node_modules',
    '@react-native',
    'debugger-frontend'
  );
  const distDir = path.join(packageDir, 'dist', 'third-party', 'front_end');
  const entryFile = path.join(packageDir, 'index.js');
  const expectedEntry = `'use strict';\nmodule.exports = require('path').join(__dirname, 'dist', 'third-party', 'front_end');\n`;

  if (!fs.existsSync(packageDir)) {
    console.log('[postinstall-fixes] @react-native/debugger-frontend not found');
    return;
  }

  if (!fs.existsSync(distDir)) {
    console.log('[postinstall-fixes] debugger frontend dist directory is missing');
    return;
  }

  let current = '';
  if (fs.existsSync(entryFile)) {
    current = fs.readFileSync(entryFile, 'utf8');
  }

  const hasCorrectPath =
    current.includes("path.join(__dirname, 'dist', 'third-party', 'front_end')") ||
    current.includes('REACT_NATIVE_DEBUGGER_FRONTEND_PATH');

  if (!hasCorrectPath) {
    fs.writeFileSync(entryFile, expectedEntry, 'utf8');
    console.log('[postinstall-fixes] patched @react-native/debugger-frontend/index.js');
  }
}

ensureDebuggerFrontendEntry();
