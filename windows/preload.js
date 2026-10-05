// Tells the game it is running as a packaged release: the game then hides its Test tools.
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('BLOODLINE', { release: true, platform: 'windows', shell: 'electron' });
