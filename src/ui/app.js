const $ = id => document.getElementById(id);
let versions = [], mode = 'microsoft', javaPath = localStorage.getItem('javaPath') || '', running = false;
$('ram').value = localStorage.getItem('ram') || '4';
if (javaPath) $('java-path').textContent = javaPath;
const error = e => { $('status').textContent = 'Nie udało się ukończyć operacji'; $('detail').textContent = e.message.replace(/^Error invoking remote method '[^']+': Error: /, ''); };
function renderVersions() {
  const old = $('version').value || localStorage.getItem('version');
  $('version').replaceChildren();
  versions.filter(v => $('snapshots').checked || v.type === 'release').forEach(v => {
    const option = document.createElement('option'); option.value = v.id; option.textContent = `${v.id} · ${v.type}`; $('version').append(option);
  });
  if ([...$('version').options].some(o => o.value === old)) $('version').value = old;
  $('play').disabled = running || !versions.length;
}
async function login() {
  $('account').disabled = true;
  try { const user = await window.launcher.login(); $('account-name').textContent = user.name; $('status').textContent = `Witaj, ${user.name}!`; $('mode-note').textContent = `Konto Microsoft: ${user.name}`; $('logout').hidden = false; }
  catch (e) { error(e); }
  finally { $('account').disabled = false; $('login-code').hidden = true; }
}
// A separate logout control avoids accidental account removal on avatar clicks.
const logout = document.createElement('button'); logout.id = 'logout'; logout.textContent = 'Wyloguj'; logout.hidden = true;
document.querySelector('header').append(logout);
logout.onclick = async () => { try { await window.launcher.logout(); $('account-name').textContent = 'Zaloguj się'; logout.hidden = true; $('status').textContent = 'Wylogowano'; } catch(e) { error(e); } };
$('account').onclick = login;
$('snapshots').onchange = renderVersions;
$('settings').onclick = () => { $('options').hidden = !$('options').hidden; };
$('home').onclick = () => { $('options').hidden = true; };
$('folder').onclick = () => window.launcher.folder().catch(error);
$('java-help').onclick = () => window.launcher.javaHelp().catch(error);
$('java').onclick = async () => { const result = await window.launcher.java(); if (result) { javaPath = result; localStorage.setItem('javaPath', result); $('java-path').textContent = result; } };
for (const key of ['premium','offline']) $(key).onclick = () => {
  mode = key === 'premium' ? 'microsoft' : 'offline';
  $('premium').classList.toggle('selected', mode === 'microsoft'); $('offline').classList.toggle('selected', mode === 'offline');
  $('nick').hidden = mode !== 'offline';
  $('mode-note').textContent = mode === 'offline' ? 'Tryb offline: świat lokalny i serwery dopuszczające konta offline. Bez dostępu do serwerów wymagających Microsoft.' : 'Zaloguj się kontem posiadającym Minecraft Java.';
};
$('play').onclick = async () => {
  running = true; $('play').disabled = true;
  localStorage.setItem('version', $('version').value); localStorage.setItem('ram', $('ram').value);
  try { await window.launcher.launch({ version: $('version').value, mode, nick: $('nick').value, ram: Number($('ram').value), javaPath }); }
  catch (e) { running = false; $('play').disabled = false; error(e); }
};
window.launcher.on('login-code', data => { $('login-code').hidden = false; $('login-code').textContent = `Otwórz ${data.url} i wpisz kod: ${data.code}. Poczekaj na zakończenie logowania.`; });
window.launcher.on('login-finished', () => { $('login-code').hidden = true; });
window.launcher.on('account-updated', user => { $('account-name').textContent = user.name; $('logout').hidden = false; });
window.launcher.on('state', text => { $('status').textContent = text; });
window.launcher.on('game-closed', () => { running = false; $('play').disabled = !versions.length; $('progress').hidden = true; $('login-code').hidden = true; });
window.launcher.on('progress', p => { $('progress').hidden = false; if (p.total > 0) { $('progress').value = Math.min(100, p.task / p.total * 100); $('detail').textContent = `${p.type}: ${Math.round(p.task / p.total * 100)}%`; } else { $('progress').removeAttribute('value'); $('detail').textContent = `${p.type}…`; } });
window.launcher.versions().then(result => { versions = result; renderVersions(); }).catch(error);
