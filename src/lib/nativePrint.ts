import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { computePageRects } from './paginateSheet'
import { FONT_CSS, PAGE_PREVIEW_WIDTH_PX, PAGE_SIZE_DEFS } from '../components/PrintOptionsDialog'
import type { PrintOptions } from '../components/PrintOptionsDialog'
import { MM_TO_PX, type TokenPrintOptions } from '../components/PrintStudio/types'

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

function assetDataUrl(href: string, assets: Map<string, Promise<string>>): Promise<string> {
  if (href.startsWith('data:')) return Promise.resolve(href)
  if (!assets.has(href)) {
    assets.set(href, (async () => {
      const response = await fetch(href)
      if (!response.ok) throw new Error(`Could not load token asset: ${response.status}`)
      const blob = await response.blob()
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })
    })())
  }
  return assets.get(href)!
}

async function tokenFonts(opts: TokenPrintOptions, assets: Map<string, Promise<string>>): Promise<string> {
  const families = `${FONT_CSS[opts.fontKeyEn]}, ${FONT_CSS[opts.fontKeyZh]}`
  const fonts: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList
    try { rules = sheet.cssRules } catch { continue }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue
      const family = rule.style.fontFamily.replace(/["']/g, '')
      if (!families.includes(family)) continue
      let css = rule.cssText
      for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        const url = new URL(match[1], sheet.href || document.baseURI).href
        css = css.replace(match[0], `url("${await assetDataUrl(url, assets)}")`)
      }
      fonts.push(css)
    }
  }
  return fonts.join('\n')
}

/** External images and web fonts must be embedded in SVGs used as canvas images. */
async function tokenImage(svg: SVGSVGElement, assets: Map<string, Promise<string>>, fonts: string): Promise<HTMLImageElement> {
  await Promise.all(Array.from(svg.querySelectorAll('image')).map(async image => {
    const href = image.getAttribute('href')
    if (href) image.setAttribute('href', await assetDataUrl(href, assets))
  }))
  if (fonts) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    style.textContent = fonts
    svg.prepend(style)
  }
  // Grayscale is applied to the completed page so images and emoji agree.
  svg.style.filter = ''
  const source = new XMLSerializer().serializeToString(svg)
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`
  await image.decode()
  return image
}

/** Export the existing packed token pages directly to a PDF download/share.
 * Draw each transparent SVG at its measured position: overlapping SVG viewports
 * in the honeycomb layout must not become opaque rectangles or clip neighbours.
 * Each preview page maps to one PDF page at the selected physical paper size. */
export async function exportTokenPdf(
  opts: TokenPrintOptions,
  filename: string,
  onBefore?: () => void,
  onAfter?: () => void,
): Promise<void> {
  onBefore?.()
  try {
    const portal = document.querySelector<HTMLElement>('.token-print-portal')
    if (!portal) throw new Error('Token export content not found')
    const { jsPDF } = await import('jspdf')
    const { w, h } = PAGE_SIZE_DEFS[opts.pageSize]
    const width = w * MM_TO_PX
    const height = h * MM_TO_PX
    const snapshot = revealPortal(portal, width)
    let pages
    try {
      await document.fonts.ready
      // Capture all geometry and SVGs together so changes during export cannot
      // mix options or character selections across pages.
      pages = Array.from(portal.querySelectorAll<HTMLElement>('[data-token-page]')).map(page => {
        const bounds = page.getBoundingClientRect()
        return Array.from(page.querySelectorAll<SVGSVGElement>('svg')).map(svg => {
          const rect = svg.getBoundingClientRect()
          return { svg: svg.cloneNode(true) as SVGSVGElement,
            x: rect.left - bounds.left, y: rect.top - bounds.top,
            width: rect.width, height: rect.height }
        })
      })
    } finally {
      restorePortal(portal, snapshot)
    }
    if (!pages.length) throw new Error('No tokens selected')

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [w, h] })
    const assets = new Map<string, Promise<string>>()
    const fonts = await tokenFonts(opts, assets)
    for (let i = 0; i < pages.length; i++) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(width * 3)
      canvas.height = Math.ceil(height * 3)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Could not create PDF image')
      context.scale(canvas.width / width, canvas.height / height)
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, width, height)
      for (const token of pages[i]) {
        const image = await tokenImage(token.svg, assets, fonts)
        context.drawImage(image, token.x, token.y, token.width, token.height)
      }
      if (opts.blackAndWhite) desaturateCanvas(canvas)
      if (i > 0) pdf.addPage([w, h])
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h, undefined, 'FAST')
    }

    if (isNativePlatform) {
      const saved = await Filesystem.writeFile({
        path: `${filename.replace(/[/\\:*?"<>|]/g, '-')}.pdf`,
        data: pdf.output('datauristring').split(',')[1],
        directory: Directory.Cache,
      })
      await Share.share({ title: filename, url: saved.uri, dialogTitle: 'Save PDF' })
    } else {
      pdf.save(`${filename}.pdf`)
    }
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
