# Problem reports (feedback from inside the app)

Users report a wrong ability text, a bad translation, a missing reminder token
or a storyteller step that misbehaves **from the place where they see it**. Each
report says what it is about, what that thing showed, and where the user was, so
an agent can go from the report to the file to fix without asking.

```
flag button ─▶ report dialog ─▶ Google Form (one paragraph answer) ─▶ Google Sheet
                                                                          │
         npm run feedback:reports  ◀── CSV (download, share link or published) ◀┘
              │
              └─▶ Markdown per report: files, text matches, commands; .feedback/reports-<date>.json
```

AI answers have their own feedback (👍/👎, shared conversations): see
`src/lib/ai/feedback.ts` and `worker/scripts/feedback.mjs`. This document is
about everything else.

## Where the buttons are

| Surface (`report.surface`) | Where | Target |
|---|---|---|
| `characters/detail` | Characters tab, the character panel (flag next to download) | character |
| `scripts/sheet-popup` | Script sheet, the character pop-up (click a wake-order icon) | character, with the script's pinned revision |
| `scripts/toolbar` | Scripts tab, the open script's toolbar (right end) | script |
| `storyteller/seat` | Storyteller, a seat's dialog | seat: day, phase, character, the night reminder shown |
| `storyteller/ability` | Storyteller, the ability pop-up | character |
| `storyteller/sidebar` | Storyteller, the right-hand bar (and the mobile ☰ drawer) | storyteller |
| `settings/section` | Settings, each section title (the section is preselected) | settings, with language, theme, UI size, fonts and sync status (no account details) |
| `analytics/studio` | Analytics, right of the Overview / Scripts / Players / Characters / Records tabs | analytics, with the section, identity basis, game counts and KPI numbers |
| `analytics/record-form` | Analytics, the new / edit record dialog | analytics, with the record id, form tab and player count |
| `print/tokens` | Print Studio top bar (the page covers the app header) | print, with the token options (images left out) |
| `print/sheet` | Script PDF preview top bar | print, with the sheet options |
| `app/<tab>` | The header's bug button on every tab | the tab's own target (storyteller, settings, analytics, print), else page |
| `crash/<name>` | The "failed to load" box of an `ErrorBoundary` | page, issue preset to *does not work* |

Selecting text before pressing a flag puts that text in the report
(`selection`): the quickest way to point at one wrong word or translation.

## What a report holds

`src/lib/feedback/report.ts` (`FeedbackReport`, `v: 1`):

| Field | |
|---|---|
| `id` | `fb-YYMMDD-xxxxx`; name it in the commit that fixes it |
| `target` | `{type: 'character', id, script?}` · `{type: 'script', slug}` · `{type: 'storyteller', seat?, characterId?, script?}` · `{type: 'settings'}` · `{type: 'analytics'}` · `{type: 'print', script?}` · `{type: 'page'}` |
| `surface`, `label` | the button, and a readable name (`Washerwoman / 洗衣妇 (washerwoman)`) |
| `issues` | `wrong`, `translation`, `missing`, `bug`, `layout`, `suggestion` |
| `parts` | per target: character `name ability reminders night jinx icon almanac`; script `characters night info sheet export`; storyteller `night seat reminders nomination setup log timer`; settings `language theme fonts sync api backup`; analytics `overview scripts players characters records filter share record_form`; print `tokens reminders markers layout sheet export` |
| `comment`, `expected`, `selection` | the user's note, what it should say, the text they had selected |
| `snapshot` | what the target showed (`src/lib/feedback/snapshot.ts`): a character's names, ability, revision, tokens and night reminders in both languages, its jinx ids and `localEdits` (custom, pack, revision, reminders, night); a script's origin (`builtin`, `community`, `user`), file, title, author, characters |
| `context` | what else was on screen, registered with `useReportContext`: `app` (tab, script, character), `storyteller` (script, day, phase, counts, characters in play), `analytics` (section, basis, counts) |
| `app` | language, build id, route (never the query string: share links carry whole scripts and games), viewport, online |
| `errors` | the last five errors of the session (`src/lib/feedback/errors.ts`): uncaught errors, rejected promises, `ErrorBoundary` crashes |

No player names, notes or keys. With the storyteller's secrets hidden (players
can see the screen), a seat report leaves the character out.

## The form

"BOTC Companion App Feedback Form" (`https://forms.gle/gsEcFGp5e2xiZQPf8`) has
one paragraph question, *Detailed Description of the Bug or Feature Suggestion*
(`entry.1270975439`, in `REPORT_FORM`). The app posts to it directly (`no-cors`);
the answer is a few readable lines, then `--- botc-report-json ---`, then the
report as JSON. Offline, reports wait in `localStorage` (`botc-report-outbox`)
and go when the app starts or comes back online. The dialog can also open the
form prefilled (the snapshot is dropped first when the link would be too long)
or copy the report. `VITE_FEEDBACK_FORM=off` turns sending off (copy only).

Anything typed straight into the form still shows up in the triage, under
"Typed in the form".

## Reading reports

Get the responses as CSV, one of:

- Google Sheets → *File → Download → Comma-separated values*, then `--csv file`;
- the sheet shared as "anyone with the link": `https://docs.google.com/spreadsheets/d/<id>/export?format=csv`;
- *File → Share → Publish to web → CSV*.

Put a link in `.env.local` as `FEEDBACK_SHEET_CSV_URL=…` to skip the flag.
Anyone with that link can read the reports, so keep it out of the repo.

```bash
npm run feedback:reports -- --csv responses.csv
npm run feedback:reports -- --since 2026-09-20
npm run feedback:reports -- --id fb-260925-k3x9q
npm run feedback:reports -- --json        # machine-readable
```

For each report it prints the target, issue, note, expected text and where it
came from, then (`scripts/feedback-triage.mjs`):

- **Files**: the component behind the button, the character JSON, the script
  file, almanac or jinx files for those parts, code for storyteller, settings,
  analytics and print parts (`PART_FILES`);
- **Text found at**: `file:line` of the selected (or quoted) text in the locale,
  character, almanac, script and tutorial files;
- **Notes**: local edits on the user's device, a custom or pack character that
  is not in the repo, a repo text that changed since the report (maybe already
  fixed), recorded errors;
- **Commands**: e.g. `npm run add-revision -- <id> --zh "<expected>" --note "<report id>: …"`,
  `npm run check-abilities`, `npm run sync-reminders`, `npm run build:guides -- --refresh`.

Everything also goes to `.feedback/reports-<date>.json` (not committed: it
holds what users wrote).

A report is **handled** once a commit message names its id; later runs hide it
(`--all` shows it again). So fix, then commit with the id:

```
fix(characters): washerwoman zh ability wording

Fixes fb-260925-k3x9q
```

## Agent workflow

1. `npm run feedback:reports` (or with `--csv`).
2. For each report: open the listed files; trust `snapshot` for what the user
   saw, check `localEdits` and "changed in the repo" before editing data.
3. Fix: character text through `npm run add-revision` (never hand-edit
   revisions), UI strings in `assets/locales/{en,zh}.json` (`npm run i18n:check`),
   code in the listed components.
4. Commit per report (or per group) with the report ids in the message.

## Adding a button

```tsx
import { FeedbackButton } from '../Feedback'
import { characterRequest, scriptRequest } from '../../lib/feedback/snapshot'

<FeedbackButton request={() => characterRequest(id, 'my-area/my-surface', { script, pinnedRevisions })} />
<FeedbackButton request={() => scriptRequest(script, 'my-area/my-surface', ['night'])} />
```

`request` runs on click, so the snapshot is what the target shows at that
moment. Without a `FeedbackProvider` (player pages, print previews) the button
renders nothing. Add the new surface to `SURFACE_FILES` in
`scripts/feedback-triage.mjs` (`src/__tests__/feedbackReports.test.tsx` checks
that the files it names exist). To add context from a part of the app, call
`useReportContext('<key>', { … })` with ids and counts only.
