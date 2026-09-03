import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { computePageRects } from './paginateSheet'
import { PAGE_PREVIEW_WIDTH_PX, PAGE_SIZE_DEFS } from '../components/PrintOptionsDialog'
import type { PrintOptions } from '../components/PrintOptionsDialog'

export const isNativePlatform = Capacitor.isNativePlatform()

const MM_TO_PT = 2.83465

/** In-place, luminance-weighted grayscale of a canvas's pixels. */
function desaturateCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
    d[i] = d[i + 1] = d[i + 2] = gray
  }
  ctx.putImageData(imageData, 0, 0)
}

type PortalStyleSnapshot = Pick<CSSStyleDeclaration,
  'display' | 'position' | 'top' | 'left' | 'width' | 'zIndex' | 'overflow' | 'maxHeight'>

function revealPortal(portal: HTMLElement, widthPx: number) {
  const snapshot: PortalStyleSnapshot = {
    display: portal.style.display,
    position: portal.style.position,
    top: portal.style.top,
    left: portal.style.left,
    width: portal.style.width,
    zIndex: portal.style.zIndex,
    overflow: portal.style.overflow,
    maxHeight: portal.style.maxHeight,
  }
  const wasHidden = window.getComputedStyle(portal).display === 'none'
  if (wasHidden) {
    portal.style.display = 'block'
    portal.style.position = 'fixed'
    portal.style.top = '-19999px'
    portal.style.left = '0'
    portal.style.zIndex = '-1'
  }
  portal.style.width = `${widthPx}px`
  portal.style.overflow = 'visible'
  portal.style.maxHeight = 'none'
  return snapshot
}

function restorePortal(portal: HTMLElement, snapshot: PortalStyleSnapshot) {
  portal.style.display = snapshot.display
  portal.style.position = snapshot.position
  portal.style.top = snapshot.top
  portal.style.left = snapshot.left
  portal.style.width = snapshot.width
  portal.style.zIndex = snapshot.zIndex
  portal.style.overflow = snapshot.overflow
  portal.style.maxHeight = snapshot.maxHeight
}

/**
 * On iOS/Android: capture element with html2canvas → jsPDF → share via OS share sheet.
 * Falls back to window.print() on web.
 *
 * Pass `portalSelector` to capture a print portal (e.g. `.token-print-portal`) instead
 * of the live preview element. Portals have the correct print layout and are
 * temporarily revealed at A4 width before capture.
 *
 * Used by PrintStudio (tokens) — the fixed-grid token layout doesn't need the
 * measured multi-page pagination `exportSheetPdf` does for character sheets below.
 */
export async function printOrShare(
  element: HTMLElement,
  filename: string,
  onBefore?: () => void,
  onAfter?: () => void,
  options?: { portalSelector?: string },
): Promise<void> {
  if (!isNativePlatform) {
    onBefore?.()
    setTimeout(() => { window.print(); onAfter?.() }, 80)
    return
  }

  onBefore?.()
  try {
    const html2canvas = (await import('html2canvas')).default
    const { jsPDF } = await import('jspdf')

    // Prefer the print portal element — it always has the full print-optimised layout,
    // unlike the live preview which may be hidden or mobile-scaled.
    const target: HTMLElement = options?.portalSelector
      ? (document.querySelector(options.portalSelector) as HTMLElement | null) ?? element
      : element

    // Print portals are display:none on screen. Temporarily reveal at A4 width
    // so html2canvas gets a real layout to capture.
    const computedDisplay = window.getComputedStyle(target).display
    const wasHidden = computedDisplay === 'none'
    if (wasHidden) {
      target.style.display = 'block'
      target.style.position = 'fixed'
      target.style.top = '-19999px'
      target.style.left = '0'
      target.style.width = '794px'  // ~A4 at 96dpi
      target.style.zIndex = '-1'
    }

    // Give browser a frame to recalculate layout after un-hiding
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

    // Expand to full scroll height so html2canvas captures everything
    const originalOverflow = target.style.overflow
    const originalMaxHeight = target.style.maxHeight
    target.style.overflow = 'visible'
    target.style.maxHeight = 'none'

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: target.scrollWidth,
      height: target.scrollHeight,
    })

    // Restore element state
    target.style.overflow = originalOverflow
    target.style.maxHeight = originalMaxHeight
    if (wasHidden) {
      target.style.display = ''
      target.style.position = ''
      target.style.top = ''
      target.style.left = ''
      target.style.width = ''
      target.style.zIndex = ''
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    const imgWidth = canvas.width
    const imgHeight = canvas.height

    // Scale to A4 width (595pt), keep aspect ratio
    const pdfWidth = 595.28
    const pdfHeight = (imgHeight / imgWidth) * pdfWidth

    const pdf = new (jsPDF as any)({
      orientation: 'portrait',
      unit: 'pt',
      format: [pdfWidth, pdfHeight],
    })

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)

    const base64 = pdf.output('datauristring').split(',')[1]
    const safeFilename = filename.replace(/[^a-zA-Z0-9\-_]/g, '-')

    const saved = await Filesystem.writeFile({
      path: `${safeFilename}.pdf`,
      data: base64,
      directory: Directory.Cache,
    })

    await Share.share({
      title: filename,
      url: saved.uri,
      dialogTitle: 'Save or Print PDF',
    })
  } finally {
    onAfter?.()
  }
}

/**
 * Renders the print portal to a real multi-page PDF: measures actual DOM geometry to
 * cut pages at card/section boundaries (see `paginateSheet.ts`), rasterizes each page
 * rect with html2canvas, and assembles a jsPDF document with one full A4(-ish) page
 * per rect. On web this downloads the PDF; on native it shares it via the OS sheet.
 *
 * `portalSelector` — e.g. `.print-portal` / `.token-print-portal` — is normally
 * display:none and is temporarily revealed at the target page width for capture.
 */
export async function exportSheetPdf(
  opts: PrintOptions,
  filename: string,
  portalSelector: string,
  onBefore?: () => void,
  onAfter?: () => void,
): Promise<void> {
  onBefore?.()
  try {
    const portal = document.querySelector(portalSelector) as HTMLElement | null
    if (!portal) throw new Error(`Print portal not found: ${portalSelector}`)

    const html2canvas = (await import('html2canvas')).default
    const { jsPDF } = await import('jspdf')

    const { w: pageWidthMm, h: pageHeightMm } = PAGE_SIZE_DEFS[opts.pageSize]
    const pageWidthPx = PAGE_PREVIEW_WIDTH_PX[opts.pageSize]
    const pageHeightPx = pageWidthPx * (pageHeightMm / pageWidthMm)
    const pageWidthPt = pageWidthMm * MM_TO_PT
    const pageHeightPt = pageHeightMm * MM_TO_PT

    const snapshot = revealPortal(portal, pageWidthPx)

    // Give the browser a frame to relayout at the target page width before measuring.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

    let pageRects
    let pdf
    try {
      pageRects = computePageRects(portal, pageHeightPx)

      // A naturally-packed page fills up to (just short of) the full page height,
      // so it gets the standard page size. A `trimmed` page — the last page, or one
      // cut short by a forced page-break (e.g. a bilingual-separate language switch)
      // — ends wherever its content actually ends, which is usually well short of a
      // full page; sizing its PDF page to match content height avoids a blank tail.
      const pageHeightsPt = pageRects.map((rect) => {
        const imgHeightPt = (rect.height / pageWidthPx) * pageWidthPt
        return rect.trimmed ? imgHeightPt : pageHeightPt
      })

      pdf = new (jsPDF as any)({ orientation: 'portrait', unit: 'pt', format: [pageWidthPt, pageHeightsPt[0]] })

      for (let i = 0; i < pageRects.length; i++) {
        const rect = pageRects[i]
        const canvas = await html2canvas(portal, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: rect.y,
          width: pageWidthPx,
          height: rect.height,
        })
        // html2canvas doesn't apply CSS `filter` when rasterizing, so SheetArticle's
        // grayscale(100%) filter (blackAndWhite option) has no effect on the capture —
        // desaturate the pixels directly instead.
        if (opts.blackAndWhite) desaturateCanvas(canvas)
        const imgData = canvas.toDataURL('image/jpeg', 0.92)
        const imgHeightPt = (rect.height / pageWidthPx) * pageWidthPt
        if (i > 0) pdf.addPage([pageWidthPt, pageHeightsPt[i]])
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthPt, imgHeightPt)
      }
    } finally {
      restorePortal(portal, snapshot)
    }

    if (isNativePlatform) {
      const base64 = pdf.output('datauristring').split(',')[1]
      const safeFilename = filename.replace(/[^a-zA-Z0-9\-_]/g, '-')
      const saved = await Filesystem.writeFile({
        path: `${safeFilename}.pdf`,
        data: base64,
        directory: Directory.Cache,
      })
      await Share.share({
        title: filename,
        url: saved.uri,
        dialogTitle: 'Save or Print PDF',
      })
    } else {
      pdf.save(`${filename}.pdf`)
    }
  } finally {
    onAfter?.()
  }
}
