import { jsPDF } from 'jspdf'
import { formSections, brand, FormSection, CaseItem } from './formConfig'

export type FormData = Record<string, string | string[] | CaseItem[]>

const isCheckedArray = (v: unknown): v is string[] => Array.isArray(v) && typeof v[0] !== 'object'

export function generatePdf(data: FormData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 18
  const maxW = pageW - margin * 2
  let y = margin

  const ensure = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }

  const line = (text: string, opts: { size?: number; bold?: boolean; color?: number[]; gap?: number } = {}) => {
    const { size = 11, bold = false, color = [30, 30, 30], gap = 1.5 } = opts
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(color[0], color[1], color[2])
    const lines = doc.splitTextToSize(text, maxW)
    lines.forEach((l: string) => {
      ensure(size * 0.5)
      doc.text(l, margin, y)
      y += size * 0.42 + gap
    })
  }

  // Header
  doc.setFillColor(15, 15, 18)
  doc.rect(0, 0, pageW, 26, 'F')
  doc.setTextColor(255, 122, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Leader Franchise · Leader AI', margin, 13)
  doc.setTextColor(200, 200, 200)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('AI Specialist Catalog Application', margin, 20)
  y = 36

  line(brand.heroTitle, { size: 15, bold: true, color: [15, 15, 18], gap: 3 })
  y += 4

  formSections.forEach((section: FormSection) => {
    ensure(16)
    doc.setDrawColor(255, 122, 0)
    doc.setLineWidth(0.6)
    doc.line(margin, y, margin + maxW, y)
    y += 5
    line(`${section.number}. ${section.title}`, { size: 13, bold: true, color: [255, 90, 0], gap: 2 })

    section.fields.forEach((field) => {
      const value = data[field.id]

      if (field.type === 'cases') {
        const cases = (value as CaseItem[]) || []
        cases.forEach((c, i) => {
          if (!c.client && !c.task && !c.done && !c.result && !c.contact) return
          line(`Кейс ${i + 1}`, { size: 11, bold: true, gap: 1 })
          if (c.client) line(`Клиент / ниша: ${c.client}`, { size: 10, color: [60, 60, 60] })
          if (c.task) line(`Задача: ${c.task}`, { size: 10, color: [60, 60, 60] })
          if (c.done) line(`Что сделали: ${c.done}`, { size: 10, color: [60, 60, 60] })
          if (c.result) line(`Результат в цифрах: ${c.result}`, { size: 10, color: [60, 60, 60] })
          if (c.contact) line(`Контакт для подтверждения: ${c.contact}`, { size: 10, color: [60, 60, 60] })
          y += 2
        })
        return
      }

      let display = ''
      if (isCheckedArray(value)) display = value.filter(Boolean).join(', ')
      else if (Array.isArray(value)) display = (value as string[]).filter(Boolean).join('\n')
      else if (typeof value === 'string') display = value

      if (!display) return
      line(field.label, { size: 11, bold: true, gap: 1 })
      line(display, { size: 10, color: [60, 60, 60] })
      y += 1.5
    })
    y += 3
  })

  ensure(20)
  y += 4
  doc.setDrawColor(220, 220, 220)
  doc.line(margin, y, margin + maxW, y)
  y += 6
  line(`Telegram: ${brand.footerTelegram}   ·   Email: ${brand.footerEmail}`, { size: 9, color: [120, 120, 120] })
  line(brand.footerNote, { size: 9, color: [120, 120, 120] })

  doc.save('anketa-ai-specialist.pdf')
}