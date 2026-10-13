const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('kv30Desktop', Object.freeze({
  platform: 'desktop-electron',
  clientId: 'desktop-electron',
  version: '30.0.0'
}));
