/**
 * Electron preload — exposes IPC bridge to renderer (contextIsolation: true).
 * Only exposes what the app needs; no full Node.js access in renderer.
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronBridge', {
  /** Start loopback OAuth server. Returns the port number. */
  startOAuthServer: () => ipcRenderer.invoke('oauth-server-start'),
  /** Stop loopback OAuth server early (e.g. user cancelled). */
  stopOAuthServer: () => ipcRenderer.invoke('oauth-server-stop'),
  /** Register callback invoked when Google redirects with ?code=. */
  onOAuthCallback: (cb) => {
    ipcRenderer.on('oauth-callback', (_event, params) => cb(params))
  },
  /** Remove callback listeners (cleanup). */
  removeOAuthCallback: () => {
    ipcRenderer.removeAllListeners('oauth-callback')
  },
  /** Open URL in system default browser. */
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
})
