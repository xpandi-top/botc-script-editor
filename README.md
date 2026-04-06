# BOTC Script Viewer

Minimal static webapp scaffold for rendering Blood on the Clocktower script sheets from JSON and exporting them as PDF via the browser print dialog.

## Stack

- Vite
- React
- TypeScript
- Static assets from `assets/`

## Local setup

```bash
npm install
npm run dev
```

## Add scripts

1. Add or edit JSON files in `assets/characters/`
2. Keep each file as an object keyed by character id
3. Add matching icon files to `assets/icons/` if needed

Example:

```json
{
  "washerwoman": {
    "id": "washerwoman",
    "team": "townsfolk",
    "edition": "tb"
  }
}
```

## Export to PDF

1. Start the app and open a script
2. Click `Print / Save as PDF`
3. In the browser print dialog, choose `Save as PDF`

## Add Character Revision

Use the CLI helper instead of editing revision fields by hand.

Basic usage:

```bash
npm run add-revision -- <character_id> --en "English text" --zh "Chinese text"
```

Example:

```bash
npm run add-revision -- clockmaker --en "You start knowing how many steps from the Demon to its nearest Minion." --zh "在你的首个夜晚，你会得知恶魔与爪牙之间最近的距离。（邻座的玩家距离为1）"
```

If you want to set the revision id explicitly:

```bash
npm run add-revision -- clockmaker --revision v2 --en "English text" --zh "中文文本"
```

If you want to store a note for the revision:

```bash
npm run add-revision -- clockmaker --revision v2 --note "Experimental wording" --en "English text" --zh "中文文本"
```

What it updates:

- the matching character entry in `assets/characters/*.json`
- `assets/locales/en.json`
- `assets/locales/zh.json`

After editing revisions, run:

```bash
npm run build
```

The build will fail if any revision metadata or localized revision text is missing.

## GitHub Pages

The current `vite.config.ts` uses `base: '/botc_webapp/'` for production builds, which matches this repository name.

Build with:

```bash
npm run build
```

Then publish the `dist/` directory with GitHub Pages.

If the repository name changes, update the production `base` value in `vite.config.ts`.
