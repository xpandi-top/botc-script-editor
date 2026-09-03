/**
 * Splits a rendered sheet into fixed-height page rectangles by measuring real DOM
 * geometry, instead of relying on the browser's CSS print pagination (which ignores
 * or misapplies `break-inside: avoid` across multi-column grids and browsers).
 *
 * Call sites mark the atomic layout units in the DOM:
 *  - `data-print-card`   one character card. Never split.
 *  - `data-print-header` a section header. Merged into the row-unit that follows it
 *                        so a header never lands alone at the bottom of a page.
 *  - `data-print-block`  any other atomic block (supplemental rules, attribution).
 *  - `data-print-page-break` an unconditional cut (e.g. between the two languages of a
 *                        bilingual-separate sheet) — always starts a new page here,
 *                        regardless of remaining space.
 *
 * Cards sharing a CSS-grid row (same top offset, within a few px of rounding) are
 * grouped into one row-unit so a 2-column layout still gets a clean per-row cut.
 */

export type PageRect = {
  y: number
  height: number
  /** True when this page's content genuinely ends short of a full page — the last
   *  page of the document, or one cut off early by a forced `data-print-page-break`
   *  (e.g. the language boundary in bilingual-separate mode). Callers should size
   *  the physical page to `height` for these instead of a fixed page height, or
   *  the content will sit above a blank strip. Pages that filled up naturally
   *  (packed until the next unit overflowed) are not trimmed. */
  trimmed: boolean
}

export function computePageRects(container: HTMLElement, pageHeightPx: number): PageRect[] {
  const containerTop = container.getBoundingClientRect().top
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-print-card], [data-print-header], [data-print-block], [data-print-page-break]',
    ),
  )
  const totalHeight = container.scrollHeight

  if (nodes.length === 0) {
    // Nothing marked — fall back to naive fixed-height slicing.
    const rects: PageRect[] = []
    for (let y = 0; y < totalHeight; y += pageHeightPx) {
      const height = Math.min(pageHeightPx, totalHeight - y)
      rects.push({ y, height, trimmed: height < pageHeightPx })
    }
    return rects.length > 0 ? rects : [{ y: 0, height: totalHeight, trimmed: true }]
  }

  type Unit = { top: number; bottom: number; force?: boolean }
  const units: Unit[] = []

  let rawRowTop: number | null = null // top of the row's first card — used to detect row membership
  let unitTop = 0
  let unitBottom = 0
  let pendingHeaderTop: number | null = null

  const flushRow = () => {
    if (rawRowTop === null) return
    units.push({ top: unitTop, bottom: unitBottom })
    rawRowTop = null
    pendingHeaderTop = null
  }

  for (const el of nodes) {
    const rect = el.getBoundingClientRect()
    const top = rect.top - containerTop
    const bottom = rect.bottom - containerTop

    if (el.hasAttribute('data-print-page-break')) {
      flushRow()
      units.push({ top, bottom: top, force: true })
      continue
    }
    if (el.hasAttribute('data-print-header')) {
      flushRow()
      pendingHeaderTop = top
      continue
    }
    if (el.hasAttribute('data-print-block')) {
      flushRow()
      units.push({ top, bottom })
      continue
    }
    // data-print-card
    if (rawRowTop !== null && Math.abs(top - rawRowTop) <= 3) {
      unitBottom = Math.max(unitBottom, bottom)
      continue
    }
    flushRow()
    rawRowTop = top
    unitTop = pendingHeaderTop ?? top
    unitBottom = bottom
    pendingHeaderTop = null
  }
  flushRow()

  // Greedily pack units into page-height bins — never split a unit, and never
  // emit a break that would leave a page with nothing on it. `force` units
  // (data-print-page-break) always start a new page, overflow or not — and,
  // unlike a natural overflow break, mean the page *before* it ended short of
  // a full page on purpose (not just greedy-packing slack), so it gets trimmed.
  const breaks: { y: number; forced: boolean }[] = []
  let pageStart = 0
  for (const u of units) {
    if (u.top <= pageStart) continue // nothing to cut before — avoid an empty page
    if (u.force || u.bottom - pageStart > pageHeightPx) {
      breaks.push({ y: u.top, forced: !!u.force })
      pageStart = u.top
    }
  }

  const starts = [0, ...breaks.map((b) => b.y)]
  return starts.map((y, i) => {
    const isLastPage = i === starts.length - 1
    const endedByForcedBreak = i < breaks.length && breaks[i].forced
    return {
      y,
      height: (starts[i + 1] ?? totalHeight) - y,
      trimmed: isLastPage || endedByForcedBreak,
    }
  })
}
