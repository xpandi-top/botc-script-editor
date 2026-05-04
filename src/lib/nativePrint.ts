import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export const isNativePlatform = Capacitor.isNativePlatform()

/**
 * On iOS/Android: capture element with html2canvas → jsPDF → share via OS share sheet.
 * Falls back to window.print() on web.
 */
export async function printOrShare(
  element: HTMLElement,
  filename: string,
  onBefore?: () => void,
  onAfter?: () => void,
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

    // Expand element to full scroll height so html2canvas captures everything
    const originalOverflow = element.style.overflow
    const originalMaxHeight = element.style.maxHeight
    element.style.overflow = 'visible'
    element.style.maxHeight = 'none'

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: element.scrollWidth,
      height: element.scrollHeight,
    })

    element.style.overflow = originalOverflow
    element.style.maxHeight = originalMaxHeight

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
