const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('launcher', {
  versions: () => ipcRenderer.invoke('versions'),
  login: () => ipcRenderer.invoke('login'),
  logout: () => ipcRenderer.invoke('logout'),
  launch: input => ipcRenderer.invoke('launch', input),
  folder: () => ipcRenderer.invoke('folder'),
  java: () => ipcRenderer.invoke('java'),
  javaHelp: () => ipcRenderer.invoke('java-help'),
  on: (event, callback) => {
    if (['login-code', 'login-finished', 'account-updated', 'progress', 'state', 'game-closed'].includes(event)) ipcRenderer.on(event, (_, data) => callback(data));
  }
});
