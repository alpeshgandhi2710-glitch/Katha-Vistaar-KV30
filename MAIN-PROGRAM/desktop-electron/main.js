const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const DEFAULT_URL = process.env.KV30_DESKTOP_URL || 'http://localhost:8787/';

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 320,
    minHeight: 560,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });
  win.removeMenu();
  win.loadURL(DEFAULT_URL);
  return win;
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = new Set(['media', 'notifications', 'geolocation']);
    callback(allowed.has(permission));
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
