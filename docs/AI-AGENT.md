# BOTC AI Agent — Design & Roadmap

## Overview

Gemini-powered assistant embedded in the BOTC webapp. Helps authors create, translate, and refine custom characters and scripts.

**API**: Google Gemini (`gemini-2.0-flash` by default via REST)  
**Key**: `VITE_GEMINI_API_KEY` in `.env.local`  
**Gating**: All AI features hidden when key not set (`isGeminiAvailable()` guard)

---

## Architecture

```
src/lib/gemini.ts       — thin REST client (geminiAsk, geminiGenerate)
src/lib/botcAgent.ts    — BOTC-specific agent functions
src/components/AgentButton.tsx  — reusable ✨ button with loading + error handling
```

`AgentButton` is a drop-in beside any text field. Passes `action: () => Promise<void>` — caller decides what to do with the result. Renders `null` when Gemini key unavailable.

---

## MVP Features (implemented)

| Feature | Function | Entry point |
|---------|----------|-------------|
| Translate ability EN→ZH | `translateText(text, 'zh')` | Ability ZH field in CustomCharDialog |
| Suggest slug ID | `suggestId(name)` | ID field in CustomCharDialog (new) |
| Suggest Chinese name | `suggestChineseName(nameEn, ability?)` | Name ZH field in CustomCharDialog |
| Generate ability text | `suggestAbility({name, team, concept?})` | Ability EN field in CustomCharDialog |
| Full character draft | `suggestCharacter(description)` | (wired, no UI yet) |
| Script theme / flavor | `suggestScriptTheme(chars, title?)` | (wired, no UI yet) |

---

## Planned Features

### Phase 2 — Character authoring
- **Concept-to-character**: dialog where ST describes an idea in free text → full character JSON generated
- **Jinx suggestions**: given two chars, suggest why they'd be jinxed and what the restriction is
- **Balance review**: flag ability text that seems too strong/weak for the assigned team

### Phase 3 — Script authoring
- **Script flavor generator**: thematic blurb, author notes, script title suggestions
- **Night order advice**: warn if too many first-night characters unbalance setup
- **Composition check**: flag if outsider/minion/demon counts look off for player count

### Phase 4 — Icon generation
- **Character icon**: use Gemini Imagen (or external API) to generate a 256×256 character portrait
- **Script cover art**: generate a cover image matching script theme
- Input: name + team + short visual description

### Phase 5 — Conversational assistant
- Floating chat panel in the Characters tab
- Multi-turn: user can refine suggestions ("make the ability more complicated", "use a Chinese pun in the name")
- Stores last 10 turns in session, resets on tab change

---

## API Notes

- Model: `gemini-2.0-flash` (fast, cheap, good for JSON tasks)
- For image generation: `gemini-2.0-flash-preview-image-generation` or Imagen 3
- Temperature: 0.3 for translation, 0.7–1.0 for creative tasks
- All prompts include a shared BOTC system instruction for consistent terminology
- JSON responses: parsed with try/catch fallback to raw string

## Cost & Rate Limits

- Flash model: very cheap (~$0.075/1M input tokens)
- Free tier: 15 RPM, 1M TPD — sufficient for single-user webapp
- Add debounce (300ms) before any auto-trigger features to avoid spam
