/**
 * electron-builder configuration — BOTC Storyteller Companion
 * Produces unsigned macOS DMG for direct download and testing.
 */

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.hyp.botcstoryteller',
  productName: 'BOTC Storyteller',

  // Source: Electron main entry + the built web assets
  directories: {
    output: 'release',
    buildResources: 'build-resources',
  },

  // Include only what the app needs at runtime
  files: [
    'electron/main.cjs',
    'dist-native/**/*',
    'public/icons/**/*',
    '!node_modules',
  ],

  // ── macOS ────────────────────────────────────────────────────────────────
  mac: {
    target: [{ target: 'dmg', arch: ['x64', 'arm64'] }],
    icon: 'public/icons/icon-256.png',
    category: 'public.app-category.games',
    // Ad-hoc signing ("-") — free, no Apple Developer account needed.
    // Prevents "damaged and can't be opened" Gatekeeper error on download.
    // Users still see "unidentified developer" on first launch — bypass with
    // right-click → Open, or: xattr -cr "/Applications/BOTC Storyteller.app"
    identity: '-',
    notarize: false,
  },

  dmg: {
    title: 'BOTC Storyteller ${version}',
    // Window size/layout for the DMG installer window
    window: { width: 540, height: 380 },
    contents: [
      { x: 140, y: 180, type: 'file' },
      { x: 400, y: 180, type: 'link', path: '/Applications' },
    ],
    // Background image (optional — place at build-resources/dmg-background.png)
    // background: 'build-resources/dmg-background.png',
  },

  // ── Windows (future) ─────────────────────────────────────────────────────
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'public/icons/icon-256.png',
  },

  // ── Linux (future) ───────────────────────────────────────────────────────
  linux: {
    target: ['AppImage'],
    icon: 'public/icons/icon-256.png',
    category: 'Game',
  },
}
