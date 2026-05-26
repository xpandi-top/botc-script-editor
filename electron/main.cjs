/**
 * Electron main process — BOTC Storyteller Companion
 *
 * Loads the Vite native build (dist-native/) via file:// protocol.
 * No server needed; all assets are local.
 */

const { app, BrowserWindow, shell, Menu, nativeTheme } = require('electron')
const path = require('path')
const fs   = require('fs')

// ── Paths ─────────────────────────────────────────────────────────────────────

function getIndexPath() {
  // Production: packaged app — resources/app/dist-native/index.html
  // Development: project root/dist-native/index.html
  const candidates = [
    path.join(__dirname, '..', 'dist-native', 'index.html'),  // dev
    path.join(process.resourcesPath, 'app', 'dist-native', 'index.html'), // packaged
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return candidates[0]
}

// ── Window ────────────────────────────────────────────────────────────────────

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth:  800,
    minHeight: 600,
    title: 'BOTC Storyteller Companion',
    icon: path.join(__dirname, '..', 'public', 'icons', 'icon-256.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Allow localStorage / IndexedDB (needed for game state persistence)
      webSecurity: true,
    },
    // macOS: use native traffic lights
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#f6f1e7',
  })

  const indexPath = getIndexPath()
  mainWindow.loadFile(indexPath)

  // Open external links in default browser, not Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()

  // macOS: re-create window when dock icon clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Native menu — keep minimal; app uses its own in-page nav
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' },
        ] : [{ role: 'close' }]),
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
})

app.on('window-all-closed', () => {
  // On macOS, keep app running until Cmd+Q even when all windows are closed
  if (process.platform !== 'darwin') app.quit()
})
