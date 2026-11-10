const crypto = require('node:crypto');

function offlineProfile(name) {
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name || '')) throw new Error('Nick musi mieć 3–16 znaków: litery, cyfry lub _.');
  const hash = crypto.createHash('md5').update(`OfflinePlayer:${name}`).digest();
  hash[6] = (hash[6] & 15) | 48;
  hash[8] = (hash[8] & 63) | 128;
  return { name, uuid: hash.toString('hex'), access_token: '0', client_token: '0', user_properties: '{}' };
}

function memory(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 2 || number > 32) throw new Error('Wybierz od 2 do 32 GB RAM.');
  return { min: '1G', max: `${number}G` };
}

function validateLaunch(input, versions) {
  const version = versions.find(v => v.id === input.version);
  if (!version) throw new Error('Wybierz wersję z oficjalnej listy Minecraft.');
  if (!['microsoft', 'offline'].includes(input.mode)) throw new Error('Nieznany tryb konta.');
  return { version, memory: memory(input.ram) };
}

module.exports = { offlineProfile, memory, validateLaunch };
