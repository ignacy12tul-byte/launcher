const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const file = path.join(__dirname, '../dist/Launcher.exe');
const hash = crypto.createHash('sha256');
fs.createReadStream(file).on('data', d => hash.update(d)).on('error', e => { console.error(e.message); process.exitCode = 1; }).on('end', () => {
  fs.writeFileSync(`${file}.sha256`, `${hash.digest('hex')}  Launcher.exe\n`);
});
