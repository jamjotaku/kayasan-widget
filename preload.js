const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  resizeWindow: (w, h) => ipcRenderer.send('resize-window', { w, h })
});