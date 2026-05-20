'use client'

import { useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrintJobCard {
  route: string | null
  shift_start: string | null
  shift_end: string | null
  special_instructions: string | null
  special_instructions_alt: string | null
  revised_date: string
  service_days: string[]
  schedule_assignments: unknown
  is_translated: boolean
  prospects: { company_name: string } | null
  buildings: { building_name: string } | null
  positions: { position_name: string } | null
}

export interface PrintRouteRow {
  row_type: string
  time: string | null
  area_location: string | null
  notes: string | null
  notes_alt: string | null
}

export interface PrintDailyTask  { description_en: string; description_alt: string | null }
export interface PrintDetailTask { description_en: string; description_alt: string | null }
export interface PrintCoreRow    { day_period: string; zone_area: string | null; zone_area_alt: string | null }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  return s
    ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : ''
}

function parseFrequency(text: string): [string, string] {
  const m = text.match(/^(.*?)(\s*\([^)]+\))\s*$/)
  return m ? [m[1].trim(), m[2].trim()] : [text, '']
}

const DAY_ES: Record<string, string> = {
  Sun: 'Dom', Mon: 'Lun', Tue: 'Mar', Wed: 'Mié', Thu: 'Jue', Fri: 'Vie', Sat: 'Sáb',
}

// ─── Style constants ──────────────────────────────────────────────────────────

const pThStyle: React.CSSProperties = {
  background: '#1f2937',
  color: 'white',
  padding: '6px 8px',
  textAlign: 'left',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontSize: '11px',
  border: '1px solid #374151',
}

const pTdStyle: React.CSSProperties = {
  border: '1px solid #d1d5db',
  padding: '6px 8px',
  verticalAlign: 'top',
  fontSize: '12px',
  color: '#374151',
}

const pSecStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  borderBottom: '2px solid #111827',
  paddingBottom: '4px',
  marginBottom: '10px',
  color: '#111827',
}

// ─── Print: Page wrapper ──────────────────────────────────────────────────────

function PrintPage({ children, first = false }: {
  children: React.ReactNode; first?: boolean
}) {
  return (
    <div
      className={first ? '' : 'jc-page'}
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        padding: '0.75in',
        minHeight: '11in',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  )
}

// ─── Print: Full route header (Pages 1 & 3) ───────────────────────────────────

function PrintRouteHeader({
  positionName, route, prospectName, buildingName, specialInstructions, revisedDate, lang = 'en',
}: {
  positionName: string; route: string; prospectName: string; buildingName: string
  specialInstructions: string; revisedDate: string; lang?: 'en' | 'alt'
}) {
  const siteLine = [prospectName, buildingName].filter(Boolean).join(' — ')
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: '900', lineHeight: '1.2', color: '#111827' }}>
            {positionName || 'Job Card'}
          </div>
          {route && (
            <div style={{ fontSize: '13px', color: '#374151', marginTop: '4px' }}>{route}</div>
          )}
          {siteLine && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>{siteLine}</div>
          )}
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          textAlign: 'right', fontSize: '11px', color: '#374151',
          maxWidth: '260px', paddingLeft: '20px', flexShrink: 0,
        }}>
          <div>
            {specialInstructions && (
              <div style={{ lineHeight: '1.5' }}>
                <span style={{ fontWeight: '700' }}>
                  {lang === 'alt' ? 'Instrucciones especiales:' : 'Special Instructions:'}
                </span>{' '}{specialInstructions}
              </div>
            )}
          </div>
          <div style={{ color: '#9ca3af' }}>Revised: {fmtDate(revisedDate)}</div>
        </div>
      </div>
      <div style={{ borderTop: '3px solid #111827', marginBottom: '14px' }} />
    </>
  )
}

// ─── Print: Compact header (Pages 2 & 4) ─────────────────────────────────────

function PrintCompactHeader({
  positionName, route, prospectName, buildingName, revisedDate,
}: {
  positionName: string; route: string; prospectName: string; buildingName: string; revisedDate: string
}) {
  const titleLine = [positionName, route].filter(Boolean).join('  |  ')
  const siteLine  = [prospectName, buildingName].filter(Boolean).join(' — ')
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
        <div>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>{titleLine || 'Job Card'}</span>
          {siteLine && (
            <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '10px' }}>{siteLine}</span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0, paddingLeft: '16px' }}>
          Revised: {fmtDate(revisedDate)}
        </div>
      </div>
      <div style={{ borderTop: '3px solid #111827', marginBottom: '16px' }} />
    </>
  )
}

// ─── Print: Route page (Pages 1 & 3) ─────────────────────────────────────────

function PrintRoutePage({
  positionName, route, prospectName, buildingName, specialInstructions, revisedDate, rows, lang = 'en',
}: {
  positionName: string; route: string; prospectName: string; buildingName: string
  specialInstructions: string; revisedDate: string; rows: PrintRouteRow[]; lang?: 'en' | 'alt'
}) {
  const blanks = Math.max(8, 12 - rows.length)
  return (
    <>
      <PrintRouteHeader
        positionName={positionName} route={route}
        prospectName={prospectName} buildingName={buildingName}
        specialInstructions={specialInstructions} revisedDate={revisedDate}
        lang={lang}
      />
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '22%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '60%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={pThStyle}>Room / Area</th>
            <th style={pThStyle}>Time</th>
            <th style={pThStyle}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            if (row.row_type !== 'task') {
              const label = row.row_type === 'clock_in' ? 'CLOCK IN' : 'CLOCK OUT'
              return (
                <tr key={i} style={{ backgroundColor: '#e5e7eb' }}>
                  <td style={{ ...pTdStyle, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>
                    — {label} —
                  </td>
                  <td style={{ ...pTdStyle, fontWeight: '700' }}>{row.time}</td>
                  <td style={pTdStyle} />
                </tr>
              )
            }
            return (
              <tr key={i}>
                <td style={pTdStyle}>{row.area_location}</td>
                <td style={pTdStyle}>{row.time}</td>
                <td style={pTdStyle}>{lang === 'alt' ? (row.notes_alt || row.notes) : row.notes}</td>
              </tr>
            )
          })}
          {Array.from({ length: blanks }).map((_, i) => (
            <tr key={`b${i}`}>
              <td style={{ ...pTdStyle, padding: '18px 8px' }} />
              <td style={{ ...pTdStyle, padding: '18px 8px' }} />
              <td style={{ ...pTdStyle, padding: '18px 8px' }} />
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

// ─── Print: Tasks & Schedule page (Pages 2 & 4) ───────────────────────────────

function PrintTasksPage({
  positionName, route, prospectName, buildingName, revisedDate,
  dailyTasks, detailTasks, coreDetails, serviceDays, scheduleAssignments, lang,
}: {
  positionName: string; route: string; prospectName: string; buildingName: string; revisedDate: string
  dailyTasks: PrintDailyTask[]; detailTasks: PrintDetailTask[]; coreDetails: PrintCoreRow[]
  serviceDays: string[]; scheduleAssignments: Record<string, number>; lang: 'en' | 'alt'
}) {
  function text(en: string, alt: string | null) { return lang === 'en' ? en : (alt || en) }
  function coreArea(c: PrintCoreRow) {
    const name = c.zone_area || c.day_period
    return lang === 'en' ? name : (c.zone_area_alt || name)
  }

  return (
    <>
      <PrintCompactHeader
        positionName={positionName} route={route}
        prospectName={prospectName} buildingName={buildingName}
        revisedDate={revisedDate}
      />

      {/* Daily | Detail — two equal columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '28px' }}>
        <div>
          <div style={pSecStyle}>Daily</div>
          {dailyTasks.length === 0 ? (
            <span style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>None</span>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#374151', lineHeight: '1.75' }}>
              {dailyTasks.map((t, i) => (
                <li key={i}>{text(t.description_en, t.description_alt)}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div style={pSecStyle}>Detail</div>
          {detailTasks.length === 0 ? (
            <span style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>None</span>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#374151', lineHeight: '1.75' }}>
              {detailTasks.map((t, i) => {
                const [main, freq] = parseFrequency(text(t.description_en, t.description_alt))
                return (
                  <li key={i}>
                    {main}
                    {freq && <span style={{ fontStyle: 'italic', color: '#6b7280' }}>{' '}{freq}</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Area Schedule — unified table */}
      <div>
        <div style={pSecStyle}>{lang === 'alt' ? 'Horario de Detalle' : 'Detail Schedule'}</div>
        {coreDetails.length === 0 || serviceDays.length === 0 ? (
          <span style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>No schedule defined</span>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={pThStyle}>Area / Location</th>
                {serviceDays.map(day => (
                  <th key={day} style={{ ...pThStyle, textAlign: 'center', width: '48px' }}>
                    {lang === 'alt' ? (DAY_ES[day] ?? day) : day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coreDetails.map((c, coreIdx) => (
                <tr key={coreIdx}>
                  <td style={pTdStyle}>{coreArea(c)}</td>
                  {serviceDays.map(day => (
                    <td key={day} style={{ ...pTdStyle, textAlign: 'center', fontWeight: '700', fontSize: '14px' }}>
                      {scheduleAssignments[day] === coreIdx ? '✓' : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function PrintView({
  jobCard,
  routeRows,
  dailyTasks,
  coreDetails,
  detailTasks,
}: {
  jobCard: PrintJobCard
  routeRows: PrintRouteRow[]
  dailyTasks: PrintDailyTask[]
  coreDetails: PrintCoreRow[]
  detailTasks: PrintDetailTask[]
}) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 300)
    return () => clearTimeout(t)
  }, [])

  const isTranslated    = jobCard.is_translated ?? false
  const totalPages      = isTranslated ? 4 : 2
  const prospectName    = jobCard.prospects?.company_name ?? ''
  const buildingName    = jobCard.buildings?.building_name ?? ''
  const positionName    = jobCard.positions?.position_name ?? ''
  const scheduleAssignments = (jobCard.schedule_assignments ?? {}) as Record<string, number>
  const serviceDays     = jobCard.service_days ?? []

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { size: letter portrait; margin: 0; }
        @media print {
          html, body { margin: 0; }
          .jc-page { break-before: page; page-break-before: always; }
        }
      `}</style>

      {/* Page 1 — Route (English) */}
      <PrintPage first>
        <PrintRoutePage
          positionName={positionName}
          route={jobCard.route ?? ''}
          prospectName={prospectName}
          buildingName={buildingName}
          specialInstructions={jobCard.special_instructions ?? ''}
          revisedDate={jobCard.revised_date}
          rows={routeRows}
        />
      </PrintPage>

      {/* Page 2 — Tasks & Schedule (English) */}
      <PrintPage>
        <PrintTasksPage
          positionName={positionName}
          route={jobCard.route ?? ''}
          prospectName={prospectName}
          buildingName={buildingName}
          revisedDate={jobCard.revised_date}
          dailyTasks={dailyTasks}
          detailTasks={detailTasks}
          coreDetails={coreDetails}
          serviceDays={serviceDays}
          scheduleAssignments={scheduleAssignments}
          lang="en"
        />
      </PrintPage>

      {/* Page 3 — Route (Spanish) */}
      {isTranslated && (
        <PrintPage>
          <PrintRoutePage
            positionName={positionName}
            route={jobCard.route ?? ''}
            prospectName={prospectName}
            buildingName={buildingName}
            specialInstructions={jobCard.special_instructions_alt ?? ''}
            revisedDate={jobCard.revised_date}
            rows={routeRows}
            lang="alt"
          />
        </PrintPage>
      )}

      {/* Page 4 — Tasks & Schedule (Spanish) */}
      {isTranslated && (
        <PrintPage>
          <PrintTasksPage
            positionName={positionName}
            route={jobCard.route ?? ''}
            prospectName={prospectName}
            buildingName={buildingName}
            revisedDate={jobCard.revised_date}
            dailyTasks={dailyTasks}
            detailTasks={detailTasks}
            coreDetails={coreDetails}
            serviceDays={serviceDays}
            scheduleAssignments={scheduleAssignments}
            lang="alt"
          />
        </PrintPage>
      )}
    </>
  )
}
