import type { Production, Report } from './types'
import { formatDate } from './format'
import { slug } from './exporters'

/** Clean, human-readable title used as the PDF's document title & email subject. */
export function reportSubject(report: Report, production: Production): string {
  return `${production.title} - ${report.type} Report - ${formatDate(report.date)}`
}

/** Build a clean, page-filling PDF of a rehearsal/performance report.
    jsPDF (and its lazy html2canvas/dompurify deps) is imported on demand so it
    stays out of the initial bundle - it's only needed when someone exports. */
export async function buildReportPDF(report: Report, production: Production): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  // Document title (shown in viewer tab / file info) - the report's "subject".
  doc.setProperties({ title: reportSubject(report, production) })
  const margin = 54
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const maxW = pageW - margin * 2
  let y = margin

  // Paint an explicit white page. jsPDF pages are transparent by default, so in
  // a dark-mode viewer (e.g. the iOS Mail compose preview) the "paper" shows
  // through black and the text becomes near-invisible. A white fill guarantees
  // black-on-white everywhere. Must run before any content on each page.
  const paintBg = () => {
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, pageW, pageH, 'F')
  }
  paintBg()

  const ensure = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage()
      paintBg()
      y = margin
    }
  }
  const para = (text: string, size: number, bold: boolean, gap = 4, color = 0) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(color)
    for (const ln of doc.splitTextToSize(text, maxW)) {
      ensure(size + 2)
      doc.text(ln, margin, y)
      y += size + 2
    }
    y += gap
  }
  const bullet = (text: string) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(0)
    const lines = doc.splitTextToSize(text, maxW - 14)
    lines.forEach((ln: string, i: number) => {
      ensure(13)
      if (i === 0) doc.text('•', margin, y)
      doc.text(ln, margin + 14, y)
      y += 13
    })
    y += 2
  }
  const rule = () => {
    ensure(14)
    doc.setDrawColor(180)
    doc.line(margin, y, pageW - margin, y)
    y += 14
  }

  // Header
  para(production.title, 18, true, 2)
  para(`${report.type} Report · ${formatDate(report.date)}`, 12, false, 2)
  if (production.company) para(production.company, 10, false, 2, 120)
  rule()

  const heading = (t: string) => para(t.toUpperCase(), 10, true, 3)

  if (report.summary) {
    heading('Summary')
    para(report.summary, 11, false, 8)
  }
  if (report.workedOn) {
    heading('Worked On / Timing')
    para(report.workedOn, 11, false, 8)
  }
  for (const sec of report.sections) {
    if (sec.notes.length === 0) continue
    heading(sec.title)
    for (const n of sec.notes) bullet(n.text)
    y += 6
  }
  if (report.scheduleNote) {
    heading('Schedule / Next Call')
    para(report.scheduleNote, 11, false, 8)
  }

  return doc.output('blob')
}

function reportFilename(report: Report, production: Production): string {
  const type = report.type.toLowerCase().replace(/\s+/g, '-')
  return `${slug(production.title)}-${type}-report-${report.date}.pdf`
}

/**
 * Download the report as a clean PDF file. On iOS/iPadOS Safari this opens the
 * PDF in the viewer (from there it can be saved to Files or attached to an
 * email with a clean subject and no auto-filled body).
 */
export async function downloadReportPDF(report: Report, production: Production): Promise<void> {
  const blob = await buildReportPDF(report, production)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = reportFilename(report, production)
  a.click()
  // Revoke a tick later so the download/open has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
