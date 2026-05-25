# Print Studio — Feature Spec (I-53)

DIY physical token printing. New top-level tab: **Print Studio** (打印工坊).

---

## Overview

Two sub-modes inside the tab:

| Mode | Purpose |
|------|---------|
| **Character Tokens** | Print character tokens (circle/hex/square) with curved ability text |
| **Custom Tags** | Print numbered seat tokens + fully customizable status markers |

---

## Mode 1 — Character Tokens

### Token Anatomy (circle default)

```
        ╭─────────╮
     ╭──  ability   ──╮       ← curved arc text (top)
    │    text wraps    │
    │   [icon image]   │       ← center ~55% diameter
    │                  │
     ╰──  CharName  ──╯       ← name at bottom arc
        ╰─────────╯
```

Matches official BotC token style.

### Character Selection

- **Default (P0)**: characters from active script only
- **P1**: full catalog picker — searchable list, filter by team, multi-select with checkboxes
- "Select all" / "Deselect all" per team group
- Selected count badge: "14 tokens selected"

### Page Layout

- Tokens packed in row-major grid
- Auto-calculate columns: `floor(printableWidth / (tokenDiam + gap))`
- Gap between tokens: configurable (default 4mm)
- **Crop marks**: thin dashed lines at token edge, on by default, toggle to hide
- Bleed: 1mm solid background color extends beyond crop circle (helps cutting)

### Token Shape

Toggle: **Circle** (default) | **Hexagon** | **Square**

All shapes use same diameter/size setting. Clip mask changes, layout packing same.

### Token Customization

#### Size
- Diameter (or edge length for hex/square): 30mm–80mm slider, default 50mm
- Preview updates live

#### Text
| Field | Options |
|-------|---------|
| Character name | EN only / ZH only / Both (EN + ZH stacked) |
| Ability text | EN / ZH / Both / Hidden |
| Name font size | 6–16pt |
| Ability font size | 5–11pt |
| Ability text style | **Curved arc** (top arc, official style) / Straight horizontal |

Curved arc: SVG `<textPath>` along top arc of circle.  
Both-language ability: EN arc top, ZH straight below icon.

#### Background
- **Default**: transparent / white
- **Solid color**: color picker
- **Global image upload**: one PNG/JPG applies to all tokens as circle-cropped background
- Image fit: Cover (fill) / Contain (letterbox) / Stretch

#### Appearance
| Option | Default |
|--------|---------|
| Show icon | on |
| Token border | on, 2px dark |
| Border color | #333 |
| Black & white | off |
| Crop marks | on |

#### Watermark (optional)
- Toggle on/off (default off)
- Type: **Custom text** (e.g. "Fan-made", "Unofficial") or **Image/logo upload** (PNG with transparency)
- Position: Center / Bottom-right / Bottom-center
- Opacity: 10%–60% slider
- For text: font size + color picker

---

## Mode 2 — Custom Tags

### Sub-type A: Numbered Seat Tokens

- Same shape/size settings as character tokens
- Number range: **from** / **to** inputs (e.g. 1–15)
- Optional label below number (e.g. player name blank line, or static text)
- Font size for number
- Background: color picker or global image

### Sub-type B: Status Markers (fully customizable)

Each marker row in the list has:
- **Icon**: pick from provided icon set (skull, poison, beer, shield, star, blank, etc.) or upload custom PNG
- **Label text**: free-text field (e.g. "Poisoned", "Dead", "Protected", "已死亡")
- **Quantity**: how many copies to print (default 2)
- **Background color**: per-marker color override

Provided default marker presets (user can edit/delete/add):

| Preset | Icon | Label |
|--------|------|-------|
| Dead | skull | Dead / 死亡 |
| Poisoned | poison drop | Poisoned / 中毒 |
| Drunk | beer mug | Drunk / 醉酒 |
| Protected | shield | Protected / 保护 |
| Used ability | checkmark | Used / 已使用 |
| Reminder (blank) | — | (empty, user fills) |

"+ Add marker" button adds new blank row. All fields editable.

---

## Print Flow

1. Open **Print Studio** tab
2. Choose mode: Character Tokens / Custom Tags
3. Left panel: all options
4. Right panel: live print preview (same pattern as existing PrintPreviewPage)
5. **Print** button → `applyTokenPrintOptions(opts)` injects `@page` CSS → `window.print()`
6. Portal div `.token-print-portal` shown only in `@media print`

---

## Component Structure

```
src/components/PrintStudio/
  PrintStudioPage.tsx        ← tab root, mode switcher (Character / Custom Tags)
  TokenOptionsPanel.tsx      ← left panel: all controls
  TokenGrid.tsx              ← preview + print grid of tokens
  SingleToken.tsx            ← renders one SVG token (circle/hex/square)
  CustomTagGrid.tsx          ← numbered seats + status markers grid
  useTokenLayout.ts          ← computes rows/cols from page+size+gap
```

### SingleToken.tsx (SVG)

```tsx
<svg width={sizePx} height={sizePx} viewBox={`0 0 ${S} ${S}`}>
  <defs>
    <clipPath id="clip">
      <circle cx={S/2} cy={S/2} r={S/2 - border} />   {/* or polygon for hex/square */}
    </clipPath>
    <path id="topArc" d={topArcPath} />
  </defs>
  {/* background */}
  <image href={bgImage} clipPath="url(#clip)" ... />
  {/* icon */}
  <image href={iconSrc} x={...} y={...} width={iconSize} height={iconSize} clipPath="url(#clip)" />
  {/* ability text — curved */}
  <text fontSize={abilityFontSize}>
    <textPath href="#topArc" startOffset="50%" textAnchor="middle">{abilityText}</textPath>
  </text>
  {/* name */}
  <text x={S/2} y={S - nameFontSize} textAnchor="middle" fontSize={nameFontSize}>{name}</text>
  {/* border */}
  <circle cx={S/2} cy={S/2} r={S/2 - border/2} fill="none" stroke={borderColor} strokeWidth={border} />
  {/* watermark */}
  {watermark && <text ...>{watermarkText}</text>}
</svg>
```

### Crop Marks

Rendered outside token SVG as thin `<line>` elements at ±3mm from edge at 4 corners.

---

## State Shape

```ts
type TokenPrintOptions = {
  mode: 'characters' | 'custom-tags'
  // character tokens
  selectedCharacterIds: string[]
  shape: 'circle' | 'hexagon' | 'square'
  diameterMm: number
  gapMm: number
  nameDisplay: 'en' | 'zh' | 'both'
  abilityDisplay: 'en' | 'zh' | 'both' | 'hidden'
  abilityStyle: 'arc' | 'straight'
  nameFontSize: number
  abilityFontSize: number
  bgType: 'none' | 'color' | 'image'
  bgColor: string
  bgImage: string | null          // data URL
  bgFit: 'cover' | 'contain' | 'stretch'
  borderWidth: number
  borderColor: string
  blackAndWhite: boolean
  showCropMarks: boolean
  watermark: WatermarkOptions | null
  pageSize: PageSize
  // custom tags
  tagMode: 'numbers' | 'markers'
  numberRange: [number, number]
  markers: MarkerDef[]
}

type WatermarkOptions = {
  type: 'text' | 'image'
  text: string
  imageData: string | null        // data URL
  position: 'center' | 'bottom-right' | 'bottom-center'
  opacity: number                 // 0.1–0.6
  fontSize: number
  color: string
}

type MarkerDef = {
  id: string
  icon: string | null             // asset key or data URL
  label: string
  quantity: number
  bgColor: string
}
```

---

## Phasing

| Phase | Scope |
|-------|-------|
| **P0** | Character tokens from active script, circle shape, curved text, crop marks, watermark, page layout |
| **P0** | Custom tags: numbered tokens + preset status markers |
| **P1** | Full catalog picker for character selection |
| **P1** | Hexagon + square shapes |
| **P1** | Custom marker icon upload |
| **P1** | Per-character background override |

---

## Issue

**I-53** — Print Studio tab (character tokens + custom tags)
