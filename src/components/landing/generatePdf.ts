import { formSections, brand, FormSection, CaseItem } from './formConfig'

export type FormData = Record<string, string | string[] | CaseItem[]>

const isCheckedArray = (v: unknown): v is string[] => Array.isArray(v) && typeof v[0] !== 'object'

export function generatePdf(data: FormData) {
  const photo = typeof data.photo === 'string' ? data.photo : ''
  const portfolioPhotos = Array.isArray(data.portfolioPhotos) ? (data.portfolioPhotos as string[]).filter(Boolean) : []

  const photoHtml = photo
    ? `<img src="${photo}" class="avatar" onerror="this.style.display='none'" />`
    : ''

  const portfolioHtml = portfolioPhotos.length
    ? `<div class="section">
        <div class="section-header"><span class="section-num">📷</span> Фото из портфолио</div>
        <div class="photos-grid">
          ${portfolioPhotos.map(url => `<img src="${url}" class="portfolio-img" onerror="this.style.display='none'" />`).join('')}
        </div>
      </div>`
    : ''

  const sections = formSections.map((section: FormSection) => {
    const fieldsHtml = section.fields.map((field) => {
      // фото рендерим отдельно
      if (field.id === 'photo' || field.id === 'portfolioPhotos') return ''

      const value = data[field.id]

      if (field.type === 'cases') {
        const cases = (value as CaseItem[]) || []
        const filtered = cases.filter((c) => c.client || c.task || c.done || c.result)
        if (!filtered.length) return ''
        return filtered.map((c, i) => `
          <div class="case">
            <div class="case-title">Кейс ${i + 1}${c.client ? ` — ${c.client}` : ''}</div>
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

  const nameVal = typeof data.name === 'string' ? data.name : ''
  const cityVal = typeof data.city === 'string' ? data.city : ''
  const typeVal = typeof data.type === 'string' ? data.type : ''

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Анкета — ${nameVal || 'ИИ-специалист'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; background: #fff; }

    .header { background: #0f0f12; color: #fff; padding: 14px 24px 12px; display: flex; align-items: center; gap: 16px; }
    .header-text { flex: 1; }
    .header-title { color: #FF7A00; font-size: 15pt; font-weight: 700; }
    .header-sub { color: #aaa; font-size: 9pt; margin-top: 2px; }
    .avatar { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #FF7A00; flex-shrink: 0; }

    .hero { padding: 12px 24px 8px; border-bottom: 2px solid #FF5A00; display: flex; align-items: center; gap: 12px; }
    .hero-info { flex: 1; }
    .hero h1 { font-size: 13pt; font-weight: 700; color: #111; }
    .hero-meta { color: #666; font-size: 9.5pt; margin-top: 3px; }

    .content { padding: 4px 24px 24px; }
    .section { margin-top: 16px; page-break-inside: avoid; }
    .section-header { font-size: 11.5pt; font-weight: 700; color: #FF5A00; border-bottom: 1.5px solid #FF5A00; padding-bottom: 4px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    .section-num { background: #FF5A00; color: #fff; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: 700; flex-shrink: 0; }

    .field { margin-bottom: 7px; }
    .field-label { font-size: 8.5pt; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
    .field-value { font-size: 10.5pt; color: #1a1a1a; line-height: 1.5; }

    .case { background: #fafafa; border-left: 3px solid #FF5A00; padding: 8px 12px; margin-bottom: 8px; border-radius: 0 6px 6px 0; }
    .case-title { font-weight: 700; font-size: 10pt; color: #FF5A00; margin-bottom: 5px; }
    .field-row { font-size: 10pt; color: #333; margin-bottom: 3px; line-height: 1.4; }

    .photos-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
    .portfolio-img { width: 120px; height: 90px; object-fit: cover; border-radius: 6px; border: 1px solid #eee; }

    .footer { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 8px; color: #888; font-size: 8.5pt; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section { page-break-inside: avoid; }
      .photos-grid { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-text">
      <div class="header-title">Leader Franchise · Leader AI</div>
      <div class="header-sub">AI Specialist Catalog Application</div>
    </div>
    ${photoHtml}
  </div>

  <div class="hero">
    <div class="hero-info">
      <h1>${nameVal || brand.heroTitle}</h1>
      <div class="hero-meta">${[typeVal, cityVal].filter(Boolean).join(' · ')}</div>
    </div>
  </div>

  <div class="content">
    ${sections}
    ${portfolioHtml}
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
  win.onload = () => setTimeout(() => { win.print() }, 800)
}
