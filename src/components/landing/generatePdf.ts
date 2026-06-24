import { formSections, brand, FormSection, CaseItem } from './formConfig'

export type FormData = Record<string, string | string[] | CaseItem[]>

const isCheckedArray = (v: unknown): v is string[] => Array.isArray(v) && typeof v[0] !== 'object'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function generatePdf(data: FormData) {
  const photo = typeof data.photo === 'string' ? data.photo : ''
  const portfolioPhotos = Array.isArray(data.portfolioPhotos)
    ? (data.portfolioPhotos as string[]).filter(Boolean)
    : []

  const renderField = (field: { id: string; label: string; type: string; options?: string[]; placeholder?: string; hint?: string; required?: boolean }) => {
    const value = data[field.id]

    if (field.type === 'radio') {
      const selected = typeof value === 'string' ? value : ''
      return `
        <div class="field">
          <div class="field-label">${esc(field.label)}${field.required ? ' <span class="req">*</span>' : ''}</div>
          <div class="options-grid">
            ${(field.options || []).map(opt => `
              <div class="option-item ${selected === opt ? 'checked' : ''}">
                <div class="radio-dot ${selected === opt ? 'radio-dot--on' : ''}"></div>
                <span>${esc(opt)}</span>
              </div>`).join('')}
          </div>
        </div>`
    }

    if (field.type === 'checkbox') {
      const selected = isCheckedArray(value) ? value : []
      return `
        <div class="field">
          <div class="field-label">${esc(field.label)}</div>
          <div class="options-grid">
            ${(field.options || []).map(opt => `
              <div class="option-item ${selected.includes(opt) ? 'checked' : ''}">
                <div class="checkbox-box ${selected.includes(opt) ? 'checkbox-box--on' : ''}">
                  ${selected.includes(opt) ? '<span class="checkmark">✓</span>' : ''}
                </div>
                <span>${esc(opt)}</span>
              </div>`).join('')}
          </div>
        </div>`
    }

    if (field.type === 'text') {
      const val = typeof value === 'string' ? value : ''
      return `
        <div class="field">
          <div class="field-label">${esc(field.label)}${field.required ? ' <span class="req">*</span>' : ''}</div>
          <div class="input-box">${val ? esc(val) : `<span class="placeholder">${esc(field.placeholder || '')}</span>`}</div>
        </div>`
    }

    if (field.type === 'multi-text') {
      const vals = Array.isArray(value) ? (value as string[]).filter(Boolean) : []
      return `
        <div class="field">
          <div class="field-label">${esc(field.label)}</div>
          ${vals.length
            ? vals.map(v => `<div class="input-box" style="margin-bottom:4px">${esc(v)}</div>`).join('')
            : `<div class="input-box"><span class="placeholder">${esc(field.placeholder || '')}</span></div>`}
        </div>`
    }

    if (field.type === 'textarea') {
      const val = typeof value === 'string' ? value : ''
      return `
        <div class="field">
          <div class="field-label">${esc(field.label)}${field.required ? ' <span class="req">*</span>' : ''}</div>
          ${field.hint ? `<div class="field-hint">${esc(field.hint)}</div>` : ''}
          <div class="input-box textarea-box">${val ? esc(val).replace(/\n/g, '<br/>') : `<span class="placeholder">${esc(field.placeholder || '')}</span>`}</div>
        </div>`
    }

    if (field.type === 'cases') {
      const cases = (value as CaseItem[]) || []
      const filled = cases.filter(c => c.client || c.task || c.done || c.result)
      return `
        <div class="field">
          <div class="field-label">${esc(field.label)}</div>
          ${field.hint ? `<div class="field-hint">${esc(field.hint)}</div>` : ''}
          ${filled.map((c, i) => `
            <div class="case-block">
              <div class="case-num">Кейс ${i + 1}${c.client ? ` — ${esc(c.client)}` : ''}</div>
              ${([['Задача', c.task], ['Что сделали', c.done], ['Результат', c.result], ['Контакт', c.contact]] as [string, string][])
                .filter(([, v]) => v).map(([l, v]) => `
                <div class="case-row">
                  <div class="case-row-label">${l}</div>
                  <div class="case-row-value">${esc(v)}</div>
                </div>`).join('')}
            </div>`).join('')}
        </div>`
    }

    if (field.type === 'date') {
      const val = typeof value === 'string' ? value : ''
      return `
        <div class="field">
          <div class="field-label">${esc(field.label)}</div>
          <div class="input-box" style="width:180px">${val ? esc(val) : '<span class="placeholder">дд.мм.гггг</span>'}</div>
        </div>`
    }

    if (field.type === 'photos') return ''

    return ''
  }

  const sectionsHtml = formSections.map((section: FormSection) => {
    const fieldsHtml = section.fields.map(f => renderField(f)).join('')
    return `
      <div class="section">
        <div class="section-divider"></div>
        <div class="section-header">
          <div class="section-num">${section.number}</div>
          <div class="section-title">${esc(section.title)}</div>
        </div>
        ${section.intro ? `<div class="section-intro">${esc(section.intro)}</div>` : ''}
        <div class="section-fields">${fieldsHtml}</div>
      </div>`
  }).join('')

  const photosHtml = portfolioPhotos.length ? `
    <div class="section">
      <div class="section-divider"></div>
      <div class="field-label" style="color:#ccc;font-size:8.5pt;font-weight:600;margin-bottom:8px">Фото из портфолио</div>
      <div class="photos-row">
        ${portfolioPhotos.map(url => `<img src="${url}" class="portfolio-img" onerror="this.style.display='none'" />`).join('')}
      </div>
    </div>` : ''

  const nameVal = typeof data.name === 'string' ? data.name : ''
  const cityVal = typeof data.city === 'string' ? data.city : ''
  const typeVal = typeof data.type === 'string' ? data.type : ''

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Анкета — ${esc(nameVal || 'ИИ-специалист')}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; font-size: 11pt; background: #0a0a0c; color: #e8e8e8; }

    .header {
      background: #0f0f12;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      padding: 12px 24px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .header-brand { font-size: 13pt; font-weight: 700; }
    .brand-fr, .brand-ai { color: #FF5A00; }
    .brand-sep { color: #444; margin: 0 6px; }
    .header-right { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #FF5A00; }
    .hero-name { font-size: 11pt; font-weight: 700; color: #fff; text-align: right; }
    .hero-meta { font-size: 8pt; color: #888; text-align: right; margin-top: 2px; }

    .page-title-block { padding: 16px 24px 0; }
    .eyebrow { font-size: 7.5pt; font-weight: 700; color: #FF5A00; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px; }
    .page-title { font-size: 16pt; font-weight: 700; color: #fff; line-height: 1.3; }
    .page-subtitle { font-size: 8.5pt; color: #888; margin-top: 8px; line-height: 1.5; }

    .section { padding: 0 24px; }
    .section-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 20px 0 14px; }
    .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
    .section-num {
      width: 20px; height: 20px; border-radius: 50%;
      border: 1.5px solid #FF5A00; color: #FF5A00;
      font-size: 8.5pt; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .section-title { font-size: 11.5pt; font-weight: 700; color: #FF5A00; text-transform: uppercase; letter-spacing: 0.06em; }
    .section-intro { font-size: 8pt; color: #888; font-style: italic; margin-bottom: 12px; }
    .section-fields { display: flex; flex-direction: column; gap: 10px; }

    .field { }
    .field-label { font-size: 8pt; font-weight: 600; color: #aaa; margin-bottom: 5px; }
    .field-hint { font-size: 7.5pt; color: #777; font-style: italic; margin-bottom: 5px; }
    .req { color: #FF5A00; }

    .input-box {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      padding: 9px 13px;
      font-size: 10pt; color: #e8e8e8;
      min-height: 36px; line-height: 1.5;
    }
    .textarea-box { min-height: 60px; }
    .placeholder { color: #444; }

    .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
    .option-item {
      display: flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 8px 11px;
      font-size: 9pt; color: #bbb;
    }
    .option-item.checked {
      border-color: #FF5A00;
      background: rgba(255,90,0,0.1);
      color: #fff;
    }

    .radio-dot {
      width: 13px; height: 13px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.2); flex-shrink: 0;
    }
    .radio-dot--on { border-color: #FF5A00; background: radial-gradient(circle at center, #FF5A00 4px, transparent 4px); }

    .checkbox-box {
      width: 13px; height: 13px; border-radius: 3px;
      border: 2px solid rgba(255,255,255,0.2); flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .checkbox-box--on { border-color: #FF5A00; background: #FF5A00; }
    .checkmark { color: #000; font-size: 8pt; font-weight: 700; line-height: 1; }

    .case-block {
      border: 1px dashed rgba(255,255,255,0.1);
      border-radius: 10px; padding: 12px 14px; margin-bottom: 6px;
    }
    .case-num { font-size: 9.5pt; font-weight: 700; color: #FF5A00; margin-bottom: 8px; }
    .case-row { margin-bottom: 5px; }
    .case-row-label { font-size: 7pt; font-weight: 600; color: #777; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
    .case-row-value {
      font-size: 9pt; color: #ddd;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 5px; padding: 5px 9px;
    }

    .photos-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .portfolio-img { width: 130px; height: 96px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); }

    .footer {
      margin: 8px 24px 0;
      border-top: 1px solid rgba(255,255,255,0.07);
      padding: 12px 0 24px;
      font-size: 8pt; color: #444; line-height: 1.6;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-brand">
      <span class="brand-fr">Лидер Франшиз</span>
      <span class="brand-sep"> · </span>
      <span class="brand-ai">Лидер ИИ</span>
    </div>
    ${nameVal || photo ? `
    <div class="header-right">
      <div>
        ${nameVal ? `<div class="hero-name">${esc(nameVal)}</div>` : ''}
        ${typeVal || cityVal ? `<div class="hero-meta">${esc([typeVal, cityVal].filter(Boolean).join(' · '))}</div>` : ''}
      </div>
      ${photo ? `<img src="${photo}" class="avatar" onerror="this.style.display='none'" />` : ''}
    </div>` : ''}
  </div>

  <div class="page-title-block">
    <div class="eyebrow">${esc(brand.eyebrow)}</div>
    <div class="page-title">${esc(brand.heroTitle)}</div>
    <div class="page-subtitle">${esc(brand.heroSubtitle)}</div>
  </div>

  ${sectionsHtml}
  ${photosHtml}

  <div class="footer">
    Telegram: ${esc(brand.footerTelegram)} &nbsp;·&nbsp; Email: ${esc(brand.footerEmail)}<br/>
    ${esc(brand.footerNote)}
  </div>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.onload = () => setTimeout(() => { win.print() }, 800)
}
