import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export const isNativePlatform = Capacitor.isNativePlatform()

/**
 * On iOS/Android: capture element with html2canvas → jsPDF → share via OS share sheet.
 * Falls back to window.print() on web.
 *
 * Pass `portalSelector` to capture a print portal (.print-portal / .token-print-portal)
 * instead of the live preview element. Portals have the correct print layout and are
 * temporarily revealed at A4 width before capture.
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

    const pdf = new jsPDF({
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
