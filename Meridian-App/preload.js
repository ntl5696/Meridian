const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (_event, value) => callback(value)),
  printToPDF: (options) => ipcRenderer.invoke('print-to-pdf', options)
});
