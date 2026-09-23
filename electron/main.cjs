/**
 * Electron main process — BOTC Storyteller Companion
 *
 * Loads the Vite native build (dist-native/) via file:// protocol.
 * No server needed; all assets are local.
 */

const { app, BrowserWindow, shell, Menu, ipcMain } = require('electron')
const path = require('path')
const fs   = require('fs')
const http = require('http')
const { pathToFileURL } = require('url')

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

// ── OAuth loopback server ─────────────────────────────────────────────────────

let oauthServer = null

function isAllowedExternalUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return false
  try {
    const url = new URL(rawUrl)
    if (url.protocol === 'https:') return true
    if (url.protocol !== 'http:') return false
    return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  } catch {
    return false
  }
}

function startOAuthLoopbackServer() {
  return new Promise((resolve, reject) => {
    if (oauthServer) {
      oauthServer.close()
      oauthServer = null
    }
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1')
      const code  = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      // Respond with a simple close-the-tab page
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>BOTC Companion — Auth</title>
        <style>body{font-family:sans-serif;text-align:center;padding:60px;background:#f6f1e7}</style>
        </head><body>
        <h2>${error ? '❌ Auth failed' : '✅ Connected!'}</h2>
        <p>${error ? error : 'Return to BOTC Companion.'}</p>
        <script>window.close()</script>
        </body></html>`
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(html)

      // Send code to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('oauth-callback', { code, state, error })
      }
      server.close()
      oauthServer = null
    })

    server.listen(0, 'localhost', () => {
      oauthServer = server
      resolve(server.address().port)
    })
    server.on('error', reject)
  })
}

ipcMain.handle('oauth-server-start', () => startOAuthLoopbackServer())
ipcMain.handle('oauth-server-stop', () => {
  if (oauthServer) { oauthServer.close(); oauthServer = null }
})
ipcMain.handle('open-external', (_event, url) => {
  if (!isAllowedExternalUrl(url)) {
    throw new Error('Blocked unsafe external URL')
  }
  return shell.openExternal(url)
})

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
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    // macOS: use native traffic lights
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#f6f1e7',
  })

  const indexPath = getIndexPath()
  mainWindow.loadFile(indexPath)

  // Only the dedicated read-only audience route may open an app window.
  // All existing external links retain their original behavior.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const audienceUrl = new URL(url)
    const entryUrl = pathToFileURL(indexPath)
    if (audienceUrl.protocol === 'file:' && audienceUrl.host === entryUrl.host &&
        audienceUrl.pathname === entryUrl.pathname &&
        /^[\da-f-]{36}$/.test(audienceUrl.searchParams.get('audience') || '') &&
        [...audienceUrl.searchParams.keys()].every(key => ['audience', 'lang'].includes(key))) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1280, height: 800, minWidth: 700, minHeight: 500,
          title: 'BOTC · Audience', autoHideMenuBar: true,
          webPreferences: { nodeIntegration: false, contextIsolation: true, webSecurity: true, backgroundThrottling: false },
        },
      }
    }
    if (isAllowedExternalUrl(url)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-create-window', (audienceWindow, { url }) => {
    const hostWindow = mainWindow
    audienceWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    audienceWindow.webContents.on('will-navigate', (event, targetUrl) => {
      if (targetUrl !== url) event.preventDefault()
    })
    const closeAudience = () => { if (!audienceWindow.isDestroyed()) audienceWindow.close() }
    hostWindow.once('closed', closeAudience)
    audienceWindow.once('closed', () => hostWindow.removeListener('closed', closeAudience))
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAllowedExternalUrl(url)) {
      event.preventDefault()
      shell.openExternal(url)
    } else if (/^[a-z][a-z\d+.-]*:/i.test(url) && !url.startsWith('file:')) {
      event.preventDefault()
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
