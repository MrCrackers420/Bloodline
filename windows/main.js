// Bloodline for Windows: a thin Electron shell around the same single-file game that runs in the browser.
const { app, BrowserWindow, Menu, shell, screen } = require('electron');
const path = require('path');

const PORTRAIT = { width: 450, height: 800 };           // the game is played in portrait: a phone-shaped window
const RATIO = PORTRAIT.width / PORTRAIT.height;

if (!app.requestSingleInstanceLock()) { app.quit(); }    // one copy at a time, so saves are never written by two windows

let win;
// the opening size: 450 x 800, or smaller on a short screen (a 768-pixel laptop would otherwise cut off the bottom of the window)
function startSize() {
  const wa = screen.getPrimaryDisplay().workArea;           // the usable screen, without the taskbar, in scaled pixels
  const h = Math.max(480, Math.min(PORTRAIT.height, wa.height - 70));   // 70 leaves room for the title bar and window frame
  return { width: Math.round(h * RATIO), height: h };
}
function createWindow() {
  const size = startSize();
  win = new BrowserWindow({
    width: size.width, height: size.height, useContentSize: true,
    minWidth: Math.min(360, size.width), minHeight: Math.min(Math.round(360 / RATIO), size.height),
    backgroundColor: '#15100f',                           // the game's own dark colour, so there is no white flash on start
    title: 'Bloodline', autoHideMenuBar: true, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      devTools: !app.isPackaged,                          // no developer tools in the released build
      autoplayPolicy: 'document-user-activation-required',
    },
  });
  win.on('page-title-updated', (e) => e.preventDefault());   // keep the window title "Bloodline" whatever the page is called
  win.setAspectRatio(RATIO);                              // resizing scales the phone-shaped layout instead of stretching it
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'www', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) e.preventDefault(); });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.key === 'Escape' && win.isFullScreen()) { win.setFullScreen(false); e.preventDefault(); }
    if (input.control && ['+', '-', '=', '0'].includes(input.key)) e.preventDefault();   // no browser zoom: the layout is fixed
  });
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
