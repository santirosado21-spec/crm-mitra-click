import { useState, useEffect } from 'react'

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const
const WEEKDAY_LABEL = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export interface ParsedRecurrence {
  freq:        Freq
  byDay:       string[]
  byMonthDay:  number | null
}

export function parseRRule(rule: string): ParsedRecurrence {
  const freq = (/FREQ=([A-Z]+)/.exec(rule)?.[1] as Freq) ?? 'DAILY'
  const byDay = (/BYDAY=([A-Z,]+)/.exec(rule)?.[1] ?? '').split(',').filter(Boolean)
  const byMonthDay = parseInt(/BYMONTHDAY=(\d+)/.exec(rule)?.[1] ?? '', 10) || null
  return { freq, byDay, byMonthDay }
}

export function buildRRule(p: ParsedRecurrence): string {
  const parts = [`FREQ=${p.freq}`]
  if (p.freq === 'WEEKLY' && p.byDay.length) parts.push(`BYDAY=${p.byDay.join(',')}`)
  if (p.freq === 'MONTHLY' && p.byMonthDay) parts.push(`BYMONTHDAY=${p.byMonthDay}`)
  return parts.join(';')
}

interface Props {
  value:    string
  onChange: (rule: string) => void
}

export function RecurringTaskBuilder({ value, onChange }: Props) {
  const [parsed, setParsed] = useState<ParsedRecurrence>(() => parseRRule(value || 'FREQ=DAILY'))

  useEffect(() => { setParsed(parseRRule(value || 'FREQ=DAILY')) }, [value])

  const update = (next: ParsedRecurrence) => {
    setParsed(next)
    onChange(buildRRule(next))
  }

  const toggleDay = (code: string) => {
    const has = parsed.byDay.includes(code)
    update({ ...parsed, byDay: has ? parsed.byDay.filter(d => d !== code) : [...parsed.byDay, code] })
  }

  const presets: { label: string; rule: ParsedRecurrence }[] = [
    { label: 'Diaria',     rule: { freq: 'DAILY',   byDay: [],                                    byMonthDay: null } },
    { label: 'L–V',        rule: { freq: 'WEEKLY',  byDay: ['MO','TU','WE','TH','FR'],            byMonthDay: null } },
    { label: 'Solo lunes', rule: { freq: 'WEEKLY',  byDay: ['MO'],                                byMonthDay: null } },
    { label: 'Cada día 1', rule: { freq: 'MONTHLY', byDay: [],                                    byMonthDay: 1 } },
  ]

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Frecuencia</p>
        <div className="flex flex-wrap gap-2">
          {(['DAILY','WEEKLY','MONTHLY'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => update({ ...parsed, freq: f, byDay: f === 'WEEKLY' ? parsed.byDay : [], byMonthDay: f === 'MONTHLY' ? (parsed.byMonthDay ?? 1) : null })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                parsed.freq === f ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={parsed.freq === f ? { background: 'var(--brand-navy)' } : undefined}
            >
              {f === 'DAILY' ? 'Diaria' : f === 'WEEKLY' ? 'Semanal' : 'Mensual'}
            </button>
          ))}
        </div>
      </div>

      {parsed.freq === 'WEEKLY' && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Días</p>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_CODES.map((code, i) => {
              const active = parsed.byDay.includes(code)
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleDay(code)}
                  aria-pressed={active}
                  className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${
                    active ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={active ? { background: 'var(--brand-navy)' } : undefined}
                >
                  {WEEKDAY_LABEL[i]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {parsed.freq === 'MONTHLY' && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Día del mes</p>
          <input
            type="number"
            min={1}
            max={28}
            inputMode="numeric"
            value={parsed.byMonthDay ?? 1}
            onChange={e => update({ ...parsed, byMonthDay: Math.min(28, Math.max(1, Number(e.target.value) || 1)) })}
            className="w-24 px-3 py-2 text-base border border-gray-200 rounded-lg focus:border-[#1e3a5f] focus:outline-none"
          />
        </div>
      )}

      <div className="pt-2 border-t border-gray-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Plantillas rápidas</p>
        <div className="flex flex-wrap gap-1.5">
          {presets.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => update(p.rule)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-blue-50 text-[#1e3a5f] hover:bg-blue-100 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-gray-400 font-mono">{buildRRule(parsed)}</p>
    </div>
  )
}
