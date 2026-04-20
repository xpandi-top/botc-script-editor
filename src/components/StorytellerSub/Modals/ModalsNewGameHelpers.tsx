// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'
import { getDisplayName, getIconForCharacter, characterById } from '../../../catalog'

export function TeamDot({ team }: { team: string | null | undefined }) {
  if (!team) return null
  return (
    <span
      className={`ng-team-dot ng-team-dot--${team === 'minion' || team === 'demon' ? 'evil' : team}`}
      title={team}
    />
  )
}

export function CharIcon({ cid, size = 28 }: { cid: string; size?: number }) {
  const src = cid ? getIconForCharacter(cid) : undefined
  if (!src) return <span className="ng-char-icon ng-char-icon--empty" style={{ width: size, height: size }} />
  return <img className="ng-char-icon" src={src} alt={cid} width={size} height={size} />
}

export function DistRow({ label, counts, calc }: {
  label: string
  counts: { townsfolk: number; outsider: number; minion: number; demon: number }
  calc?: typeof counts
}) {
  const match = (k: keyof typeof counts) => calc && counts[k] === calc[k]
  return (
    <div className="ng-dist-row">
      <span className="ng-dist-label">{label}</span>
      {(['townsfolk', 'outsider', 'minion', 'demon'] as const).map((k) => (
        <span key={k} className={`ng-dist-val ng-dist-val--${k === 'townsfolk' ? 'town' : k === 'outsider' ? 'out' : k === 'minion' ? 'min' : 'dem'}${calc && !match(k) ? ' ng-dist-val--mismatch' : ''}`}>
          {counts[k]}
        </span>
      ))}
    </div>
  )
}

export function CharSelect({ value, options, language, onChange, placeholder }: {
  value: string
  options: string[]
  language: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const selectedIcon = value ? getIconForCharacter(value) : null

  return (
    <div className="ng-char-select-wrap" ref={ref}>
      <button
        className={`ng-char-select-trigger${open ? ' ng-char-select-trigger--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {selectedIcon
          ? <img className="ng-char-icon" src={selectedIcon} alt={value} width={20} height={20} />
          : <span className="ng-char-icon ng-char-icon--empty" style={{ width: 20, height: 20 }} />}
        <span className="ng-char-select-trigger__name">
          {value ? getDisplayName(value, language) : (placeholder ?? '—')}
        </span>
        <span className="ng-char-select-trigger__caret">▾</span>
      </button>

      {open && (
        <div className="ng-char-select-dropdown">
          <div className="ng-char-select-option" onClick={() => { onChange(''); setOpen(false) }}>
            <span className="ng-char-icon ng-char-icon--empty" style={{ width: 20, height: 20 }} />
            <span>{placeholder ?? '—'}</span>
          </div>
          {options.map((id) => {
            const icon = getIconForCharacter(id)
            return (
              <div
                key={id}
                className={`ng-char-select-option${value === id ? ' ng-char-select-option--selected' : ''}`}
                onClick={() => { onChange(id); setOpen(false) }}
              >
                {icon
                  ? <img className="ng-char-icon" src={icon} alt={id} width={20} height={20} />
                  : <span className="ng-char-icon ng-char-icon--empty" style={{ width: 20, height: 20 }} />}
                <span>{getDisplayName(id, language)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
