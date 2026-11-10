const { app, BrowserWindow, ipcMain, shell, dialog, safeStorage } = require('electron');
const { Client } = require('minecraft-launcher-core');
const { Authflow, Titles } = require('prismarine-auth');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { offlineProfile, validateLaunch } = require('./core');
const exec = promisify(execFile);
let win, flow, profile, versions = [], busy = false, authBusy = false;
const manifestURL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const dataDir = () => path.join(app.getPath('userData'), 'minecraft');
const send = (channel, data) => { if (win && !win.isDestroyed()) win.webContents.send(channel, data); };

async function json(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Serwer pobierania zwrócił HTTP ${r.status}.`);
  return r.json();
}

// Auth caches contain refresh tokens. Protect their contents with Windows DPAPI.
function cacheFactory({ cacheName }) {
  const filename = path.join(app.getPath('userData'), 'auth', `${cacheName}.bin`);
  let cache = {};
  const ready = (async () => {
    try { cache = JSON.parse(safeStorage.decryptString(await fs.readFile(filename))); }
    catch (e) { if (e.code !== 'ENOENT') throw new Error('Nie udało się odczytać chronionego konta. Wyloguj się i zaloguj ponownie.'); }
  })();
  const save = async () => {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Systemowe szyfrowanie konta jest niedostępne.');
    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, safeStorage.encryptString(JSON.stringify(cache)), { mode: 0o600 });
  };
  return {
    async getCached() { await ready; return cache; },
    async setCached(value) { await ready; cache = value; await save(); },
    async setCachedPartial(value) { await ready; cache = { ...cache, ...value }; await save(); }
  };
}

async function authenticate() {
  if (authBusy) throw new Error('Logowanie jest już w toku.');
  authBusy = true;
  try {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Brak systemowego szyfrowania danych logowania.');
    flow ||= new Authflow('minverse', cacheFactory, {
      authTitle: Titles.MinecraftNintendoSwitch, deviceType: 'Nintendo', flow: 'live'
    }, code => {
      send('login-code', { code: code.user_code, url: 'https://www.microsoft.com/link' });
      shell.openExternal('https://www.microsoft.com/link').catch(() => {});
    });
    const result = await flow.getMinecraftJavaToken({ fetchProfile: true });
    if (!result.profile?.id) throw new Error('To konto nie posiada profilu Minecraft Java.');
    profile = { access_token: result.token, client_token: result.profile.id, uuid: result.profile.id, name: result.profile.name, user_properties: '{}', meta: { type: 'msa' } };
    send('account-updated', { name: profile.name });
    return { name: profile.name };
  } finally { authBusy = false; send('login-finished'); }
}

async function loadVersions() {
  const cache = path.join(app.getPath('userData'), 'versions.json');
  try {
    const manifest = await json(manifestURL);
    versions = manifest.versions;
    await fs.writeFile(cache, JSON.stringify(versions));
  } catch (e) {
    try { versions = JSON.parse(await fs.readFile(cache, 'utf8')); }
    catch { throw new Error('Nie można pobrać listy wersji. Sprawdź połączenie z internetem.'); }
  }
  return versions.map(({ id, type, releaseTime }) => ({ id, type, releaseTime }));
}

async function launch(input) {
  if (busy) throw new Error('Gra jest już uruchomiona albo trwa przygotowanie plików.');
  const selected = validateLaunch(input, versions);
  busy = true;
  send('state', 'Przygotowywanie gry…');
  try {
    const authorization = input.mode === 'microsoft' ? (await authenticate(), profile) : offlineProfile(input.nick);
    const metadataDir = path.join(dataDir(), 'versions', selected.version.id);
    const metadataFile = path.join(metadataDir, `${selected.version.id}.json`);
    let metadata;
    try { metadata = await json(selected.version.url); }
    catch {
      try { metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8')); }
      catch { throw new Error('Pierwsze uruchomienie tej wersji wymaga połączenia z internetem.'); }
    }
    const javaMajor = metadata.javaVersion?.majorVersion || 8;
    const javaPath = input.javaPath || 'java';
    if (/["\r\n]/.test(javaPath) || !/^(java|javaw)(\.exe)?$/i.test(path.basename(javaPath))) throw new Error('Wybierz plik java.exe lub javaw.exe.');
    let javaInfo;
    try { javaInfo = await exec(javaPath, ['-version'], { windowsHide: true, timeout: 10000 }); }
    catch { throw new Error(`Zainstaluj Java ${javaMajor} (64-bit) i wskaż plik javaw.exe w ustawieniach.`); }
    const found = (javaInfo.stderr + javaInfo.stdout).match(/version "(?:1\.)?(\d+)/);
    if (!found || Number(found[1]) !== javaMajor) throw new Error(`Ta wersja Minecraft wymaga Java ${javaMajor}. Wskaż odpowiedni plik javaw.exe.`);
    await fs.mkdir(metadataDir, { recursive: true });
    await fs.writeFile(metadataFile, JSON.stringify(metadata));
    const client = new Client();
    client.on('progress', p => send('progress', { type: p.type, task: p.task, total: p.total }));
    client.on('download-status', p => send('progress', { type: 'Pobieranie', task: p.current, total: p.total }));
    client.on('close', code => { busy = false; send('state', code === 0 ? 'Gra została zamknięta.' : `Gra zakończyła się kodem ${code}. Sprawdź latest.log w folderze gry.`); send('game-closed'); });
    const child = await client.launch({
      authorization, root: dataDir(), javaPath,
      version: { number: selected.version.id, type: selected.version.type },
      memory: selected.memory,
      overrides: { detached: false, versionJson: metadataFile }
    });
    if (!child) throw new Error('Nie udało się uruchomić Minecraft. Sprawdź instalację Java i połączenie z internetem.');
    child.on('error', () => { busy = false; send('state', 'Nie można uruchomić procesu Java. Sprawdź ścieżkę w ustawieniach.'); send('game-closed'); });
    send('state', 'Minecraft jest uruchomiony.');
    return true;
  } catch (e) { busy = false; send('game-closed'); throw e; }
}

app.whenReady().then(() => {
  win = new BrowserWindow({ width: 1180, height: 780, minWidth: 980, minHeight: 690, backgroundColor: '#0b0d12', title: 'minverse.pl', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.loadFile(path.join(__dirname, 'ui/index.html'));
  ipcMain.handle('versions', loadVersions);
  ipcMain.handle('login', authenticate);
  ipcMain.handle('logout', async () => {
    if (authBusy || busy) throw new Error('Zakończ logowanie lub grę przed wylogowaniem.');
    profile = null; flow = null;
    await fs.rm(path.join(app.getPath('userData'), 'auth'), { force: true, recursive: true });
    return true;
  });
  ipcMain.handle('launch', (_, input) => launch(input));
  ipcMain.handle('folder', async () => { await fs.mkdir(dataDir(), { recursive: true }); return shell.openPath(dataDir()); });
  ipcMain.handle('java', async () => {
    const result = await dialog.showOpenDialog(win, { title: 'Wybierz Java (javaw.exe lub java.exe)', properties: ['openFile'], filters: [{ name: 'Java', extensions: ['exe'] }] });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('java-help', () => shell.openExternal('https://adoptium.net/temurin/releases/'));
});
app.on('window-all-closed', () => app.quit());
