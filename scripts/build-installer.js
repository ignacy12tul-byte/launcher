const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const candidates = [process.env.MAKENSIS, 'makensis', 'C:\\Program Files (x86)\\NSIS\\makensis.exe'];
const cache = process.env.ELECTRON_BUILDER_CACHE || path.join(os.homedir(), '.cache/electron-builder');
function discover(directory, depth = 0) {
  if (depth > 4 || !fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) discover(file, depth + 1);
    else if (entry.name === (process.platform === 'win32' ? 'makensis.exe' : 'makensis')) candidates.push(file);
  }
}
discover(cache);
for (const command of candidates.filter(Boolean)) {
  const env = { ...process.env };
  for (const parent of [path.dirname(command), path.dirname(path.dirname(command))]) {
    if (fs.existsSync(path.join(parent, 'Stubs'))) env.NSISDIR = parent;
  }
  const check = spawnSync(command, ['-VERSION'], { encoding: 'utf8', env });
  if (check.status !== 0) continue;
  fs.mkdirSync(path.join(__dirname, '../dist'), { recursive: true });
  const args = process.argv.includes('--embedded') ? ['-DEMBEDDED', 'installer.nsi'] : ['installer.nsi'];
  const result = spawnSync(command, args, { cwd: path.join(__dirname, '../installer'), stdio: 'inherit', env });
  process.exit(result.status ?? 1);
}
console.error('Nie znaleziono NSIS. Najpierw npm run build:win lub zainstaluj NSIS 3.');
process.exit(1);
