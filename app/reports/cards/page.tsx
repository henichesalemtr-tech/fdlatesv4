'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

/* ================================================================
   CR80 — ISO 7810 ID-1 standard card size
   85.6 mm × 53.98 mm  →  at 96 dpi: 323px × 204px
   Print layout: A4 Landscape, 4 × 2 = 8 cards per sheet
================================================================ */

type Group   = { id: number; name: string; groupNumber: string }
type Student = {
  id: number; studentNumber: string; firstName: string; lastName: string
  educationalLevel: string | null; birthDate: string | null; status: string
  guardianName: string | null; guardianPhone: string | null; address: string | null
}

const SCHOOL_SHORT  = 'منصة الفردوس'
const ACADEMIC_YEAR = '2025/2026'

// CR80 dimensions in px @96dpi
const CW = 323   // 85.6 mm
const CH = 204   // 53.98 mm

const PALETTE: Record<string, { main: string; dark: string; light: string; accent: string }> = {
  green:  { main: '#1a5c35', dark: '#0f3d22', light: '#e8f5e9', accent: '#d4a017' },
  blue:   { main: '#0369a1', dark: '#0c4a6e', light: '#e0f2fe', accent: '#fbbf24' },
  gold:   { main: '#92400e', dark: '#6b2d0a', light: '#fef3c7', accent: '#10b981' },
  indigo: { main: '#4338ca', dark: '#312e81', light: '#e0e7ff', accent: '#f59e0b' },
  teal:   { main: '#0f766e', dark: '#0d5d56', light: '#ccfbf1', accent: '#f59e0b' },
}

/* ——— Single ID Card component ——— */
function IDCard({
  student, groupName, theme, showYear, showGroup, showBirthDate,
  contactPhone, contactWebsite, schoolName, forPdf = false,
}: {
  student: Student; groupName: string; theme: string
  showYear: boolean; showGroup: boolean; showBirthDate: boolean
  contactPhone: string; contactWebsite: string; schoolName: string; forPdf?: boolean
}) {
  const qrRef      = useRef<HTMLCanvasElement>(null)
  const barcodeRef = useRef<SVGSVGElement>(null)
  const p          = PALETTE[theme] ?? PALETTE.green

  useEffect(() => {
    let alive = true
    import('qrcode').then(QR => {
      if (!alive || !qrRef.current) return
      QR.toCanvas(qrRef.current, student.studentNumber, {
        width: 75, margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      })
    })
    import('jsbarcode').then(({ default: JsBarcode }) => {
      if (!alive || !barcodeRef.current) return
      try {
        JsBarcode(barcodeRef.current, student.studentNumber, {
          format: 'CODE128', width: 1.05, height: 17,
          displayValue: false, fontSize: 6.5, margin: 0, textMargin: 1,
          background: 'transparent', lineColor: '#000000', textAlign: 'center',
        })
      } catch { /* ignore */ }
    })
    return () => { alive = false }
  }, [student.studentNumber])

  return (
    <div
      className="id-card"
      data-card="true"
      style={{
        width: CW, height: CH,
        border: `2px solid ${p.main}`,
        borderRadius: 7,
        overflow: 'hidden',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Cairo','Segoe UI',sans-serif",
        position: 'relative',
        boxShadow: forPdf ? 'none' : '0 3px 12px rgba(0,0,0,0.15)',
        flexShrink: 0,
      }}
    >
      {/* ── Watermark background image ── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
      }}>
        <img src="/ferdous-bg.jpg" alt="" style={{
          width: '88%', height: 'auto', objectFit: 'contain',
          opacity: 0.10, userSelect: 'none',
        }} />
      </div>

      {/* ── All content above watermark ── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Header bar */}
        <div style={{
          background: `linear-gradient(to left, ${p.main}, ${p.dark})`,
          padding: '3px 7px',
          display: 'flex', alignItems: 'center', gap: 5,
          flexShrink: 0,
        }}> 
           {/* Mini logo
          <img src="/logo.png" alt=""
            style={{ width: 17, height: 17, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }} />  */}
          <span style={{ color: '#fff', fontSize: 8.5, fontWeight: 700, flex: 1 }}>{schoolName || SCHOOL_SHORT}</span>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 7.5 }}>بطاقة طالب</span>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '4px 7px 2px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Row 1: ID number + group badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontWeight: 800, fontSize: 11.5, color: p.main, fontFamily: 'monospace', letterSpacing: 0.5 }}>
              {student.studentNumber}
            </span>
            {showGroup && groupName && (
              <span style={{
                fontSize: 7.5, fontWeight: 700, color: p.dark,
                background: p.light, padding: '1px 7px', borderRadius: 20,
                border: `1px solid ${p.main}44`,
                maxWidth: 115, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {groupName}
              </span>
            )}
          </div>

          {/* Row 2: name/info + QR */}
          <div style={{ display: 'flex', gap: 6, flex: 1, overflow: 'hidden' }}>
            {/* Info */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
              <p style={{
                fontWeight: 700, fontSize: 11, color: '#0f0f0f',
                margin: '0 0 2px', lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {student.firstName} {student.lastName}
              </p>
              {showBirthDate && student.birthDate && (
                <p style={{ fontSize: 7.5, color: '#555', margin: '0 0 1px', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span><svg xmlns="http://www.w3.org/2000/svg" width={9} height={9} viewBox="0 0 24 24" fill={p.main} style={{ flexShrink: 0 }}>
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V8h14v11z"/>
                  </svg></span> {student.birthDate}
                </p>
              )}
              {/* Guardian info */}
              {student.guardianName && (
                <p style={{ fontSize: 7.5, color: '#444', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  👤 {student.guardianName}
                </p>
              )}
              {student.guardianPhone && (
                <p style={{ fontSize: 7.5, color: '#444', margin: '0 0 1px', display: 'flex', alignItems: 'center', gap: 2, direction: 'rtl' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill={p.main} style={{ flexShrink: 0 }}>
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                  </svg>
                  {student.guardianPhone}
                </p>
              )}
              {student.address && (
                <p style={{ fontSize: 7, color: '#555', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span><svg xmlns="http://www.w3.org/2000/svg" width={9} height={9} viewBox="0 0 24 24" fill={p.main} style={{ flexShrink: 0 }}>
                    <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
                  </svg></span> {student.address}
                </p>
              )}
              {showYear && (
                <p style={{ fontSize: 7, color: '#777', margin: '1px 0 0' }}>السنة: {ACADEMIC_YEAR}</p>
              )}
            </div>
            {/* QR */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <div style={{ border: `1.5px solid ${p.main}`, borderRadius: 4, padding: 2, background: '#fff', lineHeight: 0 }}>
                <canvas ref={qrRef} style={{ width: 75, height: 75, display: 'block' }} />
              </div>
            </div>
          </div>

          {/* Row 3: Barcode + contact info */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: (contactPhone || contactWebsite) ? 0 : 1 }}>
            <svg ref={barcodeRef} style={{ width: '100%', height: 26 }} />
          </div>

          {/* Row 4: Contact info (optional) */}
          {(contactPhone || contactWebsite) && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, marginTop: 1, paddingTop: 1,
              borderTop: `1px dashed ${p.main}33`,
            }}>
              {contactPhone && (
                <span style={{ fontSize: 6.5, color: '#555', display: 'flex', alignItems: 'center', gap: 2, direction: 'ltr' }}>
                  <svg width="7" height="7" viewBox="0 0 24 24" fill={p.main} style={{ flexShrink: 0 }}>
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                  </svg>
                  {contactPhone}
                </span>
              )}
              {contactWebsite && (
                <span style={{ fontSize: 6.5, color: '#555', display: 'flex', alignItems: 'center', gap: 2, direction: 'ltr' }}>
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={p.main} strokeWidth="2.5" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                  {contactWebsite}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom accent strip */}
        <div style={{
          height: 4,
          background: `linear-gradient(to right, ${p.main}, ${p.accent}, ${p.main})`,
          flexShrink: 0,
        }} />
      </div>
    </div>
  )
}

/* ——— Main page ——— */
export default function CardsPage() {
  const [groups, setGroups]               = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [students, setStudents]           = useState<Student[]>([])
  const [theme, setTheme]                 = useState('green')
  const [showYear, setShowYear]           = useState(true)
  const [showGroup, setShowGroup]         = useState(true)
  const [showBirthDate, setShowBirthDate] = useState(false)
  const [contactPhone, setContactPhone]   = useState('')
  const [contactWebsite, setContactWebsite] = useState('')
  const [schoolName, setSchoolName]       = useState('')
  const [loading, setLoading]             = useState(false)
  const [exporting, setExporting]         = useState(false)
  const gridRef                           = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then(setGroups)
    fetch('/api/settings').then(r => r.json()).then((data: { key: string; value: string | null }[]) => {
      const s = data.find(d => d.key === 'school_name')
      if (s?.value) setSchoolName(s.value)
    }).catch(() => {})
  }, [])

  async function loadStudents() {
    setLoading(true)
    if (selectedGroup) {
      const data = await fetch(`/api/groups/${selectedGroup}`).then(r => r.json())
      setStudents(Array.isArray(data) ? data.filter(Boolean) : [])
    } else {
      setStudents(await fetch('/api/students').then(r => r.json()))
    }
    setLoading(false)
  }

  useEffect(() => { loadStudents() }, [selectedGroup])

  const currentGroup = groups.find(g => String(g.id) === selectedGroup)

  /* ── Export to PDF: open isolated print window with QR, barcode & background ── */
  const exportPDF = useCallback(async () => {
    if (students.length === 0) return
    setExporting(true)

    const p = PALETTE[theme] ?? PALETTE.green
    const groupLabel = currentGroup?.name ?? ''

    // Load libraries
    const [QRLib, { default: JsBarcode }] = await Promise.all([
      import('qrcode'),
      import('jsbarcode'),
    ])

    // Load background image as base64 data URL
    let bgDataUrl = ''
    try {
      const bgRes = await fetch('/ferdous-bg.jpg')
      const bgBlob = await bgRes.blob()
      bgDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(bgBlob)
      })
    } catch { /* skip bg if unavailable */ }

    // Generate QR + barcode data URLs for every student
    const studentAssets = await Promise.all(students.map(async (s) => {
      // QR code as PNG data URL
      let qrDataUrl = ''
      try {
        qrDataUrl = await QRLib.toDataURL(s.studentNumber, {
          width: 75, margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        })
      } catch { /* skip */ }

      // Barcode as SVG string
      let barcodeHtml = ''
      try {
        const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        JsBarcode(svgEl, s.studentNumber, {
          format: 'CODE128', width: 1.05, height: 17,
          displayValue: false, fontSize: 6.5, margin: 0, textMargin: 1,
          background: 'transparent', lineColor: '#000000', textAlign: 'center',
          xmlDocument: document,
        })
        barcodeHtml = svgEl.outerHTML
      } catch { /* skip */ }

      return { qrDataUrl, barcodeHtml }
    }))

    // Build card HTML for each student
    const cardsHtml = students.map((s, i) => {
      const { qrDataUrl, barcodeHtml } = studentAssets[i]
      const guardian = s.guardianName ? `<p style="font-size:7.5pt;color:#444;margin:0 0 1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><svg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 24 24' fill='${p.main}' style='vertical-align:middle;margin-left:2px;'><path d='M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z'/></svg> ${s.guardianName}</p>` : ''
      const gphone   = s.guardianPhone ? `<p style="font-size:7.5pt;color:#444;margin:0 0 1px;"><svg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 24 24' fill='${p.main}' style='vertical-align:middle;margin-left:2px;'><path d='M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z'/></svg> ${s.guardianPhone}</p>` : ''
      const addr  = s.address    ? `<p style="font-size:7pt;color:#555;margin:0 0 1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><svg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 24 24' fill='${p.main}' style='vertical-align:middle;margin-left:2px;'><path d='M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z'/></svg> ${s.address}</p>` : ''
      const birth = showBirthDate && s.birthDate ? `<p style="font-size:7.5pt;color:#555;margin:0 0 1px;"><svg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 24 24' fill='${p.main}' style='vertical-align:middle;margin-left:2px;'><path d='M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V8h14v11z'/></svg> ${s.birthDate}</p>` : ''
      const year = showYear ? `<p style="font-size:7pt;color:#777;margin:1px 0 0;">السنة: ${ACADEMIC_YEAR}</p>` : ''
      const grp = showGroup && groupLabel ? `<span style="font-size:7.5pt;font-weight:700;color:${p.dark};background:${p.light};padding:1px 7px;border-radius:20px;border:1px solid ${p.main}44;max-width:115px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${groupLabel}</span>` : ''
      const bgImgHtml = bgDataUrl ? `<img src="${bgDataUrl}" alt="" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:88%;height:auto;object-fit:contain;opacity:0.10;pointer-events:none;z-index:0;" />` : ''
      const qrHtml = qrDataUrl ? `<div style="flex-shrink:0;display:flex;align-items:center;"><div style="border:1.5px solid ${p.main};border-radius:4px;padding:2px;background:#fff;line-height:0;"><img src="${qrDataUrl}" width="75" height="75" style="display:block;"/></div></div>` : ''
      const bcHtml = barcodeHtml ? `<div style="display:flex;justify-content:center;margin-top:${contactPhone || contactWebsite ? '0' : '1px'};">${barcodeHtml}</div>` : ''

      const phoneIcon = `<svg width="7" height="7" viewBox="0 0 24 24" fill="${p.main}"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>`
      const webIcon   = `<svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="${p.main}" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`
      const phoneSpan = contactPhone  ? `<span style="font-size:6.5pt;color:#555;display:flex;align-items:center;gap:2px;direction:ltr;">${phoneIcon}${contactPhone}</span>` : ''
      const webSpan   = contactWebsite ? `<span style="font-size:6.5pt;color:#555;display:flex;align-items:center;gap:2px;direction:ltr;">${webIcon}${contactWebsite}</span>` : ''
      const contactHtml = (contactPhone || contactWebsite)
        ? `<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:1px;padding-top:1px;border-top:1px dashed ${p.main}33;">${phoneSpan}${webSpan}</div>`
        : ''

      return `
        <div class="card" style="width:85.6mm;height:53.98mm;border:2px solid ${p.main};border-radius:3mm;overflow:hidden;background:#fff;display:flex;flex-direction:column;font-family:Cairo,sans-serif;page-break-inside:avoid;break-inside:avoid;position:relative;">
          ${bgImgHtml}
          <div style="position:relative;z-index:1;display:flex;flex-direction:column;flex:1;">
            <div style="background:linear-gradient(to left,${p.main},${p.dark});padding:3px 7px;display:flex;align-items:center;gap:5px;flex-shrink:0;">
              <span style="color:#fff;font-size:8.5pt;font-weight:700;flex:1;">${schoolName || SCHOOL_SHORT}</span>
              <span style="color:rgba(255,255,255,0.75);font-size:7.5pt;">بطاقة طالب</span>
            </div>
            <div style="flex:1;padding:4px 7px 2px;display:flex;flex-direction:column;overflow:hidden;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;">
                <span style="font-weight:800;font-size:11.5pt;color:${p.main};font-family:monospace;letter-spacing:0.5px;">${s.studentNumber}</span>
                ${grp}
              </div>
              <div style="display:flex;gap:6px;flex:1;overflow:hidden;">
                <div style="flex:1;display:flex;flex-direction:column;justify-content:center;min-width:0;">
                  <p style="font-weight:700;font-size:11pt;color:#0f0f0f;margin:0 0 2px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.firstName} ${s.lastName}</p>
                  ${birth}${guardian}${gphone}${addr}${year}
                </div>
                ${qrHtml}
              </div>
              ${bcHtml}
              ${contactHtml}
            </div>
            <div style="height:4px;background:linear-gradient(to right,${p.main},${p.accent},${p.main});flex-shrink:0;"></div>
          </div>
        </div>`
    }).join('')

    const html = `<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: white; font-family: Cairo, sans-serif; }
  @page { size: A4 landscape; margin: 8mm; }
  .grid { display: grid; grid-template-columns: repeat(3, 85.6mm); grid-auto-rows: 53.98mm; gap: 4mm; width: fit-content; margin: 0 auto; }
  .card { page-break-inside: avoid; break-inside: avoid; }
  @media print { body { margin: 0; } -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
</head>
<body>
<div class="grid">${cardsHtml}</div>
<script>window.onload = function(){ setTimeout(function(){ window.print(); window.close(); }, 1200); }<\/script>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank', 'width=1100,height=800')
    if (!win) {
      alert('يرجى السماح بالنوافذ المنبثقة لتصدير PDF')
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    setExporting(false)
  }, [students, currentGroup, theme, showYear, showGroup, showBirthDate, contactPhone, contactWebsite, schoolName])

  const THEMES = [
    { value: 'green',  label: '🟢 أخضر الفردوس' },
    { value: 'blue',   label: '🔵 أزرق سماوي' },
    { value: 'gold',   label: '🟡 ذهبي بني' },
    { value: 'indigo', label: '🟣 بنفسجي' },
    { value: 'teal',   label: '🩵 أخضر مائي' },
  ]

  const toolbarBtn = (
    onClick: () => void,
    label: string,
    bg: string,
    disabled = false
  ) => (
    <button onClick={onClick} disabled={disabled} style={{
      background: bg, color: '#fff', border: 'none',
      padding: '8px 20px', borderRadius: 9,
      fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      display: 'flex', alignItems: 'center', gap: 7,
      boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.18)',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )

  return (
    <>
      {/* ══ Toolbar ══ */}
      <div className="no-print" style={{
        position: 'fixed', top: 0, right: 0, left: 0, zIndex: 50,
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        padding: '10px 20px',
      }}>
        {/* Row 1: controls */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>

          <Link href="/reports" style={{
            border: '1px solid #d1d5db', color: '#4b5563', background: '#f9fafb',
            padding: '7px 14px', borderRadius: 8, fontSize: 13, textDecoration: 'none',
          }}>← رجوع</Link>

          {/* Group */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>الفوج</label>
            <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
              style={{ border: '1px solid #d1d5db', borderRadius: 7, padding: '6px 10px', fontSize: 13, minWidth: 160 }}>
              <option value="">جميع الطلاب</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          {/* Theme */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>اللون</label>
            <select value={theme} onChange={e => setTheme(e.target.value)}
              style={{ border: '1px solid #d1d5db', borderRadius: 7, padding: '6px 10px', fontSize: 13 }}>
              {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>خيارات البطاقة</label>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={showYear} onChange={e => setShowYear(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: '#1a5c35' }} />
                <span>السنة الدراسية</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={showGroup} onChange={e => setShowGroup(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: '#1a5c35' }} />
                <span>اسم الفوج</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={showBirthDate} onChange={e => setShowBirthDate(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: '#1a5c35' }} />
                <span>تاريخ الميلاد</span>
              </label>
            </div>
          </div>

          {/* Contact info fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>معلومات الاتصال (اختياري)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1px solid #d1d5db', borderRadius: 7, padding: '4px 8px', background: contactPhone ? '#f0fdf4' : '#fff' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#1a5c35">
                  <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                </svg>
                <input
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="رقم هاتف المؤسسة"
                  style={{ border: 'none', outline: 'none', fontSize: 12, width: 140, background: 'transparent' }}
                />
                {contactPhone && (
                  <button onClick={() => setContactPhone('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1px solid #d1d5db', borderRadius: 7, padding: '4px 8px', background: contactWebsite ? '#f0fdf4' : '#fff' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1a5c35" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <input
                  value={contactWebsite}
                  onChange={e => setContactWebsite(e.target.value)}
                  placeholder="الموقع الإلكتروني"
                  style={{ border: 'none', outline: 'none', fontSize: 12, width: 150, background: 'transparent' }}
                />
                {contactWebsite && (
                  <button onClick={() => setContactWebsite('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ marginRight: 'auto', display: 'flex', gap: 10 }}>
            {toolbarBtn(
              exportPDF,
              exporting ? '⏳ جاري التصدير...' : `📄 تصدير PDF (${students.length})`,
              'linear-gradient(to left, #1e40af, #3b82f6)',
              exporting || students.length === 0
            )}
            {toolbarBtn(
              () => window.print(),
              `🖨️ طباعة (${students.length})`,
              'linear-gradient(to left, #1a5c35, #2d7a4a)',
              students.length === 0
            )}
          </div>
        </div>

        {/* Row 2: info */}
        <div style={{ marginTop: 6, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>📐 CR80: 85.6 × 53.98 mm (مقاس بطاقة الهوية الرسمي)</span>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>🖨️ 9 بطاقات لكل ورقة A4 أفقية</span>
          {showGroup && (
            <span style={{ fontSize: 11, color: currentGroup ? '#1a5c35' : '#f59e0b', fontWeight: 600 }}>
              {currentGroup ? `✅ الفوج: ${currentGroup.name}` : 'ℹ️ اختر فوجاً لإظهار اسمه على البطاقات'}
            </span>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="no-print" style={{ height: 96 }} />

      {/* ══ Cards grid ══ */}
      {loading ? (
        <div className="no-print" style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 15 }}>
          جاري التحميل...
        </div>
      ) : students.length === 0 ? (
        <div className="no-print" style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🪪</div>
          <p>اختر فوجاً أو تأكد من وجود طلاب مسجلين</p>
        </div>
      ) : (
        <>
          <div className="no-print" style={{ padding: '8px 20px 4px', fontSize: 12, color: '#6b7280' }}>
            معاينة — {students.length} بطاقة
          </div>
          <div
            id="cards-grid"
            ref={gridRef}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
              padding: '12px 20px 40px',
              background: '#f3f4f6',
            }}
          >
            {students.map(s => (
              <IDCard
                key={s.id}
                student={s}
                groupName={currentGroup?.name ?? ''}
                theme={theme}
                showYear={showYear}
                showGroup={showGroup}
                showBirthDate={showBirthDate}
                contactPhone={contactPhone}
                contactWebsite={contactWebsite}
                schoolName={schoolName}
              />
            ))}
          </div>
        </>
      )}

      {/* ══ Print CSS ══ */}
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }

          @page { size: A4 landscape; margin: 8mm; }

          #cards-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 85.6mm) !important;
            grid-auto-rows: 53.98mm !important;
            column-gap: 4mm !important;
            row-gap: 4mm !important;
            gap: 4mm !important;
            padding: 0 !important;
            background: white !important;
            width: fit-content !important;
            margin: 0 auto !important;
          }

          .id-card {
            width: 85.6mm !important;
            height: 53.98mm !important;
            box-shadow: none !important;
            border-radius: 3mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </>
  )
}
