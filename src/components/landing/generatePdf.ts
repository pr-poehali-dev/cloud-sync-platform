import { formSections, brand, FormSection, CaseItem } from './formConfig'

export type FormData = Record<string, string | string[] | CaseItem[]>

const isCheckedArray = (v: unknown): v is string[] => Array.isArray(v) && typeof v[0] !== 'object'

export function generatePdf(data: FormData) {
  const sections = formSections.map((section: FormSection) => {
    const fieldsHtml = section.fields.map((field) => {
      const value = data[field.id]

      if (field.type === 'cases') {
        const cases = (value as CaseItem[]) || []
        const filtered = cases.filter((c) => c.client || c.task || c.done || c.result)
        if (!filtered.length) return ''
        return filtered.map((c, i) => `
          <div class="case">
            <div class="case-title">Кейс ${i + 1}</div>
            ${c.client ? `<div class="field-row"><span class="field-label">Клиент / ниша:</span> ${c.client}</div>` : ''}
            ${c.task ? `<div class="field-row"><span class="field-label">Задача:</span> ${c.task}</div>` : ''}
            ${c.done ? `<div class="field-row"><span class="field-label">Что сделали:</span> ${c.done}</div>` : ''}
            ${c.result ? `<div class="field-row"><span class="field-label">Результат:</span> ${c.result}</div>` : ''}
            ${c.contact ? `<div class="field-row"><span class="field-label">Контакт:</span> ${c.contact}</div>` : ''}
          </div>
        `).join('')
      }

      let display = ''
      if (isCheckedArray(value)) display = value.filter(Boolean).join(', ')
      else if (Array.isArray(value)) display = (value as string[]).filter(Boolean).join(', ')
      else if (typeof value === 'string') display = value

      if (!display) return ''
      return `
        <div class="field">
          <div class="field-label">${field.label}</div>
          <div class="field-value">${display.replace(/\n/g, '<br/>')}</div>
        </div>
      `
    }).join('')

    if (!fieldsHtml.trim()) return ''
    return `
      <div class="section">
        <div class="section-header">
          <span class="section-num">${section.number}</span>
          ${section.title}
        </div>
        ${fieldsHtml}
      </div>
    `
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Анкета ИИ-специалиста</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; background: #fff; }
    .header { background: #0f0f12; color: #fff; padding: 14px 24px 12px; }
    .header-title { color: #FF7A00; font-size: 15pt; font-weight: 700; }
    .header-sub { color: #aaa; font-size: 9pt; margin-top: 2px; }
    .hero { padding: 14px 24px 4px; border-bottom: 1px solid #eee; }
    .hero h1 { font-size: 14pt; font-weight: 700; color: #111; }
    .content { padding: 0 24px 24px; }
    .section { margin-top: 18px; page-break-inside: avoid; }
    .section-header { font-size: 12pt; font-weight: 700; color: #FF5A00; border-bottom: 2px solid #FF5A00; padding-bottom: 4px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    .section-num { background: #FF5A00; color: #fff; border-radius: 50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 10pt; font-weight: 700; flex-shrink: 0; }
    .field { margin-bottom: 8px; }
    .field-label { font-size: 9pt; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
    .field-value { font-size: 10.5pt; color: #1a1a1a; line-height: 1.5; }
    .case { background: #fafafa; border: 1px solid #eee; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; }
    .case-title { font-weight: 700; font-size: 10pt; color: #FF5A00; margin-bottom: 6px; }
    .field-row { font-size: 10pt; color: #333; margin-bottom: 3px; line-height: 1.4; }
    .footer { margin-top: 24px; border-top: 1px solid #ddd; padding-top: 10px; color: #888; font-size: 8.5pt; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">Leader Franchise · Leader AI</div>
    <div class="header-sub">AI Specialist Catalog Application</div>
  </div>
  <div class="hero"><h1>${brand.heroTitle}</h1></div>
  <div class="content">
    ${sections}
    <div class="footer">
      Telegram: ${brand.footerTelegram} &nbsp;·&nbsp; Email: ${brand.footerEmail}<br/>
      ${brand.footerNote}
    </div>
  </div>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.onload = () => {
    setTimeout(() => {
      win.print()
      win.close()
    }, 500)
  }
}
